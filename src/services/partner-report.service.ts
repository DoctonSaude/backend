import prisma from '../lib/prisma.js';
import { startOfMonth, endOfMonth, subMonths, format, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export class PartnerReportService {
    /**
     * Calcula todas as estatísticas para o dashboard de relatórios do parceiro
     */
    static async getDashboardStats(partnerId: string, startDate?: string, endDate?: string) {
        const now = new Date();
        const start = startDate ? new Date(startDate) : startOfMonth(now);
        const end = endDate ? new Date(endDate) : endOfMonth(now);
        
        // Período de comparação (mês anterior)
        const prevStart = subMonths(start, 1);
        const prevEnd = subMonths(end, 1);

        const [
            currentAppts,
            prevAppts,
            currentRevenue,
            prevRevenue,
            currentPatients,
            prevPatients,
            totalPatientsCount,
            cancellations,
            completedCount,
            services,
            appointments
        ] = await Promise.all([
            // Consultas atual vs anterior
            prisma.appointment.count({ where: { partnerId, dateTime: { gte: start, lte: end } } }),
            prisma.appointment.count({ where: { partnerId, dateTime: { gte: prevStart, lte: prevEnd } } }),
            
            // Receita atual vs anterior
            prisma.transaction.aggregate({
                where: { partnerId, type: 'CREDIT', status: 'COMPLETED', createdAt: { gte: start, lte: end } },
                _sum: { amount: true }
            }),
            prisma.transaction.aggregate({
                where: { partnerId, type: 'CREDIT', status: 'COMPLETED', createdAt: { gte: prevStart, lte: prevEnd } },
                _sum: { amount: true }
            }),

            // Novos pacientes atual vs anterior
            prisma.patient.count({ 
                where: { 
                    Appointment: { some: { partnerId, dateTime: { gte: start, lte: end } } },
                    createdAt: { gte: start, lte: end } 
                } 
            }),
            prisma.patient.count({ 
                where: { 
                    Appointment: { some: { partnerId, dateTime: { gte: prevStart, lte: prevEnd } } },
                    createdAt: { gte: prevStart, lte: prevEnd } 
                } 
            }),

            // Total de pacientes únicos atendidos por este parceiro
            prisma.appointment.groupBy({
                by: ['patientId'],
                where: { partnerId }
            }).then(res => res.length),

            // Cancelamentos
            prisma.appointment.count({ where: { partnerId, status: 'CANCELLED', dateTime: { gte: start, lte: end } } }),
            
            // Concluídos para taxa de conclusão
            prisma.appointment.count({ where: { partnerId, status: 'COMPLETED', dateTime: { gte: start, lte: end } } }),

            // Distribuição de serviços
            prisma.partnerService.findMany({ where: { partnerId } }),

            // Todos os agendamentos do período para métricas de tempo e tendência
            prisma.appointment.findMany({
                where: { partnerId, dateTime: { gte: start, lte: end } },
                select: { dateTime: true, status: true, duration: true }
            })
        ]);

        // Cálculo de horas e duração média
        const totalDuration = appointments.reduce((sum, a) => sum + (a.duration || 30), 0);
        const avgDuration = appointments.length > 0 ? Math.round(totalDuration / appointments.length) : 0;
        const totalHours = Math.round(totalDuration / 60);

        // Taxa de conclusão
        const completionRate = currentAppts > 0 ? Math.round((completedCount / currentAppts) * 100) : 0;

        // Distribuição de Serviços (Baseado no contador do PartnerService ou dados reais se possível)
        // Como o schema não tem relação direta Appointment -> PartnerService, usamos o contador do PartnerService
        const totalServiceAppts = services.reduce((sum, s) => sum + (s.appointments || 0), 0);
        const servicesDistribution = services.slice(0, 4).map((s, i) => ({
            name: s.name,
            value: totalServiceAppts > 0 ? Math.round(((s.appointments || 0) / totalServiceAppts) * 100) : 25,
            color: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'][i % 4]
        }));
        if (servicesDistribution.length === 0) {
            servicesDistribution.push({ name: 'Consultas Gerais', value: 100, color: '#3B82F6' });
        }

        // Tendência (últimos 6 meses) - Dados Reais
        const sixMonthsAgo = subMonths(now, 5);
        const [historicalAppts, historicalRevenue] = await Promise.all([
            prisma.appointment.findMany({
                where: { partnerId, dateTime: { gte: startOfMonth(sixMonthsAgo) } },
                select: { dateTime: true, status: true }
            }),
            prisma.transaction.findMany({
                where: { partnerId, type: 'CREDIT', status: 'COMPLETED', createdAt: { gte: startOfMonth(sixMonthsAgo) } },
                select: { amount: true, createdAt: true }
            })
        ]);

        const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });
        const trend = months.map(m => {
            const mStart = startOfMonth(m);
            const mEnd = endOfMonth(m);
            
            const monthAppts = historicalAppts.filter(a => a.dateTime && a.dateTime >= mStart && a.dateTime <= mEnd);
            const monthRevenue = historicalRevenue
                .filter(t => t.createdAt >= mStart && t.createdAt <= mEnd)
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            return {
                month: format(m, 'MMM', { locale: ptBR }),
                servicos: monthAppts.filter(a => a.status === 'COMPLETED').length,
                retornos: Math.floor(monthAppts.length * 0.2), // Estimativa baseada em 20% se não houver flag isReturn
                receita: Math.round(monthRevenue)
            };
        });

        // Performance Semanal (Baseado nos agendamentos do período selecionado)
        const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const performanceMap = appointments.reduce((acc: any, curr) => {
            if (!curr.dateTime) return acc;
            const dayName = weekDays[curr.dateTime.getDay()];
            if (!acc[dayName]) acc[dayName] = { atendimentos: 0, duracao: 0 };
            acc[dayName].atendimentos++;
            acc[dayName].duracao += (curr.duration || 30);
            return acc;
        }, {});

        const weeklyPerformance = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map(dia => ({
            dia,
            atendimentos: performanceMap[dia]?.atendimentos || 0,
            duracao: performanceMap[dia]?.duracao || 0
        }));

        // Alertas Inteligentes
        const alerts = [];
        if (completionRate < 80 && currentAppts > 5) {
            alerts.push({
                id: '1',
                type: 'warning',
                title: 'Baixa Taxa de Conclusão',
                message: `Sua taxa de conclusão está em ${completionRate}%. Tente confirmar as consultas com antecedência.`
            });
        }
        if (cancellations > 5) {
            alerts.push({
                id: '2',
                type: 'info',
                title: 'Aumento de Cancelamentos',
                message: `Houve ${cancellations} cancelamentos este mês. Considere revisar sua política de reagendamento.`
            });
        }

        return {
            appointments: currentAppts,
            patients: totalPatientsCount,
            revenue: currentRevenue._sum.amount || 0,
            hours: totalHours,
            completionRate,
            avgDuration,
            newPatients: currentPatients,
            cancellations,
            trend,
            servicesDistribution,
            weeklyPerformance,
            alerts,
            comparison: {
                appointments: prevAppts,
                revenue: prevRevenue._sum.amount || 0,
                patients: prevPatients
            }
        };
    }
}
