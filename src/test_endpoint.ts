
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const log = (msg: string) => {
        console.log(msg);
        fs.appendFileSync('test_output.txt', msg + '\n');
    };

    log('Testing CRM Endpoint and Auth...');
    fs.writeFileSync('test_output.txt', 'Start\n');

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
        const resGet = await fetch('http://localhost:3001/api/admin/quotes', {
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

        const res = await fetch(`http://localhost:3001/api/admin/quotes/${quote.id}/crm`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        log('PATCH Status: ' + res.status);
        const text = await res.text();
        log('PATCH Body Preview: ' + text.substring(0, 500));

    } catch (e) {
        log('Fetch failed: ' + e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
