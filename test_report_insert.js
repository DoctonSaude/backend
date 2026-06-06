import prisma from './src/lib/prisma.js';

async function main() {
  try {
    const report = await prisma.report.create({
      data: {
        name: "Teste de erro",
        type: "general",
        status: "Em processamento",
        format: "PDF",
        period: "2023-01-01 - 2023-12-31",
        size: "-",
        createdBy: "system"
      }
    });
    console.log("Success:", report);
  } catch (err) {
    console.error("Prisma Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
