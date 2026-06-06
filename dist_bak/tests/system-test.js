"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const prisma_1 = require("../../lib/generated/prisma");
const prisma = new prisma_1.PrismaClient();
async function main() {
    console.log('🚀 Iniciando Teste de Sistema Docton Saúde...');
    const testEmailPrefix = `test_${Date.now()}`;
    const emails = {
        patient: `${testEmailPrefix}_patient@test.com`,
        pharmacy: `${testEmailPrefix}_pharmacy@test.com`,
        partner: `${testEmailPrefix}_partner@test.com`,
    };
    try {
        // 1. Criar Paciente
        console.log('👤 Criando Paciente...');
        const patientUser = await prisma.user.create({
            data: {
                email: emails.patient,
                password: 'password123',
                name: 'Paciente Teste',
                role: 'PATIENT',
                patient: {
                    create: {
                        cpf: `000.000.000-${Math.floor(Math.random() * 99)}`,
                        birthDate: new Date('1990-01-01'),
                    }
                }
            },
            include: { patient: true }
        });
        console.log('✅ Paciente criado:', patientUser.id);
        // 2. Criar Farmácia
        console.log('💊 Criando Farmácia...');
        const pharmacy = await prisma.pharmacy.create({
            data: {
                name: 'Farmácia de Teste',
                cnpj: '00.000.000/0001-00',
                city: 'São Paulo',
                isActive: true,
                isApproved: true,
            }
        });
        const pharmacyUser = await prisma.user.create({
            data: {
                email: emails.pharmacy,
                password: 'password123',
                name: 'Admin Farmácia',
                role: 'PHARMACY',
                pharmacyId: pharmacy.id
            }
        });
        console.log('✅ Farmácia e Admin criados:', pharmacy.id);
        // 3. Criar Parceiro (Médico)
        console.log('👨‍⚕️ Criando Parceiro Médico...');
        const partnerUser = await prisma.user.create({
            data: {
                email: emails.partner,
                password: 'password123',
                name: 'Dr. Teste',
                role: 'PARTNER',
                partner: {
                    create: {
                        name: 'Dr. Teste',
                        crm: '123456-SP',
                        specialty: 'Cardiologia',
                        isApproved: true,
                    }
                }
            },
            include: { partner: true }
        });
        console.log('✅ Parceiro criado:', partnerUser.id);
        // 4. Criar Cotação (Quote)
        console.log('📝 Criando Cotação de Exame...');
        const quote = await prisma.quote.create({
            data: {
                patientId: patientUser.patient?.id,
                patientName: patientUser.name,
                patientPhone: '11999999999',
                examType: 'Hemograma',
                status: 'pending',
                partnerId: partnerUser.partner?.id,
            }
        });
        console.log('✅ Cotação criada:', quote.id);
        // 5. Simular Pedido de Farmácia
        console.log('🛒 Criando Pedido de Farmácia...');
        const order = await prisma.pharmacyOrder.create({
            data: {
                patientId: patientUser.patient.id,
                pharmacyId: pharmacy.id,
                status: 'PENDING'
            }
        });
        console.log('✅ Pedido de farmácia criado:', order.id);
        // 6. Criar Transação Financeira
        console.log('💰 Registrando Transação...');
        const transaction = await prisma.transaction.create({
            data: {
                description: 'Pagamento de Consulta Teste',
                amount: 150.00,
                type: 'INCOME',
                status: 'COMPLETED',
                patientId: patientUser.patient.id,
                partnerId: partnerUser.partner.id,
                date: new Date(),
            }
        });
        console.log('✅ Transação registrada:', transaction.id);
        // 7. Validação de Consistência
        console.log('🔍 Validando Consistência de Dados...');
        const foundPatient = await prisma.patient.findUnique({ where: { id: patientUser.patient.id }, include: { quotes: true, pharmacyOrders: true } });
        if (foundPatient?.quotes.length === 1 && foundPatient?.pharmacyOrders.length === 1) {
            console.log('🌟 SUCESSO: O fluxo E2E de dados está íntegro!');
        }
        else {
            console.error('❌ ERRO: Falha na integridade das relações.');
        }
    }
    catch (error) {
        console.error('❌ CRITICAL ERROR DURANTE O TESTE:', error);
    }
    finally {
        await prisma.$disconnect();
        console.log('🏁 Teste Finalizado.');
    }
}
main();
//# sourceMappingURL=system-test.js.map