// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import { PartnerReportService } from '../../services/partner-report.service.js';
import { ReportGeneratorService } from '../../services/report-generator.service.js';
import { startOfMonth, endOfMonth } from 'date-fns';

const router = Router();

/**
 * @route GET /api/partners/rooms
 */
router.get('/rooms', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const rooms = await prisma.room.findMany({
      where: { partnerId: partner.id }
    });
    res.json({ data: rooms });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar salas' });
  }
});

/**
 * @route POST /api/partners/rooms
 */
router.post('/rooms', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const { name, capacity } = req.body;
    const room = await prisma.room.create({
      data: { partnerId: partner.id, name, capacity: Number(capacity) || 1 }
    });
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar sala' });
  }
});

/**
 * @route PUT /api/partners/rooms/:id
 */
router.put('/rooms/:id', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const updated = await prisma.room.update({
      where: { id: req.params.id, partnerId: partner.id },
      data: req.body
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar sala' });
  }
});

/**
 * @route DELETE /api/partners/rooms/:id
 */
router.delete('/rooms/:id', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    await prisma.room.delete({ where: { id: req.params.id, partnerId: partner.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir sala' });
  }
});

/**
 * @route GET /api/partners/equipment
 */
router.get('/equipment', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const equipment = await prisma.equipment.findMany({
      where: { partnerId: partner.id }
    });
    res.json({ data: equipment });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar equipamentos' });
  }
});

/**
 * @route POST /api/partners/equipment
 */
router.post('/equipment', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const { name, status, maintenanceThreshold } = req.body;
    const equip = await prisma.equipment.create({
      data: { partnerId: partner.id, name, status: status || 'AVAILABLE', maintenanceThreshold: Number(maintenanceThreshold) || 100 }
    });
    res.status(201).json(equip);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar equipamento' });
  }
});

/**
 * @route PUT /api/partners/equipment/:id
 */
router.put('/equipment/:id', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const updated = await prisma.equipment.update({
      where: { id: req.params.id, partnerId: partner.id },
      data: req.body
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar equipamento' });
  }
});

/**
 * @route DELETE /api/partners/equipment/:id
 */
router.delete('/equipment/:id', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    await prisma.equipment.delete({ where: { id: req.params.id, partnerId: partner.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir equipamento' });
  }
});

/**
 * @route GET /api/partners/clinic-materials
 */
router.get('/clinic-materials', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const materials = await prisma.clinicMaterial?.findMany({
      where: { partnerId: partner.id }
    }) || [];
    res.json({ data: materials });
  } catch (error) {
    res.json({ data: [] });
  }
});

/**
 * @route POST /api/partners/clinic-materials
 */
router.post('/clinic-materials', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const { name, stock, minStock, unit } = req.body;
    const material = await prisma.clinicMaterial?.create({
      data: { partnerId: partner.id, name, stock: Number(stock) || 0, minStock: Number(minStock) || 10, unit: unit || 'un' }
    });
    res.status(201).json(material);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cadastrar material' });
  }
});

/**
 * @route PUT /api/partners/clinic-materials/:id
 */
router.put('/clinic-materials/:id', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const updated = await prisma.clinicMaterial?.update({
      where: { id: req.params.id, partnerId: partner.id },
      data: req.body
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar material' });
  }
});

/**
 * @route DELETE /api/partners/clinic-materials/:id
 */
router.delete('/clinic-materials/:id', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    await prisma.clinicMaterial?.delete({ where: { id: req.params.id, partnerId: partner.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir material' });
  }
});

/**
 * @route GET /api/partners/patients
 */
router.get('/patients', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const appointments = await prisma.appointment.findMany({
      where: { partnerId: partner.id },
      include: {
        Patient: {
          include: {
            User: { select: { name: true, email: true, phone: true, avatar: true } }
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    const patientMap = new Map();
    appointments.forEach(app => {
      const pData = app.Patient;
      if (!pData) return;
      if (!patientMap.has(app.patientId)) {
        patientMap.set(app.patientId, {
          id: pData.id,
          name: pData.User.name,
          email: pData.User.email,
          phone: pData.User.phone,
          avatar: pData.User.avatar,
          lastAppointment: app.dateTime,
          totalAppointments: 1
        });
      } else {
        const p = patientMap.get(app.patientId);
        p.totalAppointments++;
      }
    });

    res.json(Array.from(patientMap.values()));
  } catch (error) {
    console.error('Erro /patients:', error);
    res.status(500).json({ error: 'Erro ao buscar pacientes', details: error.message });
  }
});

/**
 * @route GET /api/partners/patients/search
 */
router.get('/patients/search', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const term = String(q).toLowerCase();

    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { User: { name: { contains: term, mode: 'insensitive' } } },
          { User: { email: { contains: term, mode: 'insensitive' } } },
          { cpf: { contains: term } }
        ]
      },
      include: {
        User: {
          select: {
            name: true,
            email: true,
            avatar: true
          }
        }
      },
      take: 10
    });

    res.json(patients.map(p => ({
      id: p.id,
      name: p.User.name,
      email: p.User.email,
      avatar: p.User.avatar
    })));
  } catch (error: any) {
    console.error('Erro /patients/search:', error);
    res.status(500).json({ error: 'Erro ao buscar pacientes', details: error.message });
  }
});

