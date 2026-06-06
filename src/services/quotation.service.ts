import prisma from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { asaasService } from './asaas.service';

export class QuotationService {
  static async createRequest(data: {
    patientId: string;
    type: string;
    urgency: string;
    genericPreference: string;
    deliveryType: string;
    medicamentName?: string;
    description?: string;
    imageUrl?: string;
    lat?: number;
    lng?: number;
    quantity?: number;
    items?: Array<{ name: string; dosage?: string; form?: string; quantity: number }>;
  }) {
    // Se tiver medicamentName mas não tiver itens, criamos um item padrão
    const finalItems = (data.items && data.items.length > 0) 
      ? data.items 
      : (data.medicamentName ? [{ name: data.medicamentName, quantity: data.quantity || 1 }] : []);

    return prisma.quotationRequest.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        patient: { connect: { id: data.patientId } },
        type: data.type || 'MANUAL',
        urgency: data.urgency || 'NORMAL',
        genericPreference: data.genericPreference || 'ACCEPT',
        deliveryType: data.deliveryType || 'DELIVERY',
        description: data.description,
        imageUrl: data.imageUrl,
        medicamentName: data.medicamentName,
        quantity: data.quantity,
        lat: data.lat,
        lng: data.lng,
        QuotationRequestItem: {
          create: finalItems.map(item => ({
            id: uuidv4(),
            name: item.name,
            dosage: item.dosage,
            form: item.form,
            quantity: item.quantity
          }))
        }
      },
      include: {
        QuotationRequestItem: true
      }
    });
  }

  static async getPatientQuotations(patientId: string) {
    return prisma.quotationRequest.findMany({
      where: { patientId },
      include: {
        QuotationRequestItem: true,
        responses: {
          include: {
            pharmacy: {
              select: { reasonSocial: true, performanceScore: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getWonQuotations(pharmacyId: string) {
    return prisma.quotationResponse.findMany({
      where: {
        pharmacyId,
        status: { in: ['ACCEPTED', 'SEPARATING'] },
      },
      include: {
        QuotationPayment: true,
        quotation: {
          include: {
            QuotationRequestItem: true,
            patient: {
              include: {
                User: { select: { name: true, phone: true, email: true } },
                Person: { select: { name: true, phone: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getQuotationDetails(id: string) {
    return prisma.quotationRequest.findUnique({
      where: { id },
      include: {
        QuotationRequestItem: true,
        responses: {
          include: {
            pharmacy: {
              select: { 
                id: true, 
                reasonSocial: true, 
                performanceScore: true, 
                city: true,
                deliveryFee: true,
                deliveryTimeAvg: true
              }
            }
          }
        }
      }
    });
  }

  // ─── LADO DA FARMÁCIA ─────────────────────────────────────────────────────

  static async getOpenQuotations(pharmacyId: string) {
    // Busca cotações abertas que a farmácia ainda não respondeu
    return prisma.quotationRequest.findMany({
      where: {
        status: 'OPEN',
        responses: {
          none: { pharmacyId }
        }
      },
      include: {
        QuotationRequestItem: true,
        patient: {
          include: {
            Person: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  static async respondToQuotation(data: {
    quotationId: string;
    pharmacyId: string;
    price: number;
    deliveryTimeMin?: number;
    observations?: string;
    isAvailable?: boolean;
    items?: Array<{ name: string; price: number; isGeneric?: boolean }>;
  }) {
    const existing = await prisma.quotationResponse.findFirst({
      where: { quotationId: data.quotationId, pharmacyId: data.pharmacyId }
    });
    if (existing) throw new Error('Sua farmácia já respondeu esta cotação.');

    const quotation = await prisma.quotationRequest.findUnique({
      where: { id: data.quotationId },
      select: { createdAt: true },
    });
    if (!quotation) throw new Error('Solicitação não encontrada.');

    const responseTimeSec = Math.floor(
      (Date.now() - quotation.createdAt.getTime()) / 1000
    );

    const response = await prisma.quotationResponse.create({
      data: {
        id: uuidv4(),
        quotationId: data.quotationId,
        pharmacyId: data.pharmacyId,
        price: data.price,
        deliveryTimeMin: data.deliveryTimeMin,
        observations: data.observations,
        isAvailable: data.isAvailable ?? true,
        responseTimeSec,
        status: 'PENDING',
        QuotationResponseItem: data.items?.length ? {
          create: data.items.map(item => ({
            id: uuidv4(),
            name: item.name,
            price: item.price,
            isGeneric: item.isGeneric ?? false
          }))
        } : undefined
      },
      include: {
        pharmacy: { select: { reasonSocial: true } },
        QuotationResponseItem: true
      }
    });

    await prisma.quotationRequest.update({
      where: { id: data.quotationId },
      data: { status: 'RESPONDED', updatedAt: new Date() },
    });

    return response;
  }

  /** Fecha cotação quando o paciente paga itens do tipo pharmacy_quote no checkout. */
  static async finalizeQuotationsFromCart(
    cartItems: Array<{ type?: string; quoteId?: string; responseId?: string }>,
    options?: { paymentSettled?: boolean }
  ) {
    const settled = options?.paymentSettled !== false;
    const quoteItems = (cartItems || []).filter(
      (i) => i.type === 'pharmacy_quote' && i.quoteId && i.responseId
    );
    if (!quoteItems.length) return;

    for (const item of quoteItems) {
      if (settled) {
        await prisma.quotationResponse.update({
          where: { id: item.responseId! },
          data: { status: 'ACCEPTED' },
        });
        await prisma.quotationRequest.update({
          where: { id: item.quoteId! },
          data: { status: 'CLOSED', updatedAt: new Date() },
        });
      } else {
        await prisma.quotationRequest.updateMany({
          where: { id: item.quoteId!, status: 'OPEN' },
          data: { status: 'RESPONDED', updatedAt: new Date() },
        });
      }
    }
  }

  static async getPharmacyResponses(pharmacyId: string) {
    return prisma.quotationResponse.findMany({
      where: { pharmacyId },
      include: {
        quotation: {
          include: { QuotationRequestItem: true }
        },
        QuotationResponseItem: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  // ─── PAGAMENTOS ─────────────────────────────────────────────────────────────

  static async createAsaasPayment(params: {
    quotationId: string;
    responseId: string;
    patientId: string;
    paymentMethod?: 'PIX' | 'CREDIT_CARD';
  }) {
    const paymentMethod = params.paymentMethod || 'PIX';

    // 1. Validar cotação e proposta
    const quotation = await prisma.quotationRequest.findUnique({
      where: { id: params.quotationId },
      include: {
        patient: {
          include: {
            Person: true,
            User: { select: { name: true, email: true } }
          }
        }
      }
    });

    if (!quotation) throw new Error('Cotação não encontrada');
    if (quotation.patientId !== params.patientId) throw new Error('Cotação não pertence a este paciente');

    const response = await prisma.quotationResponse.findUnique({
      where: { id: params.responseId },
      include: { pharmacy: true }
    });

    if (!response) throw new Error('Proposta não encontrada');
    if (response.quotationId !== params.quotationId) throw new Error('Proposta não vinculada a esta cotação');

    // 2. Criar/Obter cliente no Asaas
    const patient = quotation.patient;
    const person = patient?.Person;
    const cpf = patient?.cpf || (person as any)?.cpf;

    if (!cpf) {
        throw new Error('Paciente sem CPF configurado para pagamento. Por favor, complete seu perfil.');
    }

    const cpfClean = cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      throw new Error('CPF inválido. Verifique seu cadastro e informe os 11 dígitos corretamente.');
    }

    const asaasCustomer = await asaasService.getOrCreateCustomer({
      name: person?.name || (quotation.patient as any).User?.name || 'Paciente',
      cpfCnpj: cpfClean,
      email: (quotation.patient as any).User?.email || '',
      mobilePhone: (person?.phone || '').replace(/\D/g, '')
    });

    // 3. Criar cobrança
    const totalAmount = response.price + (response.pharmacy?.deliveryFee || 0);
    const description = `Medicamentos: Ref #${quotation.id.slice(-8).toUpperCase()}`;
    const externalReference = `quotation_${quotation.id}`;

    console.log('[Checkout Debug] Total Amount:', totalAmount);
    console.log('[Checkout Debug] Customer ID:', asaasCustomer.id);
    console.log('[Checkout Debug] Method:', paymentMethod);

    let asaasCharge;
    let pixQrCode = null;
    let pixCopyPaste = null;
    let paymentUrl = null;

    try {
      if (paymentMethod === 'PIX') {
        asaasCharge = await asaasService.createPixCharge({
          customerId: asaasCustomer.id,
          value: totalAmount,
          description,
          externalReference
        });
        const qrCode = await asaasService.getPixQrCode(asaasCharge.id);
        pixQrCode = qrCode.encodedImage;
        pixCopyPaste = qrCode.payload;
      } else {
        asaasCharge = await asaasService.createCardCharge({
          customerId: asaasCustomer.id,
          value: totalAmount,
          description,
          externalReference,
          installmentCount: 1 
        });
        paymentUrl = asaasCharge.invoiceUrl;
      }
    } catch (error: any) {
      console.error('[Asaas Checkout Error Details]', error.message);
      throw error;
    }

    // 4. Salvar QuotationPayment
    const payment = await prisma.quotationPayment.upsert({
      where: { quotationId: quotation.id },
      update: {
        responseId: response.id,
        amount: totalAmount,
        asaasId: asaasCharge.id,
        paymentMethod,
        pixQrCode,
        pixCopyPaste,
        paymentUrl,
        status: 'PENDING'
      },
      create: {
        id: uuidv4(),
        updatedAt: new Date(),
        QuotationRequest: { connect: { id: quotation.id } },
        QuotationResponse: { connect: { id: response.id } },
        patientId: params.patientId,
        amount: totalAmount,
        asaasId: asaasCharge.id,
        paymentMethod,
        pixQrCode,
        pixCopyPaste,
        paymentUrl,
        status: 'PENDING'
      }
    });

    return payment;
  }

  static async getPaymentStatus(quotationId: string) {
    const payment = await prisma.quotationPayment.findUnique({
      where: { quotationId }
    });

    if (!payment) return null;

    if (payment.status === 'PENDING' && payment.asaasId) {
      const asaasStatus = await asaasService.getChargeStatus(payment.asaasId);
      
      // Asaas PAID statuses: RECEIVED, CONFIRMED, RECEIVED_IN_CASH
      if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(asaasStatus.status)) {
        // Atualizar para Pago em transação
        await prisma.$transaction([
          prisma.quotationPayment.update({
            where: { id: payment.id },
            data: { status: 'PAID' }
          }),
          prisma.quotationRequest.update({
            where: { id: quotationId },
            data: { status: 'ACCEPTED' } // Status final da cotação
          }),
          prisma.quotationResponse.update({
             where: { id: payment.responseId! },
             data: { status: 'ACCEPTED' }
          })
        ]);
        return { ...payment, status: 'PAID' };
      }
    }

    return payment;
  }
}

