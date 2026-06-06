import { cacheService } from '../services/cache.service.js';

async function testCache() {
    console.log('--- TESTE DE RESILIÊNCIA DE CACHE ---');
    
    // Forçar ausência de Redis (se necessário, mas o código já deve lidar com null)
    console.log('Testando SET sem Redis...');
    try {
        await cacheService.set('test_key', { hello: 'world' }, { ttl: 60 });
        console.log('✅ Set concluído (fallback em memória)');
        
        console.log('Testando GET...');
        const val = await cacheService.get('test_key');
        console.log('✅ Get concluído:', val);
        
        if (val && (val as any).hello === 'world') {
            console.log('🚀 SUCESSO: Cache funcionando com fallback local!');
        } else {
            console.log('❌ FALHA: Valor recuperado incorreto.');
        }
    } catch (err) {
        console.error('❌ ERRO CRÍTICO:', err);
    }
}

testCache();