/**
 * @route GET /api/partners/validation-codes/stats
 */
router.get('/validation-codes/stats', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const [total, today] = await Promise.all([
      prisma.validationCodeLog.count({ where: { partnerId: partner.id } }),
      prisma.validationCodeLog.count({ 
        where: { 
          partnerId: partner.id,
          timestamp: { gte: new Date(new Date().setHours(0,0,0,0)) }
        } 
      })
    ]);

    res.json({ total, today });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas de validação' });
  }
});

/**
 * @route GET /api/partners/validation-codes/logs
 */
router.get('/validation-codes/logs', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const { page = 1, pageSize = 10, query, status } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);

    const where: any = { partnerId: partner.id };
    if (status) where.status = status;
    if (query) {
      where.OR = [
        { code: { contains: String(query), mode: 'insensitive' } },
        { patientName: { contains: String(query), mode: 'insensitive' } }
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.validationCodeLog.count({ where }),
      prisma.validationCodeLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: Number(pageSize),
        include: {
          Patient: { include: { User: { select: { name: true, avatar: true } } } }
        }
      })
    ]);

    res.json({
      data: logs.map(l => ({
        ...l,
        patientName: l.Patient?.User?.name || l.patientName || 'Paciente',
        patientAvatar: l.Patient?.User?.avatar
      })),
      total,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar logs de validação' });
  }
});


/**
 * @route POST /api/partners/reports/quick
 * Gera um relatório rápido de desempenho e persiste no Supabase.
 */
router.post('/reports/quick', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({
      where: { userId },
      select: { id: true }
    });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    // Coletar dados para o relatório
    const [totalAppts, completedAppts, revenue] = await Promise.all([
      prisma.appointment.count({ where: { partnerId: partner.id, createdAt: { gte: startOfMonth } } }),
      prisma.appointment.count({ where: { partnerId: partner.id, status: 'COMPLETED', createdAt: { gte: startOfMonth } } }),
      prisma.transaction.aggregate({
        where: { partnerId: partner.id, type: 'CREDIT', status: 'COMPLETED', createdAt: { gte: startOfMonth } },
        _sum: { amount: true }
      })
    ]);

    const reportName = `Relatório Rápido — ${monthName}`;
    const report = await prisma.report.create({
      data: {
        name: reportName,
        type: 'QUICK_REPORT',
        format: 'JSON',
        status: 'COMPLETED',
        createdBy: userId,
        period: `${startOfMonth.toISOString().split('T')[0]} a ${now.toISOString().split('T')[0]}`,
        size: '< 1 MB',
        partnerId: partner.id
      }
    });

    return res.status(201).json({
      ...report,
      summary: {
        totalAppointments: totalAppts,
        completedAppointments: completedAppts,
        monthlyRevenue: revenue._sum.amount || 0
      }
    });
  } catch (error: any) {
    console.error('Erro ao gerar relatório rápido:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório', details: error.message });
  }
});

/**
 * @route GET /api/partners/reports/stats
 * Retorna as estatísticas agregadas para o dashboard de relatórios.
 */
router.get('/reports/stats', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const stats = await PartnerReportService.getDashboardStats(partner.id, startDate as string, endDate as string);
    return res.json(stats);
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas de relatório:', error);
    return res.status(500).json({ error: 'Erro ao buscar estatísticas', details: error.message });
  }
});

/**
 * @route GET /api/partners/reports/history
 * Lista o histórico de relatórios gerados.
 */
router.get('/reports/history', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const reports = await prisma.report.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return res.json({ reports, total: reports.length });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao buscar histórico de relatórios' });
  }
});

/**
 * @route GET /api/partners/reports/:reportType/export
 * Gera e exporta um relatório em PDF ou Excel.
 */
router.get('/reports/:reportType/export', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const { reportType } = req.params;
    const { format = 'pdf', startDate, endDate } = req.query;
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const start = startDate ? new Date(startDate as string) : startOfMonth(new Date());
    const end = endDate ? new Date(endDate as string) : endOfMonth(new Date());

    const reportData = await ReportGeneratorService.fetchReportData(reportType, start, end, { partnerId: partner.id });
    
    let buffer;
    let contentType;
    let fileName = `relatorio_${reportType}_${format === 'pdf' ? 'pdf' : 'xlsx'}`;

    if (format === 'pdf') {
        buffer = await ReportGeneratorService.generatePDF(reportData);
        contentType = 'application/pdf';
        fileName += '.pdf';
    } else {
        buffer = await ReportGeneratorService.generateExcel(reportData);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileName += '.xlsx';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    return res.send(buffer);
  } catch (error: any) {
    console.error('Erro ao exportar relatório:', error);
    return res.status(500).json({ error: 'Erro ao exportar relatório' });
  }
});

/**
 * @route PUT /api/partners/revenue/happy-hour
 */
router.put('/revenue/happy-hour', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { happyHourConfig } = req.body;
    
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const updated = await prisma.partner.update({
      where: { id: partner.id },
      data: {
        settings: {
          ...(partner.settings as any || {}),
          happyHourConfig
        }
      }
    });

    return res.json(updated);
  } catch (error) {
    console.error('Erro ao salvar Happy Hour:', error);
    res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
});

export default router;

