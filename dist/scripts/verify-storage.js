"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });
async function verifyStorage() {
    const { supabase } = await Promise.resolve().then(() => __importStar(require('../lib/supabase.js')));
    console.log('🔍 Verificando integração com Supabase Storage...');
    try {
        // 2. Tentar um upload de teste direto
        const testFile = Buffer.from('test check');
        const testPath = `debug/test-${Date.now()}.txt`;
        console.log('📤 Tentando upload de teste direto no bucket "docton-assets"...');
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('docton-assets')
            .upload(testPath, testFile, { contentType: 'text/plain' });
        if (uploadError) {
            console.error('❌ Erro no upload de teste:', uploadError.message);
            console.log('💡 Dica: Verifique se você criou uma política de RLS permitindo "INSERT" para o perfil anon ou autenticado.');
        }
        else {
            console.log('✅ Upload de teste realizado com sucesso!');
            // 3. Gerar URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('docton-assets')
                .getPublicUrl(testPath);
            console.log('🔗 URL Pública do teste:', publicUrl);
            // 4. Limpeza (opcional, remover o arquivo de teste)
            await supabase.storage.from('docton-assets').remove([testPath]);
            console.log('🧹 Arquivo de teste removido.');
        }
    }
    catch (err) {
        console.error('❌ Erro inesperado:', err.message || err);
    }
    process.exit(0);
}
verifyStorage();
//# sourceMappingURL=verify-storage.js.map