import QRCode from 'qrcode';
import axios from 'axios';

/**
 * ============================================================
 *  DOCTON SAÚDE — Payment Gateway Abstraction Layer
 * ============================================================
 *
 * Para integrar um novo gateway de pagamento:
 *   1. Crie uma nova classe que implemente `PaymentGateway`
 *   2. Implemente todos os métodos da interface
 *   3. Troque `MockPaymentGateway` por sua classe no `createGateway()`
 *   4. Configure as variáveis de ambiente necessárias no .env
 *
 * Variáveis de ambiente esperadas (configure conforme o gateway):
 *   PAYMENT_GATEWAY_PROVIDER   = 'mock' | 'stripe' | 'mercadopago' | 'pagarme' | 'assas' | 'custom'
 *   PAYMENT_GATEWAY_API_KEY    = Chave de API do gateway
 *   PAYMENT_GATEWAY_API_SECRET = Secret do gateway (se necessário)
 *   PAYMENT_GATEWAY_BASE_URL   = URL base da API do gateway
 *   PAYMENT_GATEWAY_WEBHOOK_SECRET = Secret para validar webhooks
 *   PAYMENT_GATEWAY_PUBLIC_KEY = Chave pública (para gateways que exigem)
 * ============================================================
 */

// URL base da API Asaas (padrão: sandbox para testes)
const ASSAS_BASE_URL = process.env.PAYMENT_GATEWAY_BASE_URL || 'https://api-sandbox.asaas.com/v3';

/**
 * AssasPaymentGateway
 * Implementação oficial do gateway Assas para pagamentos PIX, Cartão e Boleto.
 */
