"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache_service_js_1 = require("../services/cache.service.js");
async function testCache() {
    console.log('--- TESTE DE RESILIÊNCIA DE CACHE ---');
    // Forçar ausência de Redis (se necessário, mas o código já deve lidar com null)
    console.log('Testando SET sem Redis...');
    try {
        await cache_service_js_1.cacheService.set('test_key', { hello: 'world' }, { ttl: 60 });
        console.log('✅ Set concluído (fallback em memória)');
        console.log('Testando GET...');
        const val = await cache_service_js_1.cacheService.get('test_key');
        console.log('✅ Get concluído:', val);
        if (val && val.hello === 'world') {
            console.log('🚀 SUCESSO: Cache funcionando com fallback local!');
        }
        else {
            console.log('❌ FALHA: Valor recuperado incorreto.');
        }
    }
    catch (err) {
        console.error('❌ ERRO CRÍTICO:', err);
    }
}
testCache();
//# sourceMappingURL=test_cache.js.map