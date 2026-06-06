import prisma from '../lib/prisma.js';


export class RevenueService {
    /**
     * Gera insights de receita baseados na ocupação e histórico
     */
    static async getInsights(partnerId: string) {
        try {
            // 1. Calcular ocupação atual
            const appointmentsCount = await prisma.appointment.count({
                where: { 
                    partnerId,
                    dateTime: { gte: new Date() }
                }
            });

            const roomsCount = await prisma.room.count({ where: { partnerId } });
            const totalCapacity = roomsCount * 8; // Assumindo 8 slots/dia por sala
            
            const occupancyRate = totalCapacity > 0 ? (appointmentsCount / totalCapacity) * 100 : 0;

            const insights = [];

            // Insight de Ocupação Baixa
            if (occupancyRate < 30) {
                insights.push({
                    type: 'RETENTION',
                    title: 'Ocupação Atual',
                    message: `Sua ocupação está em ${occupancyRate.toFixed(1)}%. Abra mais horários na agenda para aumentar seus atendimentos.`,
                    action: 'Ver Agenda',
                    impact: 'OTIMIZAÇÃO',
                    route: '/partner/agenda'
                });
            }

            // Insight de Serviços
            const services = await prisma.partnerService.findMany({
                where: { partnerId, isActive: true },
                take: 2
            });

            if (services.length >= 2) {
                insights.push({
                    type: 'OPPORTUNITY',
                    title: 'Gestão de Serviços',
                    message: `Você tem ${services.length} serviços ativos. Mantenha seus preços atualizados para atrair mais pacientes.`,
                    action: 'Meus Serviços',
                    impact: 'Receita'
                });
            }

            return {
                occupancyRate,
                insights,
                revenuePotential: appointmentsCount * 150, // Estimativa simplificada
            };
        } catch (error) {
            console.error('[RevenueService] Erro ao gerar insights:', error);
            return {
                occupancyRate: 0,
                insights: [],
                revenuePotential: 0
            };
        }
    }

    /**
     * Calcula o preço dinâmico (Stub: HappyHourConfig removido do schema)
     */
    static async calculateDynamicPrice(partnerId: string, servicePrice: number, date: Date) {
        // Funcionalidade de Happy Hour desabilitada devido à ausência do campo happyHourConfig no banco
        return servicePrice;
    }
}
