import { PrismaClient } from '@prisma/client';
import { QuotationService } from './src/services/quotation.service';

const prisma = new PrismaClient();

async function debug() {
  const quotationId = 'e3797050-1eee-4f7e-ad68-b9b00c37c31d';
  const responseId = 'f74f1f8c-374b-4a89-88f0-4f29a85a0bca';

  console.log('--- Debugging Checkout ---');
  try {
    const quotation = await prisma.quotationRequest.findUnique({
      where: { id: quotationId },
      include: { Patient: true }
    });
    console.log('Quotation exist:', !!quotation);
    if (!quotation) {
        // Tentar listar as últimas cotações para ver se os IDs mudaram
        const latest = await prisma.quotationRequest.findMany({ take: 3, orderBy: { createdAt: 'desc' } });
        console.log('Latest Quotations:', latest.map(q => q.id));
        return;
    }

    const response = await prisma.quotationResponse.findUnique({
      where: { id: responseId }
    });
    console.log('Response exist:', !!response);
    
    try {
        const result = await QuotationService.createAsaasPayment({
            quotationId,
            responseId,
            patientId: quotation.patientId,
            paymentMethod: 'PIX'
        });
        console.log('SUCCESS:', result);
    } catch (e: any) {
        console.error('ERROR MESSAGE:', e.message);
    }

  } catch (err: any) {
    console.error('DEBUG ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
