"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function check() {
    const patients = await prisma.patient.findMany({
        include: { user: true }
    });
    console.log(JSON.stringify(patients, null, 2));
}
check();
//# sourceMappingURL=check_patients.js.map