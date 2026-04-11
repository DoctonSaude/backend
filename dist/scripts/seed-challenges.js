"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Semeando desafios iniciais...');
    const challenges = [
        {
            title: 'Hidratação Diária',
            description: 'Beba 8 copos de água por dia durante uma semana',
            type: 'water',
            points: 150,
            category: 'SAUDE',
            difficulty: 'EASY',
            targetValue: 8,
            frequency: 'DAILY',
            isActive: true
        },
        {
            title: 'Semana Ativa',
            description: 'Pratique 30 minutos de exercícios por 5 dias',
            type: 'exercise',
            points: 300,
            category: 'FITNESS',
            difficulty: 'MEDIUM',
            targetValue: 5,
            frequency: 'WEEKLY',
            isActive: true
        },
        {
            title: 'Sono Reparador',
            description: 'Durma pelo menos 7 horas por noite durante 3 dias',
            type: 'sleep',
            points: 200,
            category: 'SAUDE',
            difficulty: 'EASY',
            targetValue: 3,
            frequency: 'DAILY',
            isActive: true
        }
    ];
    for (const challenge of challenges) {
        const existing = await prisma.challenge.findFirst({
            where: { title: challenge.title }
        });
        if (!existing) {
            await prisma.challenge.create({ data: challenge });
            console.log(`✅ Criado: ${challenge.title}`);
        }
        else {
            console.log(`ℹ️ Já existe: ${challenge.title}`);
        }
    }
    console.log('✨ Seed finalizado!');
}
main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
//# sourceMappingURL=seed-challenges.js.map