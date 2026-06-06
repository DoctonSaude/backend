
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const patients = await prisma.patient.findMany({
        include: { user: true }
    });
    console.log(JSON.stringify(patients, null, 2));
}

check();
