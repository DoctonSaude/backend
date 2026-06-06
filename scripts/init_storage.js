const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Carregar variáveis de ambiente de produção
dotenv.config({ path: path.join(__dirname, '../.env.production') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no .env.production');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const REQUIRED_BUCKETS = [
    { name: 'avatars', public: true },
    { name: 'marketing', public: true },
    { name: 'patient-documents', public: true },
    { name: 'prescriptions', public: false }
];

async function initStorage() {
    console.log('🚀 Iniciando provisionamento de buckets no Supabase Production...\n');

    for (const bucket of REQUIRED_BUCKETS) {
        try {
            console.log(`Checking bucket: ${bucket.name}...`);
            const { data: buckets } = await supabase.storage.listBuckets();
            const exists = buckets?.some(b => b.name === bucket.name);

            if (!exists) {
                console.log(`Creating bucket: ${bucket.name}...`);
                const { data, error } = await supabase.storage.createBucket(bucket.name, {
                    public: bucket.public,
                    allowedMimeTypes: null, // Permitir todos
                    fileSizeLimit: 10 * 1024 * 1024 // 10MB
                });

                if (error) {
                    console.error(`❌ Erro ao criar bucket ${bucket.name}:`, error.message);
                } else {
                    console.log(`✅ Bucket ${bucket.name} criado com sucesso!`);
                }
            } else {
                console.log(`✅ Bucket ${bucket.name} já existe.`);
            }
        } catch (err) {
            console.error(`❌ Erro inesperado no bucket ${bucket.name}:`, err.message);
        }
    }

    console.log('\n✨ Provisionamento concluído!');
}

initStorage();
