import { checkRedisHealth } from '../lib/redis.js';

async function testHealth() {
    console.log('--- TESTE DE INFRAESTRUTURA REDIS ---');
    
    console.log('Executando checkRedisHealth()...');
    const health = await checkRedisHealth();
    
    console.log('Status do Redis:', health.status);
    if (health.message) {
        console.log('Mensagem:', health.message);
    }

    if (health.status === 'up') {
        console.log('✅ SUCESSO: Redis está configurado e respondendo!');
    } else {
        console.log('⚠️  AVISO: Redis não está acessível no ambiente local.');
        console.log('Isso é esperado se você não tiver um Redis rodando em localhost:6379.');
        console.log('O importante é que o sistema tratou a falha GRACIOSAMENTE sem crashar.');
    }
}

testHealth();
