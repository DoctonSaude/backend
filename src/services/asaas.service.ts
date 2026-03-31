/**
 * AsaasService
 * Integração com o gateway de pagamento Asaas (sandbox + produção)
 * Documentação: https://docs.asaas.com
 */
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';

class AsaasService {
    headers;
    constructor() {
        this.headers = {
            'Content-Type': 'application/json',
            'access_token': ASAAS_API_KEY
        };
    }
    async request(method: string, path: string, body?: any) {
        const url = `${ASAAS_BASE_URL}${path}`;
        const response = await fetch(url, {
            method,
            headers: this.headers,
            body: body ? JSON.stringify(body) : undefined
        });
        const data: any = await response.json();
        if (!response.ok) {
            const errors = (data.errors || []).map((e: any) => e.description).join(', ') || 'Erro desconhecido';
            throw new Error(`[Asaas] ${response.status}: ${errors}`);
        }
        return data;
    }
    // ─── Clientes ──────────────────────────────────────────────────────────────
    /**
     * Cria ou reutiliza um cliente no Asaas.
     * Busca pelo cpfCnpj para evitar duplicatas.
     */
    async getOrCreateCustomer(params) {
        // Tenta buscar cliente existente pelo CPF/CNPJ
        const search = await this.request('GET', `/customers?cpfCnpj=${params.cpfCnpj.replace(/\D/g, '')}`);
        if (search.data && search.data.length > 0) {
            console.log(`[Asaas] Cliente existente encontrado: ${search.data[0].id}`);
            return search.data[0];
        }
        // Cria novo cliente
        const customer = await this.request('POST', '/customers', {
            name: params.name,
            cpfCnpj: params.cpfCnpj.replace(/\D/g, ''),
            email: params.email,
            mobilePhone: params.mobilePhone
        });
        console.log(`[Asaas] Cliente criado: ${customer.id}`);
        return customer;
    }
    // ─── Cobranças ─────────────────────────────────────────────────────────────
    /**
     * Cria uma cobrança PIX no Asaas.
     * Retorna a cobrança com QR Code embutido.
     */
    async createPixCharge(params) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (params.dueDateDays ?? 1));
        const dueDateStr = dueDate.toISOString().split('T')[0];
        const charge = await this.request('POST', '/payments', {
            customer: params.customerId,
            billingType: 'PIX',
            value: params.value,
            dueDate: dueDateStr,
            description: params.description,
            externalReference: params.externalReference
        });
        return charge;
    }
    /**
     * Busca o QR Code PIX de uma cobrança existente.
     */
    async getPixQrCode(chargeId: string) {
        return this.request('GET', `/payments/${chargeId}/pixQrCode`);
    }
    /**
     * Cria uma cobrança de cartão de crédito (link de pagamento).
     */
    async createCardCharge(params) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);
        return this.request('POST', '/payments', {
            customer: params.customerId,
            billingType: 'CREDIT_CARD',
            value: params.value,
            dueDate: dueDate.toISOString().split('T')[0],
            description: params.description,
            externalReference: params.externalReference,
            installmentCount: params.installmentCount || 1
        });
    }
    /**
     * Consulta o status de uma cobrança.
     */
    async getChargeStatus(chargeId: string) {
        return this.request('GET', `/payments/${chargeId}`);
    }
    // ─── Transferências / Repasses ─────────────────────────────────────────────
    /**
     * Realiza uma transferência (repasse) via PIX ou TED para um parceiro.
     * Usado após confirmação de pagamento do paciente.
     */
    async createTransfer(params) {
        let body: any = {
            value: params.value,
            description: params.description,
            scheduleDate: params.scheduleDate
        };
        if (params.pixKey) {
            // Repasse via PIX
            body.pixAddressKey = params.pixKey;
            body.pixAddressKeyType = params.pixKeyType || 'EVP';
        }
        else if (params.bankCode && params.account) {
            // Repasse via TED
            body.bankAccount = {
                bank: { code: params.bankCode },
                accountName: params.ownerName || '',
                ownerName: params.ownerName || '',
                cpfCnpj: (params.cpfCnpj || '').replace(/\D/g, ''),
                agency: params.agency || '',
                account: params.account || '',
                accountDigit: params.accountDigit || '',
                bankAccountType: params.accountType || 'CONTA_CORRENTE'
            };
        }
        else {
            throw new Error('[Asaas] Informe pixKey ou dados bancários para transferência');
        }
        return this.request('POST', '/transfers', body);
    }
    /**
     * Valida a autenticidade do webhook enviado pelo Asaas.
     */
    validateWebhookToken(token: string) {
        return token === process.env.ASAAS_WEBHOOK_TOKEN;
    }
}
export const asaasService = new AsaasService();
