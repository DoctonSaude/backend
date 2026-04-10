/**
 * Script para criar o bucket "avatars" no Supabase usando a JWT correta do arquivo .env.production
 * 
 * Execute: node create-avatar-bucket.js
 */
const https = require('https');

const SUPABASE_URL = 'https://ykilsibmhnctunafoayt.supabase.co';
// A JWT_SECRET no .env.production é a própria service_role key real do Supabase
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlraWxzaWJtaG5jdHVuYWZvYXl0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzk5OTA1OSwiZXhwIjoyMDc5NTc1MDU5fQ.MvQbXcj4-d7saUOahgv553f593tA6CMTKoa6ya_V1GI';

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}${path}`);
    const data = body ? JSON.stringify(body) : null;
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(responseData) });
        } catch {
          resolve({ status: res.statusCode, body: responseData });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== Criando bucket "avatars" no Supabase ===\n');
  console.log('Decodificando JWT da service_role...');
  
  try {
    const payload = JSON.parse(Buffer.from(SERVICE_KEY.split('.')[1], 'base64').toString());
    console.log('JWT válido! Role:', payload.role, '| Ref:', payload.ref, '| Exp:', new Date(payload.exp * 1000).toISOString());
  } catch(e) {
    console.error('❌ JWT inválido:', e.message);
    return;
  }

  // 1. Listar buckets
  console.log('\n1. Listando buckets existentes...');
  const list = await makeRequest('GET', '/storage/v1/bucket');
  console.log(`   Status: ${list.status}`);
  if (Array.isArray(list.body)) {
    console.log('   Buckets:', list.body.map(b => b.name));
    const exists = list.body.find(b => b.name === 'avatars');
    if (exists) {
      console.log('\n✅ Bucket "avatars" já existe!');
      console.log('   Public:', exists.public);
      return;
    }
  } else {
    console.log('   Resposta:', JSON.stringify(list.body));
  }

  // 2. Criar o bucket
  console.log('\n2. Criando bucket "avatars" público...');
  const create = await makeRequest('POST', '/storage/v1/bucket', {
    id: 'avatars',
    name: 'avatars',
    public: true,
    file_size_limit: 10485760, // 10MB
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  });
  
  console.log(`   Status: ${create.status}`);
  console.log('   Resposta:', JSON.stringify(create.body));
  
  if (create.status === 200 || create.status === 201) {
    console.log('\n✅ Bucket "avatars" criado com sucesso!');
    console.log('   Agora o upload de avatares deve funcionar em produção.');
  } else {
    console.error('\n❌ Falha ao criar bucket.');
    console.log('   Acesse: https://supabase.com/dashboard/project/ykilsibmhnctunafoayt/storage/buckets');
    console.log('   E crie manualmente um bucket chamado "avatars" marcado como PUBLIC.');
  }
}

main().catch(console.error);
