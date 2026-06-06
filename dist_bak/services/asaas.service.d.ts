declare class AsaasService {
    headers: any;
    constructor();
    request(method: string, path: string, body?: any): Promise<any>;
    /**
     * Cria ou reutiliza um cliente no Asaas.
     * Busca pelo cpfCnpj para evitar duplicatas.
     */
    getOrCreateCustomer(params: any): Promise<any>;
    /**
     * Cria uma cobrança PIX no Asaas.
     * Retorna a cobrança com QR Code embutido.
     */
    createPixCharge(params: any): Promise<any>;
    /**
     * Busca o QR Code PIX de uma cobrança existente.
     */
    getPixQrCode(chargeId: string): Promise<any>;
    /**
     * Cria uma cobrança de cartão de crédito (link de pagamento).
     */
    createCardCharge(params: any): Promise<any>;
    /**
     * Consulta o status de uma cobrança.
     */
    getChargeStatus(chargeId: string): Promise<any>;
    /**
     * Realiza uma transferência (repasse) via PIX ou TED para um parceiro.
     * Usado após confirmação de pagamento do paciente.
     */
    createTransfer(params: any): Promise<any>;
    /**
     * Valida a autenticidade do webhook enviado pelo Asaas.
     */
    validateWebhookToken(token: string): boolean;
}
export declare const asaasService: AsaasService;
export {};
//# sourceMappingURL=asaas.service.d.ts.map