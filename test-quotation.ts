import { QuotationService } from './src/services/quotation.service.js';
import prisma from './src/lib/prisma.js';

async function test() {
  const id = 'fbdbdf69-7f03-4ae4-95c0-97f974d81ed4';
  try {
    console.log('Testing QuotationService.getQuotationDetails for ID:', id);
    const result = await QuotationService.getQuotationDetails(id);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('ERROR CAPTURED:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