class AssasPaymentGateway implements PaymentGateway {
  readonly providerName = 'AssasGateway';
  private apiKey: string;
  private client = axios.create({
    baseURL: ASSAS_BASE_URL,
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
    },
  });

  constructor() {
    this.apiKey = process.env.PAYMENT_GATEWAY_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('[PaymentGateway:Asaas] PAYMENT_GATEWAY_API_KEY não está configurada');
    }
    // Asaas usa o cabeçalho 'access_token' diretamente (sem Bearer)
    this.client.defaults.headers['access_token'] = this.apiKey;
    console.log(`[PaymentGateway:Asaas] Inicializado com sucesso (${ASSAS_BASE_URL})`);
  }

  /**
   * Cria uma nova cobrança no Assas
   */
  async createCharge(params: CreateChargeParams): Promise<ChargeResponse> {
    console.log(`[PaymentGateway:Assas] Criando cobrança | ${params.method} | R$ ${params.amount}`);

    // Mapear método de pagamento para Assas
    const billingTypeMap: Record<PaymentMethod, 'PIX' | 'CREDIT_CARD' | 'BOLETO'> = {
      'PIX': 'PIX',
      'CREDIT_CARD': 'CREDIT_CARD',
      'BOLETO': 'BOLETO'
    };

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (params.dueDateDays || (params.method === 'PIX' ? 1 : 3)));

    // Dados da cobrança para Assas
    const assasPayload: any = {
      customer: await this.getOrCreateCustomer(params.customer),
      billingType: billingTypeMap[params.method],
      value: params.amount,
      dueDate: dueDate.toISOString().split('T')[0],
      description: params.description,
      externalReference: params.externalReference,
    };

    if (params.method === 'CREDIT_CARD') {
      // Para cartão, seria necessário tokenizar o cartão (implementação adicional)
      throw new Error('[PaymentGateway:Assas] Pagamento com cartão requer tokenização do cartão (implementar)');
    }

    try {
      const response = await this.client.post('/payments', assasPayload);
      const payment = response.data;

      // Buscar detalhes do PIX (se aplicável)
      let pixQrCode: string | undefined;
      let pixCopyPaste: string | undefined;
      let paymentUrl: string | undefined;
      let boletoLine: string | undefined;

      if (params.method === 'PIX' && payment.id) {
        try {
          const pixResponse = await this.client.get(`/payments/${payment.id}/pixQrCode`);
          pixQrCode = pixResponse.data.encodedImage;
          pixCopyPaste = pixResponse.data.payload;
        } catch (e) {
          console.log(`[PaymentGateway:Asaas] Não foi possível obter QR Code PIX para cobrança ${payment.id} (talvez a conta não esteja configurada para PIX no sandbox)`);
        }
      }

      if ((params.method as string) === 'BOLETO') {
        paymentUrl = payment.bankSlipUrl;
        boletoLine = payment.identificationField;
      }

      if ((params.method as string) === 'CREDIT_CARD') {
        paymentUrl = payment.invoiceUrl;
      }

      return {
        gatewayId: payment.id,
        status: this.mapStatus(payment.status),
        method: params.method,
        amount: payment.value,
        pixQrCode,
        pixCopyPaste,
        paymentUrl,
        boletoLine,
        expiresAt: new Date(payment.dueDate),
        externalReference: payment.externalReference,
        rawResponse: payment,
      };
    } catch (error) {
      console.error('[PaymentGateway:Assas] Erro ao criar cobrança:', error);
      throw error;
    }
  }

  /**
   * Consulta status de uma cobrança no Assas
   */
  async getChargeStatus(gatewayId: string): Promise<{ status: ChargeStatus; paidAt?: Date }> {
    try {
      const response = await this.client.get(`/payments/${gatewayId}`);
      const payment = response.data;
      return {
        status: this.mapStatus(payment.status),
        paidAt: payment.paymentDate ? new Date(payment.paymentDate) : undefined
      };
    } catch (error) {
      console.error('[PaymentGateway:Assas] Erro ao consultar status:', error);
      throw error;
    }
  }

  /**
   * Cancela/estorna uma cobrança no Assas
   */
  async cancelCharge(gatewayId: string): Promise<void> {
    try {
      await this.client.delete(`/payments/${gatewayId}`);
      console.log(`[PaymentGateway:Assas] Cobrança ${gatewayId} cancelada`);
    } catch (error) {
      console.error('[PaymentGateway:Assas] Erro ao cancelar cobrança:', error);
      throw error;
    }
  }

  /**
   * Valida webhook do Asaas
   * Asaas usa o cabeçalho `asaas-access-token` com o token configurado no painel
   */
  validateWebhook(payload: Record<string, any>, signature: string): boolean {
    // Asaas usa um token de webhook para validação
    const secret = process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('[PaymentGateway:Asaas] PAYMENT_GATEWAY_WEBHOOK_SECRET não configurado! Webhooks não serão validados.');
      return true;
    }
    return signature === secret;
  }

  /**
   * Parseia payload do webhook Asaas para formato interno
   */
  parseWebhookPayload(raw: Record<string, any>): WebhookPayload {
    // Asaas pode enviar a payment diretamente ou em payment.data
    let payment: any;
    if (raw.payment) {
      payment = raw.payment;
    } else if (raw.data) {
      payment = raw.data;
    } else {
      payment = raw;
    }

    return {
      gatewayId: payment.id,
      status: this.mapStatus(payment.status),
      externalReference: payment.externalReference,
      paidAt: payment.paymentDate ? new Date(payment.paymentDate) : undefined,
      raw
    };
  }

  // --- Métodos auxiliares ---

  /**
   * Mapeia status do Assas para nosso formato interno
   */
  private mapStatus(assasStatus: string): ChargeStatus {
    const statusMap: Record<string, ChargeStatus> = {
      'PENDING': 'PENDING',
      'RECEIVED': 'PAID',
      'CONFIRMED': 'PAID',
      'OVERDUE': 'EXPIRED',
      'REFUNDED': 'REFUNDED',
      'CANCELLED': 'CANCELLED',
      'FAILED': 'FAILED'
    };
    return statusMap[assasStatus] || 'PENDING';
  }

  /**
   * Cria ou recupera cliente no Assas
   */
  private async getOrCreateCustomer(customer: CreateChargeParams['customer']): Promise<string> {
    // Primeiro tenta buscar cliente por email
    try {
      const searchResponse = await this.client.get('/customers', {
        params: { email: customer.email }
      });
      if (searchResponse.data?.length > 0) {
        return searchResponse.data[0].id;
      }
    } catch (e) {
      // Cliente não encontrado, continua para criação
    }

    // Cria novo cliente
    const customerPayload: any = {
      name: customer.name,
      email: customer.email,
      cpfCnpj: customer.taxId,
    };
    if (customer.phone) {
      customerPayload.phone = customer.phone;
    }

    const createResponse = await this.client.post('/customers', customerPayload);
    return createResponse.data.id;
  }
}

