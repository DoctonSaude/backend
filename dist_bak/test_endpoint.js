"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs_1 = __importDefault(require("fs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const log = (msg) => {
        console.log(msg);
        fs_1.default.appendFileSync('test_output.txt', msg + '\n');
    };
    log('Testing CRM Endpoint and Auth...');
    fs_1.default.writeFileSync('test_output.txt', 'Start\n');
    // 1. Get a quote
    let quote = await prisma.quote.findFirst();
    if (!quote) {
        quote = await prisma.quote.create({
            data: {
                patientName: "Test Endpoint",
                patientPhone: "111111111",
                examType: "Test Endpoint Exam"
            }
        });
    }
    log('Quote ID: ' + quote.id);
    try {
        // Test GET /quotes (List) to check basic access
        log('--- Testing GET /api/admin/quotes ---');
        const resGet = await (0, node_fetch_1.default)('http://localhost:3001/api/admin/quotes', {
            method: 'GET'
        });
        log('GET Status: ' + resGet.status);
        // Test PATCH CRM
        log('--- Testing PATCH /api/admin/quotes/:id/crm ---');
        const payload = {
            statusInterno: "negociacao",
            notas: "Updated via test script",
            responsavel: "Test Script"
        };
        const res = await (0, node_fetch_1.default)(`http://localhost:3001/api/admin/quotes/${quote.id}/crm`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        log('PATCH Status: ' + res.status);
        const text = await res.text();
        log('PATCH Body Preview: ' + text.substring(0, 500));
    }
    catch (e) {
        log('Fetch failed: ' + e);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=test_endpoint.js.map