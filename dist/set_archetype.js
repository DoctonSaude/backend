"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./lib/prisma"));
async function setArchetype() {
    const archetype = process.argv[2] || 'PREGNANT';
    const patient = await prisma_1.default.patient.findFirst();
    if (!patient) {
        console.error('Nenhum paciente encontrado no banco.');
        return;
    }
    await prisma_1.default.patient.update({
        where: { id: patient.id },
        data: { archetype }
    });
    console.log(`✅ Sucesso! O paciente ${patient.id} agora tem o arquétipo: ${archetype}`);
    console.log('Recarregue o seu Dashboard para ver as mudanças.');
}
setArchetype()
    .catch(e => console.error(e))
    .finally(() => prisma_1.default.$disconnect());
//# sourceMappingURL=set_archetype.js.map