// ─── Tipos Internos ────────────────────────────────────────────────────────────

export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO';
export type ChargeStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED' | 'FAILED';

export interface CreateChargeParams {
  /** Valor a cobrar em reais (ex: 150.00) */
  amount: number;
  /** Método de pagamento */
  method: PaymentMethod;
  /** Descrição que aparece para o cliente */
  description: string;
  /** Referência interna (ex: appointmentId, orderId) */
  externalReference: string;
  /** Dados do cliente */
  customer: {
    name: string;
    email: string;
    /** CPF ou CNPJ sem formatação */
    taxId?: string;
    phone?: string;
  };
  /** Número de parcelas (apenas cartão) */
  installments?: number;
  /** Dias até vencer (PIX = 1, Boleto = normalmente 3) */
  dueDateDays?: number;
}

export interface ChargeResponse {
  /** ID da cobrança no gateway */
  gatewayId: string;
  /** Status inicial da cobrança */
  status: ChargeStatus;
  /** Método de pagamento */
  method: PaymentMethod;
  /** Valor cobrado */
  amount: number;
  /** QR Code em base64 (PIX) */
  pixQrCode?: string;
  /** Linha digitável PIX (copia e cola) */
  pixCopyPaste?: string;
  /** URL para pagamento (cartão / boleto) */
  paymentUrl?: string;
  /** Linha digitável do boleto */
  boletoLine?: string;
  /** Data de expiração da cobrança */
  expiresAt: Date;
  /** Referência interna passada na criação */
  externalReference: string;
  /** Dados brutos retornados pelo gateway (para debugging) */
  rawResponse?: Record<string, any>;
}

export interface WebhookPayload {
  /** ID da cobrança no gateway */
  gatewayId: string;
  /** Novo status da cobrança */
  status: ChargeStatus;
  /** Referência interna original */
  externalReference?: string;
  /** Data/hora do pagamento */
  paidAt?: Date;
  /** Payload bruto do webhook (para log) */
  raw: Record<string, any>;
}

// ─── Interface do Gateway ──────────────────────────────────────────────────────

export interface PaymentGateway {
  /** Nome do provider (para logs) */
  readonly providerName: string;

  /** Cria uma nova cobrança */
  createCharge(params: CreateChargeParams): Promise<ChargeResponse>;

  /** Consulta o status atual de uma cobrança */
  getChargeStatus(gatewayId: string): Promise<{ status: ChargeStatus; paidAt?: Date }>;

  /** Cancela/estorna uma cobrança */
  cancelCharge(gatewayId: string): Promise<void>;

  /** Valida a autenticidade de um webhook recebido */
  validateWebhook(payload: Record<string, any>, signature: string): boolean;

  /** Normaliza o payload do webhook para o formato interno */
  parseWebhookPayload(raw: Record<string, any>): WebhookPayload;
}

// ─── Implementação Mock (Desenvolvimento) ─────────────────────────────────────

/**
 * MockPaymentGateway
 * Simula um gateway de pagamento para desenvolvimento e testes.
 * Substitua por um gateway real em produção.
 *
 * Comportamento:
 *   - PIX: retorna QR code fictício, expira em 30 min
 *   - Cartão: retorna link de pagamento fictício
 *   - Boleto: retorna linha digitável fictícia, expira em 3 dias
 *   - Webhooks: aceita qualquer token que comece com 'docton_'
 */
class MockPaymentGateway implements PaymentGateway {
  readonly providerName = 'MockGateway (Dev Only)';

