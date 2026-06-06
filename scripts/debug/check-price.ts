
import prisma from './src/lib/prisma.js';

async function main() {
  try {
    const aq = await prisma.availabilityRequest.findFirst();
    console.log('--- DB TEST ---');
    console.log('Record found:', !!aq);
    if (aq) {
      console.log('Price field value:', (aq as any).price);
    }
    console.log('SUCCESS: DB is synchronized.');
  } catch (err) {
    console.error('--- DB TEST FAILED ---');
    console.error(err);
  } finally {
    process.exit();
  }
}

main();
