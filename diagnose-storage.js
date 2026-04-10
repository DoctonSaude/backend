// Script de diagnóstico do Supabase Storage
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ykilsibmhnctunafoayt.supabase.co';
// Testar com a service_role key atual
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlraWxzaWJtaG5jdHVuYWZvYXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTkwNTksImV4cCI6MjA3OTU3NTA1OX0.jOMCXWEB7bTIpFJ7DTHSoWg5_ltl18SPEPN6wVQpvBs';

async function testStorage() {
  console.log('=== Diagnóstico do Supabase Storage ===\n');
  
  // Teste 1: conectar com service_role
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  console.log(`Usando chave: ${key ? 'service_role (env)' : 'anon_key (fallback)'}`);
  
  try {
    const supabase = createClient(SUPABASE_URL, key);
    
    // Listar buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Erro ao listar buckets:', bucketsError);
    } else {
      console.log('✅ Buckets disponíveis:', buckets.map(b => `${b.name} (${b.public ? 'público' : 'privado'})`));
      
      const avatarsBucket = buckets.find(b => b.name === 'avatars');
      if (avatarsBucket) {
        console.log('\n✅ Bucket "avatars" EXISTE e está configurado como:', avatarsBucket.public ? 'PÚBLICO' : 'PRIVADO');
      } else {
        console.log('\n❌ Bucket "avatars" NÃO EXISTE - precisa ser criado!');
        
        // Tentar criar o bucket
        console.log('\nTentando criar bucket "avatars"...');
        const { data: newBucket, error: createError } = await supabase.storage.createBucket('avatars', { public: true });
        if (createError) {
          console.error('❌ Erro ao criar bucket:', createError);
        } else {
          console.log('✅ Bucket "avatars" criado com sucesso!', newBucket);
        }
      }
    }
    
    // Teste 2: upload simples
    console.log('\n--- Testando upload de arquivo ---');
    const testBuffer = Buffer.from('teste');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload('test/diagnostic.txt', testBuffer, { contentType: 'text/plain', upsert: true });
    
    if (uploadError) {
      console.error('❌ Erro no upload de teste:', uploadError);
    } else {
      console.log('✅ Upload de teste funcionou!', uploadData.path);
      
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl('test/diagnostic.txt');
      console.log('✅ URL pública gerada:', publicUrl);
    }
    
  } catch (err) {
    console.error('❌ Erro crítico:', err.message);
  }
}

testStorage();
