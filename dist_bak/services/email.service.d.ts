/**
 * Compilar template Handlebars
 */
interface TemplateData {
    [key: string]: unknown;
    title?: string;
    message?: string;
    name?: string;
    email?: string;
    link?: string;
}
/**
 * Interface para dados de envio de email
 */
interface SendEmailParams {
    to: string;
    subject: string;
    template?: string;
    html?: string;
    text?: string;
    data?: TemplateData;
    attachments?: any[];
}
/**
 * Enviar e-mail genérico
 */
export declare const sendEmail: ({ to, subject, template, html, text, data, attachments }: SendEmailParams) => Promise<import("@types/nodemailer/lib/smtp-transport").SentMessageInfo>;
/**
 * Envia o e-mail semanal de aquecimento (usado pelos cron jobs)
 */
export declare const sendWeeklyWarmupEmail: (userData: {
    name: string;
    email: string;
    healthPoints?: number;
    level?: number;
    currentStreak?: number;
}, extraData: TemplateData) => Promise<import("@types/nodemailer/lib/smtp-transport").SentMessageInfo>;
/**
 * Envia lembrete de streak em risco (usado pelos cron jobs)
 */
export declare const sendStreakReminderEmail: (userData: {
    name: string;
    email: string;
}, currentStreak: number) => Promise<import("@types/nodemailer/lib/smtp-transport").SentMessageInfo>;
declare const _default: {
    sendEmail: ({ to, subject, template, html, text, data, attachments }: SendEmailParams) => Promise<import("@types/nodemailer/lib/smtp-transport").SentMessageInfo>;
    sendWeeklyWarmupEmail: (userData: {
        name: string;
        email: string;
        healthPoints?: number;
        level?: number;
        currentStreak?: number;
    }, extraData: TemplateData) => Promise<import("@types/nodemailer/lib/smtp-transport").SentMessageInfo>;
    sendStreakReminderEmail: (userData: {
        name: string;
        email: string;
    }, currentStreak: number) => Promise<import("@types/nodemailer/lib/smtp-transport").SentMessageInfo>;
};
export default _default;
//# sourceMappingURL=email.service.d.ts.map