import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

async function verifyStorage() {
    const { supabase } = await import('../lib/supabase.js');
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
        } else {
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

    } catch (err: any) {
        console.error('❌ Erro inesperado:', err.message || err);
    }

    process.exit(0);
}

verifyStorage();
