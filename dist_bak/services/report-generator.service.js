"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGeneratorService = void 0;
// @ts-nocheck
const pdfkit_1 = __importDefault(require("pdfkit"));
const exceljs_1 = __importDefault(require("exceljs"));
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const buffer_1 = require("buffer");
const path_1 = __importDefault(require("path"));
class ReportGeneratorService {
    static LOGO_PATH = path_1.default.resolve(process.cwd(), '..', 'frontend', 'public', 'logo.png');
    /**
     * Busca os dados reais baseados no tipo de relatório
     */
    static async fetchReportData(type, start, end, filters = {}) {
        let title = '';
        let columns = [];
        let rows = [];
        // Base where clause with date range
        const baseDateFilter = { gte: start, lte: end };
        switch (type) {
            case 'users':
                title = 'Relatório de Usuários';
                columns = ['ID', 'Nome', 'E-mail', 'Cargo', 'Departamento', 'Data de Criação'];
                const users = await prisma_js_1.default.user.findMany({
                    where: {
                        createdAt: baseDateFilter,
                        ...(filters.role && { role: filters.role }),
                        ...(filters.department && { department: filters.department }),
                        ...(filters.jobTitle && { jobTitle: filters.jobTitle })
                    },
                    orderBy: { createdAt: 'desc' }
                });
                rows = users.map(u => [u.id, u.name, u.email, u.jobTitle || '-', u.department || '-', u.createdAt.toLocaleDateString('pt-BR')]);
                break;
            case 'appointments':
                title = 'Relatório de Consultas';
                columns = ['ID', 'Paciente', 'Parceiro', 'Data/Hora', 'Status', 'Tipo'];
                const appointments = await prisma_js_1.default.appointment.findMany({
                    where: {
                        dateTime: baseDateFilter,
                        ...(filters.status && { status: filters.status }),
                        ...(filters.isOnline !== undefined && { isOnline: filters.isOnline })
                    },
                    include: { patient: { include: { user: true } }, partner: { include: { user: true } } },
                    orderBy: { dateTime: 'desc' }
                });
                rows = appointments.map(a => [
                    a.id,
                    a.patient.user.name,
                    a.partner.user.name,
                    a.dateTime.toLocaleString('pt-BR'),
                    a.status,
                    a.isOnline ? 'Online' : 'Presencial'
                ]);
                break;
            case 'financial':
                title = 'Relatório Financeiro';
                columns = ['ID', 'Descrição', 'Valor', 'Tipo', 'Categoria', 'Data'];
                const transactions = await prisma_js_1.default.transaction.findMany({
                    where: {
                        date: baseDateFilter,
                        ...(filters.transactionType && { type: filters.transactionType }),
                        ...(filters.category && { category: filters.category }),
                        ...(filters.status && { status: filters.status })
                    },
                    orderBy: { date: 'desc' }
                });
                rows = transactions.map(t => [
                    t.id,
                    t.description,
                    t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    t.type,
                    t.category || '-',
                    t.date.toLocaleDateString('pt-BR')
                ]);
                break;
            case 'performance':
            default:
                title = 'Relatório de Performance';
                columns = ['Métrica', 'Valor'];
                const [usersCount, apptsCount, transCount] = await Promise.all([
                    prisma_js_1.default.user.count({ where: { createdAt: baseDateFilter } }),
                    prisma_js_1.default.appointment.count({ where: { dateTime: baseDateFilter } }),
                    prisma_js_1.default.transaction.count({ where: { date: baseDateFilter } })
                ]);
                rows = [
                    ['Novos Usuários', usersCount],
                    ['Consultas Realizadas', apptsCount],
                    ['Transações Financeiras', transCount]
                ];
                break;
        }
        return { title, columns, rows, totalCount: rows.length };
    }
    /**
     * Gera um PDF e retorna um Buffer
     */
    static async generatePDF(data) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(buffer_1.Buffer.concat(chunks)));
            doc.on('error', reject);
            // --- Header ---
            try {
                doc.image(this.LOGO_PATH, 50, 45, { width: 120 });
            }
            catch (e) {
                console.warn('Logo not found, using text:', e);
                doc.fontSize(20).fillColor('#2563EB').text('DOCTON SAÚDE', 50, 45);
            }
            doc.fontSize(10).fillColor('#64748b').text('www.doctonsaude.com.br', 400, 50, { align: 'right' });
            doc.text('contato@doctonsaude.com.br', 400, 65, { align: 'right' });
            doc.moveDown(2);
            // Accent Line
            doc.moveTo(50, 100).lineTo(545, 100).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
            doc.moveDown(2);
            // Title
            doc.fontSize(24).font('Helvetica-Bold').fillColor('#1e293b').text(data.title, { align: 'left' });
            doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
            doc.moveDown(2);
            // --- Table ---
            const tableTop = doc.y + 10;
            let currentY = tableTop;
            // Header background
            doc.rect(50, currentY, 495, 25).fill('#f8fafc');
            doc.moveTo(50, currentY).lineTo(545, currentY).strokeColor('#e2e8f0').stroke();
            doc.moveTo(50, currentY + 25).lineTo(545, currentY + 25).strokeColor('#e2e8f0').stroke();
            // Header Text
            const colWidth = 495 / data.columns.length;
            data.columns.forEach((col, i) => {
                doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569').text(col.toUpperCase(), 55 + (i * colWidth), currentY + 8, { width: colWidth - 10, align: 'left' });
            });
            currentY += 25;
            // Records
            doc.font('Helvetica').fillColor('#1e293b');
            data.rows.forEach((row, i) => {
                const rowHeight = 25;
                // Zebra striping
                if (i % 2 === 0) {
                    doc.rect(50, currentY, 495, rowHeight).fill('#ffffff');
                }
                else {
                    doc.rect(50, currentY, 495, rowHeight).fill('#f1f5f9');
                }
                row.forEach((cell, j) => {
                    doc.fontSize(8).fillColor('#1e293b').text(String(cell), 55 + (j * colWidth), currentY + 8, { width: colWidth - 10, align: 'left' });
                });
                currentY += rowHeight;
                // Add periodic line for clarity
                doc.moveTo(50, currentY).lineTo(545, currentY).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
                if (currentY > 750) {
                    doc.addPage();
                    currentY = 50;
                }
            });
            // --- Footer ---
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                doc.fontSize(8).fillColor('#94a3b8').text(`Página ${i + 1} de ${pages.count} | Docton Saúde Inteligência de Dados`, 50, 780, { align: 'center', width: 495 });
            }
            doc.end();
        });
    }
    /**
     * Gera um Excel e retorna um Buffer
     */
    static async generateExcel(data) {
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet('Relatório');
        // Add Header Row
        worksheet.mergeCells('A1:B1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = data.title;
        titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1E293B' } };
        worksheet.mergeCells('A2:B2');
        worksheet.getCell('A2').value = `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
        worksheet.getCell('A2').font = { name: 'Arial', size: 10, color: { argb: 'FF64748B' } };
        // Set columns starting from row 4
        worksheet.getRow(4).values = data.columns;
        worksheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(4).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2563EB' }
        };
        // Add rows
        data.rows.forEach((row) => {
            worksheet.addRow(row);
        });
        // Formatting
        worksheet.columns.forEach((column, i) => {
            let maxLen = 0;
            column.eachCell?.({ includeEmpty: true }, (cell) => {
                const len = cell.value ? String(cell.value).length : 0;
                if (len > maxLen)
                    maxLen = len;
            });
            column.width = Math.min(Math.max(12, maxLen + 2), 50);
        });
        // Alternate row styling
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 4) {
                if (rowNumber % 2 === 0) {
                    row.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF8FAFC' }
                    };
                }
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };
                });
            }
        });
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer_1.Buffer.from(buffer);
    }
}
exports.ReportGeneratorService = ReportGeneratorService;
//# sourceMappingURL=report-generator.service.js.map