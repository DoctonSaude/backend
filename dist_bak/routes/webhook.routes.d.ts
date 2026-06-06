/**
 * ============================================================
 *  DOCTON SAÚDE — Webhook Handler do Gateway de Pagamento
 * ============================================================
 *
 * Este handler recebe e processa eventos de confirmação de
 * pagamento enviados pelo gateway externo.
 *
 * URL: POST /api/webhooks/payment
 *
 * Configure no painel do gateway o destino:
 *   https://api.docton.com.br/api/webhooks/payment
 *
 * Cabeçalho esperado:
 *   x-gateway-signature: <token ou HMAC enviado pelo gateway>
 * ============================================================
 */
declare const router: import("@types/express-serve-static-core/index.js").Router;
export default router;
//# sourceMappingURL=webhook.routes.d.ts.map