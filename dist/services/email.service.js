"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendStreakReminderEmail = exports.sendWeeklyWarmupEmail = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const handlebars_1 = __importDefault(require("handlebars"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
// Configuração do transporter (em produção, usar SMTP real)
const createTransporter = () => {
    // CORREÇÃO: Validar variáveis de ambiente e falhar explicitamente em produção
    const smtpHost = process.env.SMTP_HOST || 'smtp.ethereal.email';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.ETHEREAL_USER || process.env.SMTP_USER;
    const smtpPass = process.env.ETHEREAL_PASS || process.env.SMTP_PASS;
    // Em produção, exigir configuração adequada
    if (process.env.NODE_ENV === 'production') {
        if (!smtpUser || !smtpPass || smtpUser === 'test@ethereal.email') {
            throw new Error('Configuração SMTP inválida para produção. Configure SMTP_USER e SMTP_PASS.');
        }
    }
    return nodemailer_1.default.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: smtpUser && smtpPass ? {
            user: smtpUser,
            pass: smtpPass
        } : undefined,
        tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
    });
};
const compileTemplate = async (templateName, data) => {
    try {
        // Usar caminho absoluto baseado na raiz do projeto
        const templatePath = path_1.default.resolve(process.cwd(), 'src', 'templates', `${templateName}.hbs`);
        const templateSource = await fs_1.promises.readFile(templatePath, 'utf-8');
        const template = handlebars_1.default.compile(templateSource);
        return template(data);
    }
    catch (error) {
        console.error(`Erro ao compilar template ${templateName}:`, error);
        // ... (código inalterado)
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${data.title || 'Gestão Saúde'}</h2>
        <p>${data.message || 'Você tem uma nova notificação'}</p>
      </div>
    `;
    }
};
/**
 * Enviar e-mail genérico
 */
const sendEmail = async ({ to, subject, template, html, text, data = {}, attachments }) => {
    try {
        const transporter = createTransporter();
        let emailHtml = html;
        let emailText = text;
        // Se template fornecido, compilar
        if (template) {
            emailHtml = await compileTemplate(template, data);
        }
        // Se não houver HTML nem texto, usar HTML padrão
        if (!emailHtml && !emailText) {
            emailHtml = await compileTemplate('email-verification', data);
        }
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.FROM_EMAIL || `"Docton Saúde" <noreply@doctonsaude.com.br>`,
            to,
            subject,
            html: emailHtml,
            text: emailText || (emailHtml ? emailHtml.replace(/<[^>]*>/g, '') : ''),
            attachments: attachments || [],
        };
        const info = await transporter.sendMail(mailOptions);
        // Em desenvolvimento com Ethereal, mostrar preview URL
        if (process.env.NODE_ENV === 'development' && info.messageId) {
            const previewUrl = nodemailer_1.default.getTestMessageUrl(info);
            if (previewUrl) {
                console.log('📧 Email Preview URL:', previewUrl);
            }
        }
        console.log(`✅ Email enviado para ${to}:`, info.messageId);
        return info;
    }
    catch (error) {
        console.error('❌ Erro ao enviar email:', error);
        throw error;
    }
};
exports.sendEmail = sendEmail;
/**
 * Envia o e-mail semanal de aquecimento (usado pelos cron jobs)
 */
const sendWeeklyWarmupEmail = async (userData, extraData) => {
    const { name, email } = userData;
    return (0, exports.sendEmail)({
        to: email,
        subject: `Seu resumo semanal na Gestão Saúde, ${name}`,
        template: 'weekly-warmup',
        data: {
            name,
            ...extraData,
        },
    });
};
exports.sendWeeklyWarmupEmail = sendWeeklyWarmupEmail;
/**
 * Envia lembrete de streak em risco (usado pelos cron jobs)
 */
const sendStreakReminderEmail = async (userData, currentStreak) => {
    const { name, email } = userData;
    return (0, exports.sendEmail)({
        to: email,
        subject: `Não perca sua sequência de ${currentStreak} dias!`,
        template: 'weekly-warmup',
        data: {
            name,
            title: 'Sua sequência está em risco 🔥',
            message: `Você está com uma sequência de ${currentStreak} dias. Complete um desafio hoje para mantê-la!`,
        },
    });
};
exports.sendStreakReminderEmail = sendStreakReminderEmail;
exports.default = {
    sendEmail: exports.sendEmail,
    sendWeeklyWarmupEmail: exports.sendWeeklyWarmupEmail,
    sendStreakReminderEmail: exports.sendStreakReminderEmail,
};
//# sourceMappingURL=email.service.js.map