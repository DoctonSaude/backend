import PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';
import path from 'path';
import prisma from '../lib/prisma.js';

export class PatientReportService {
    private static LOGO_PATH = path.resolve(process.cwd(), '..', 'frontend', 'public', 'logo.png');

    static async generateMedicalRecordPDF(patientId: string): Promise<Buffer> {
        const patient = await prisma.patient.findUnique({
            where: { id: patientId },
            include: {
                user: true,
                anamneses: { orderBy: { date: 'desc' } },
                medicalHistories: { orderBy: { date: 'desc' } },
                healthExams: { orderBy: { date: 'desc' } },
                prescriptions: { orderBy: { date: 'desc' } }
            }
        });

        if (!patient) throw new Error('Paciente não encontrado');

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks: Uint8Array[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // --- Header ---
            try {
                doc.image(this.LOGO_PATH, 50, 45, { width: 100 });
            } catch (e) {
                doc.fontSize(20).fillColor('#2563EB').text('DOCTON SAÚDE', 50, 45);
            }

            doc.fontSize(10).fillColor('#64748b').text('PRONTUÁRIO MÉDICO DIGITAL', 400, 50, { align: 'right' });
            doc.text(`ID: ${patient.id.slice(0, 8)}`, 400, 65, { align: 'right' });
            doc.moveDown(2);

            // Line
            doc.moveTo(50, 100).lineTo(545, 100).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
            doc.moveDown(2);

            // Title
            doc.fontSize(22).font('Helvetica-Bold').fillColor('#1e293b').text(`Prontuário de ${patient.user.name}`, { align: 'left' });
            doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
            doc.moveDown(2);

            // --- Dados Pessoais ---
            this.sectionHeader(doc, 'Dados Pessoais');
            doc.fontSize(10).font('Helvetica').fillColor('#334155');
            doc.text(`CPF: ${patient.cpf}`, 50);
            doc.text(`Data de Nascimento: ${patient.birthDate.toLocaleDateString('pt-BR')}`);
            doc.text(`Tipo Sanguíneo: ${patient.bloodType || 'Não informado'}`);
            const allergiesArr = Array.isArray((patient as any).allergies) ? (patient as any).allergies : [];
            doc.text(`Alergias: ${allergiesArr.length > 0 ? allergiesArr.join(', ') : 'Nenhuma'}`);
            doc.text(`Doenças Crônicas: ${patient.chronicDiseases.length > 0 ? patient.chronicDiseases.join(', ') : 'Nenhuma'}`);
            doc.moveDown(1.5);

            // --- Última Anamnese ---
            if (patient.anamneses.length > 0) {
                const ana = patient.anamneses[0];
                this.sectionHeader(doc, 'Última Anamnese');
                doc.fontSize(10).font('Helvetica-Bold').text(`Data: ${ana.date.toLocaleDateString('pt-BR')}`);
                doc.font('Helvetica').text(`Queixa Principal: ${ana.chiefComplaint}`);
                doc.text(`Avaliação: ${ana.assessment}`);
                doc.text(`Plano: ${ana.plan}`);
                doc.moveDown(1.5);
            }

            // --- Histórico Médico Recente ---
            if (patient.medicalHistories.length > 0) {
                this.sectionHeader(doc, 'Histórico Médico Recente');
                patient.medicalHistories.slice(0, 5).forEach((h, i) => {
                    doc.fontSize(10).font('Helvetica-Bold').text(`${h.date.toLocaleDateString('pt-BR')} - ${h.type} (${h.specialty})`);
                    doc.font('Helvetica').fontSize(9).text(`Diagnóstico: ${h.diagnosis || 'N/A'}`);
                    doc.text(`Tratamento: ${h.treatment || 'N/A'}`);
                    doc.moveDown(0.5);
                });
                doc.moveDown(1);
            }

            // --- Exames Recentes ---
            if (patient.healthExams.length > 0) {
                this.sectionHeader(doc, 'Exames Recentes');
                patient.healthExams.slice(0, 5).forEach((e) => {
                    doc.fontSize(10).font('Helvetica-Bold').text(`${e.date.toLocaleDateString('pt-BR')} - ${e.name}`);
                    doc.font('Helvetica').fontSize(9).text(`Laboratório: ${e.laboratory || 'N/A'} | Status: ${e.status}`);
                    doc.moveDown(0.5);
                });
                doc.moveDown(1);
            }

            // --- Prescrições Ativas ---
            if (patient.prescriptions.length > 0) {
                this.sectionHeader(doc, 'Prescrições Ativas');
                patient.prescriptions.slice(0, 5).forEach((p) => {
                    doc.fontSize(10).font('Helvetica-Bold').text(`${p.medication} - ${p.dosage}`);
                    doc.font('Helvetica').fontSize(9).text(`Frequência: ${p.frequency} | Duração: ${p.duration}`);
                    doc.text(`Instruções: ${p.instructions || 'N/A'}`);
                    doc.moveDown(0.5);
                });
            }

            // Footer
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                doc.fontSize(8).fillColor('#94a3b8').text(
                    `Página ${i + 1} de ${pages.count} | Documento assinado digitalmente | Docton Saúde`,
                    50,
                    780,
                    { align: 'center', width: 495 }
                );
            }

            doc.end();
        });
    }

    private static sectionHeader(doc: any, title: string) {
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#2563EB').text(title.toUpperCase());
        doc.moveTo(doc.x, doc.y).lineTo(545, doc.y).strokeColor('#2563EB').lineWidth(1).stroke();
        doc.moveDown(0.8);
    }
}
