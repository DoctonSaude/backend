"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🔍 Verificando dados de Gamificação no Banco...');
    const challengesCount = await prisma.challenge.count();
    const badgesCount = await prisma.badge.count();
    const rewardsCount = await prisma.reward.count();
    console.log(`📊 Desafios cadastrados: ${challengesCount}`);
    console.log(`📊 Badges cadastradas: ${badgesCount}`);
    console.log(`📊 Recompensas cadastradas: ${rewardsCount}`);
    if (challengesCount > 0) {
        const challenges = await prisma.challenge.findMany({ take: 5 });
        console.log('📝 Alguns desafios:', challenges.map(c => c.title));
    }
    else {
        console.log('⚠️ Nenhum desafio encontrado. Deseja cadastrar alguns iniciais?');
    }
}
main();
//# sourceMappingURL=check-gamification-db.js.map