import axios from 'axios';

async function test() {
    try {
        // Primeiro, vamos fazer login para pegar um token
        console.log('🔐 Tentando fazer login...');
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@docton.com.br',
            password: 'admin123'
        });
        console.log('✅ Login response:', loginRes.data);

        const token = loginRes.data.token;

        // Agora tentar acessar os plans
        console.log('📋 Tentando acessar /api/admin/plans...');
        const plansRes = await axios.get('http://localhost:3001/api/admin/plans', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Plans response:', plansRes.data);

    } catch (error: any) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

test();
