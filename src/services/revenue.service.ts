import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class RevenueService {
    /**
     * Gera insights de receita baseados na ocupação e histórico
     */
    static async getInsights(partnerId: string) {
        // 1. Calcular ocupação atual (simulada ou baseada em appointments)
        const appointments = await prisma.appointment.count({
            where: { 
                partnerId,
                dateTime: { gte: new Date() }
            }
        });

        const rooms = await prisma.room.count({ where: { partnerId, isActive: true } });
        const totalCapacity = rooms * 8; // Assumindo 8 slots/dia por sala
        
        const occupancyRate = totalCapacity > 0 ? (appointments / totalCapacity) * 100 : 0;

        const insights = [];

        // Insight de Ocupação Baixa
        if (occupancyRate < 30) {
            insights.push({
                type: 'CRITICAL',
                title: 'Baixa Ocupação Detectada',
                message: `Sua clínica está com apenas ${occupancyRate.toFixed(1)}% de ocupação nos próximos dias. Sugerimos ativar o Happy Hour da Saúde para atrair mais pacientes.`,
                action: 'Ativar Happy Hour',
                impact: '+15% Ocupação'
            });
        }

        // Insight de Combo
        const popularServices = await prisma.partnerService.findMany({
            where: { partnerId, isActive: true },
            orderBy: { appointments: 'desc' },
            take: 2
        });

        if (popularServices.length >= 2) {
            insights.push({
                type: 'OPPORTUNITY',
                title: 'Oportunidade de Combo',
                message: `Os serviços "${popularServices[0].name}" e "${popularServices[1].name}" são seus mais procurados. Que tal criar um Combo com 10% de desconto?`,
                action: 'Criar Combo',
                impact: '+22% Ticket Médio'
            });
        }

        // Insight de Churn
        const inactivePatients = await prisma.appointment.groupBy({
            by: ['patientId'],
            where: { partnerId },
            _max: { dateTime: true },
            having: {
                dateTime: { _max: { lte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } }
            }
        });

        if (inactivePatients.length > 0) {
            insights.push({
                type: 'RETENTION',
                title: 'Risco de Churn',
                message: `${inactivePatients.length} pacientes não retornam há mais de 6 meses. Use o CRM para disparar uma campanha de reativação Bloom.`,
                action: 'Ver CRM',
                impact: 'Recuperação de Receita'
            });
        }

        return {
            occupancyRate,
            insights,
            revenuePotential: appointments * 150 * 1.2, // Estimativa simplificada
        };
    }

    /**
     * Calcula o preço com desconto de Happy Hour se aplicável
     */
    static async calculateDynamicPrice(partnerId: string, servicePrice: number, date: Date) {
        const partner = await prisma.partner.findUnique({
            where: { id: partnerId },
            select: { happyHourConfig: true }
        });

        if (!partner?.happyHourConfig) return servicePrice;

        const config = partner.happyHourConfig as any;
        const day = date.getDay(); // 0-6
        const hour = date.getHours();

        // Verificar se hoje é dia de happy hour e está no horário
        if (config.days?.includes(day) && hour >= config.startHour && hour <= config.endHour) {
            const discount = config.discountPercent || 0;
            return servicePrice * (1 - (discount / 100));
        }

        return servicePrice;
    }
}
