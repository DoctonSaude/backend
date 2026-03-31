const { Client } = require('pg');
// Testando a senha alternativa encontrada anteriormente
const connectionString = 'postgresql://postgres.ykilsibmhnctunafoayt:Docton.2026%2A%2A@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require';

async function testConnection() {
    const client = new Client({
        connectionString: connectionString,
    });

    try {
        console.log('Tentando conectar ao Supabase Pooler...');
        await client.connect();
        console.log('✅ Conexão bem-sucedida!');

        const res = await client.query('SELECT NOW()');
        console.log('Resultado da query:', res.rows[0]);

        await client.end();
    } catch (err) {
        console.error('❌ Falha na conexão:');
        console.error(err.message);
        if (err.detail) console.error('Detalhe:', err.detail);
        if (err.hint) console.error('Dica:', err.hint);
    }
}

testConnection();