  async createCharge(params: CreateChargeParams): Promise<ChargeResponse> {
    const gatewayId = `MOCK_${params.method}_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const expiresAt = new Date();

    console.log(`[PaymentGateway:Mock] Criando cobrança ${gatewayId} | ${params.method} | R$ ${params.amount}`);

    switch (params.method) {
      case 'PIX': {
        expiresAt.setMinutes(expiresAt.getMinutes() + 30);
        const pixCopyPaste = `00020126580014BR.GOV.BCB.PIX0136MOCK-KEY-${gatewayId}5204000053039865400${String(Math.floor(params.amount * 100)).padStart(10, '0')}5802BR5921DOCTON SAUDE LTDA6009SAO PAULO62070503***6304ABCD`;
        const pixQrCode = await QRCode.toDataURL(pixCopyPaste, {
          width: 256,
          margin: 2,
        });
        return {
          gatewayId,
          status: 'PENDING',
          method: 'PIX',
          amount: params.amount,
          pixQrCode,
          pixCopyPaste,
          expiresAt,
          externalReference: params.externalReference,
          rawResponse: { mock: true, gatewayId },
        };
      }
      case 'CREDIT_CARD': {
        expiresAt.setHours(expiresAt.getHours() + 24);
        return {
          gatewayId,
          status: 'PENDING',
          method: 'CREDIT_CARD',
          amount: params.amount,
          paymentUrl: `https://mock-payment.docton.com.br/pay/${gatewayId}`,
          expiresAt,
          externalReference: params.externalReference,
          rawResponse: { mock: true, gatewayId }
        };
      }
      case 'BOLETO': {
        expiresAt.setDate(expiresAt.getDate() + (params.dueDateDays ?? 3));
        return {
          gatewayId,
          status: 'PENDING',
          method: 'BOLETO',
          amount: params.amount,
          paymentUrl: `https://mock-payment.docton.com.br/boleto/${gatewayId}.pdf`,
          boletoLine: `23793.38128 60007.827136 00000.246906 8 99910000${Math.floor(params.amount * 100).toString().padStart(10, '0')}`,
          expiresAt,
          externalReference: params.externalReference,
          rawResponse: { mock: true, gatewayId }
        };
      }
      default:
        throw new Error(`[PaymentGateway:Mock] Método de pagamento não suportado: ${params.method}`);
    }
  }

  async getChargeStatus(gatewayId: string): Promise<{ status: ChargeStatus; paidAt?: Date }> {
    // Em desenvolvimento: sempre retorna PENDING para simular aguardando pagamento
    console.log(`[PaymentGateway:Mock] Consultando status de ${gatewayId}`);
    return { status: 'PENDING' };
  }

  async cancelCharge(gatewayId: string): Promise<void> {
    console.log(`[PaymentGateway:Mock] Cancelando cobrança ${gatewayId}`);
  }

  validateWebhook(payload: Record<string, any>, signature: string): boolean {
    // Em desenvolvimento: aceita tokens que começam com 'docton_' ou a variável de env
    const secret = process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET || 'docton_dev_secret';
    return signature === secret || signature.startsWith('docton_');
  }

  parseWebhookPayload(raw: Record<string, any>): WebhookPayload {
    return {
      gatewayId: raw.id || raw.gatewayId || '',
      status: raw.status === 'PAID' ? 'PAID' : raw.status === 'CANCELLED' ? 'CANCELLED' : 'PENDING',
      externalReference: raw.externalReference || raw.external_reference || '',
      paidAt: raw.paidAt ? new Date(raw.paidAt) : undefined,
      raw
    };
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────────

/**
 * Retorna a instância do gateway configurado.
 *
 * Para integrar um novo gateway:
 *   1. Crie a classe que implementa `PaymentGateway`
 *   2. Adicione um case aqui com o nome do provider
 *   3. Defina PAYMENT_GATEWAY_PROVIDER no .env
 *
 * Exemplos:
 *   PAYMENT_GATEWAY_PROVIDER=stripe  → retorna StripeGateway
 *   PAYMENT_GATEWAY_PROVIDER=pagarme → retorna PagarmeGateway
 *   PAYMENT_GATEWAY_PROVIDER=mock    → retorna MockPaymentGateway (padrão dev)
 */
function createGateway(): PaymentGateway {
  const provider = process.env.PAYMENT_GATEWAY_PROVIDER?.toLowerCase() || 'mock';

  switch (provider) {
    case 'assas':
      console.log(`[PaymentGateway] Provider ativo: AssasGateway`);
      return new AssasPaymentGateway();
    case 'mock':
    default:
      console.log(`[PaymentGateway] Provider ativo: MockGateway. Para produção, configure PAYMENT_GATEWAY_PROVIDER.`);
      return new MockPaymentGateway();
    // Adicione novos providers aqui:
    // case 'stripe':    return new StripeGateway();
    // case 'pagarme':   return new PagarmeGateway();
    // case 'mercadopago': return new MercadoPagoGateway();
    // case 'sua_empresa': return new SeuGateway();
  }
}

export const paymentGateway = createGateway();
