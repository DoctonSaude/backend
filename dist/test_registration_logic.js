"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock do logger
const logger = {
    warn: (msg, meta) => console.log(`WARN: ${msg}`, JSON.stringify(meta, null, 2)),
    info: (msg, meta) => console.log(`INFO: ${msg}`, JSON.stringify(meta, null, 2)),
    error: (msg, meta) => console.log(`ERROR: ${msg}`, JSON.stringify(meta, null, 2)),
};
// Simulação da função handleValidationErrors
function simulateHandleValidationErrors(req) {
    const errors = {
        isEmpty: () => false,
        array: () => [
            { msg: 'Nome deve ter pelo menos 3 caracteres', path: 'name', value: 'Ro' },
            { msg: 'Email inválido', path: 'email', value: 'invalid-email' }
        ]
    };
    if (!errors.isEmpty()) {
        const errorArray = errors.array();
        logger.warn('[auth] Erro de validação detectado:', {
            path: '/register',
            errors: errorArray,
            body: { ...req.body, password: '***' }
        });
        return { status: 400, json: { error: 'Erro de validação', details: errorArray } };
    }
    return { status: 200 };
}
// Teste
const mockReq = {
    body: {
        name: 'Ro',
        email: 'invalid-email',
        password: 'password123',
        role: 'PHARMACY'
    }
};
console.log('--- Simulando erro de validação ---');
const result = simulateHandleValidationErrors(mockReq);
console.log('Resultado enviado ao cliente:', JSON.stringify(result, null, 2));
// Simulação de erro de CNPJ duplicado
console.log('\n--- Simulando erro de CNPJ duplicado ---');
const pharmacyError = {
    code: 'P2002',
    message: 'Unique constraint failed on the fields: (cnpj)'
};
if (pharmacyError.code === 'P2002') {
    const errorResponse = { status: 400, json: { error: 'Este CNPJ já está cadastrado para outra farmácia.' } };
    console.log('Resposta para CNPJ duplicado:', JSON.stringify(errorResponse, null, 2));
}
//# sourceMappingURL=test_registration_logic.js.map