"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAutomatedReportsJob = void 0;
exports.calculateNextRun = calculateNextRun;
exports.processSingleReport = processSingleReport;
// @ts-nocheck
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const report_generator_service_1 = require("../services/report-generator.service");
const email_service_1 = require("../services/email.service");
/**
 * Função para calcular a próxima data de geração baseada na frequência
 */
function calculateNextRun(frequency, from = new Date()) {
    const next = new Date(from);
    switch (frequency) {
        case 'daily':
            next.setDate(next.getDate() + 1);
            break;
        case 'weekly':
            next.setDate(next.getDate() + 7);
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + 1);
            break;
        case 'quarterly':
            next.setMonth(next.getMonth() + 3);
            break;
        default: next.setMonth(next.getMonth() + 1);
    }
    // Forçar horário para 06:00
    next.setHours(6, 0, 0, 0);
    return next;
}
/**
 * Processa um único relatório (Gera arquivo, envia e-mail e salva histórico)
 */
async function processSingleReport(reportId) {
    const now = new Date();
    const report = await prisma_1.default.automatedReport.findUnique({ where: { id: reportId } });
    if (!report)
        throw new Error('Relatório não encontrado');
    console.log(`[AutomatedReportsJob] Iniciando processamento de: ${report.name}`);
    // Define o período
    const start = report.lastGenerated ? new Date(report.lastGenerated) : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const end = now;
    // 1. Busca os dados
    const data = await report_generator_service_1.ReportGeneratorService.fetchReportData(report.type, start, end, report.filters);
    // 2. Gera o buffer do arquivo
    let buffer;
    let filename;
    let contentType;
    const format = report.format?.toLowerCase() || 'pdf';
    if (format === 'excel') {
        buffer = await report_generator_service_1.ReportGeneratorService.generateExcel(data);
        filename = `${report.name.replace(/\s+/g, '_')}_${now.getTime()}.xlsx`;
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    else {
        buffer = await report_generator_service_1.ReportGeneratorService.generatePDF(data);
        filename = `${report.name.replace(/\s+/g, '_')}_${now.getTime()}.pdf`;
        contentType = 'application/pdf';
    }
    // 3. Envia o e-mail
    if (report.recipients && report.recipients.length > 0) {
        await email_service_1.sendEmail({
            to: report.recipients.join(','),
            subject: `📊 Relatório: ${report.name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background: #1e3a8a; padding: 20px; text-align: center; color: white;">
                  <h1 style="margin: 0;">Docton Saúde</h1>
                  <p style="margin: 0; opacity: 0.8;">Relatórios Automatizados</p>
                </div>
                <div style="padding: 30px;">
                  <h2>Seu relatório está pronto!</h2>
                  <p>O relatório <strong>${report.name}</strong> foi gerado com sucesso.</p>
                  <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Tipo:</strong> ${report.type}</p>
                    <p><strong>Período:</strong> ${start.toLocaleDateString()} - ${end.toLocaleDateString()}</p>
                  </div>
                  <p>O arquivo segue em anexo.</p>
                </div>
                <div style="background: #f1f5f9; padding: 15px; text-align: center; color: #64748b; font-size: 12px;">
                  &copy; 2026 Docton Saúde. Este é um envio automático.
                </div>
              </div>
            `,
            attachments: [{ filename, content: buffer, contentType }]
        });
    }
    // 4. Salva no histórico de relatórios
    await prisma_1.default.report.create({
        data: {
            name: `${report.name} (Auto)`,
            type: report.type,
            format: format.toUpperCase(),
            status: 'Concluído',
            createdAt: now,
            createdBy: 'Sistema (Automation)',
            period: `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`,
            size: `${(buffer.length / 1024 / 1024).toFixed(2)} MB`,
            downloads: 1
        }
    });
    // 5. Atualiza o agendamento
    const nextRun = calculateNextRun(report.frequency, now);
    return await prisma_1.default.automatedReport.update({
        where: { id: report.id },
        data: {
            lastGenerated: now,
            nextGeneration: nextRun
        }
    });
}
/**
 * Job principal
 */
const startAutomatedReportsJob = () => {
    // Roda a cada 30 minutos
    node_cron_1.default.schedule('*/30 * * * *', async () => {
        console.log('[AutomatedReportsJob] Verificando agendamentos...');
        try {
            const now = new Date();
            const reportsToRun = await prisma_1.default.automatedReport.findMany({
                where: {
                    isActive: true,
                    OR: [
                        { nextGeneration: null },
                        { nextGeneration: { lte: now } }
                    ]
                }
            });
            for (const report of reportsToRun) {
                try {
                    await processSingleReport(report.id);
                    console.log(`[AutomatedReportsJob] Sucesso: ${report.name}`);
                }
                catch (err) {
                    console.error(`[AutomatedReportsJob] Falha no relatório ${report.id}:`, err);
                }
            }
        }
        catch (err) {
            console.error('[AutomatedReportsJob] Erro crítico:', err);
        }
    });
};
exports.startAutomatedReportsJob = startAutomatedReportsJob;
//# sourceMappingURL=automated-reports.job.js.map