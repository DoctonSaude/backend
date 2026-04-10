import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const testData = {
    email: `test_user_ai_${Date.now()}@example.com`,
    password: 'password123',
    name: 'AI Test User',
    role: 'PATIENT'
};

async function testRegistration() {
    console.log('--- TESTING REGISTRATION ---');
    try {
        const response = await axios.post(`${API_URL}/auth/register`, testData);
        console.log('Registration Success:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('Registration Failed:', error.response?.data || error.message);
        return null;
    }
}

async function testLogin(email: string) {
    console.log('--- TESTING LOGIN ---');
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email,
            password: 'password123'
        });
        console.log('Login Success:', response.data);
    } catch (error: any) {
        console.error('Login Failed:', error.response?.data || error.message);
    }
}

async function run() {
    const result = await testRegistration();
    if (result && result.user) {
        await testLogin(testData.email);
    }
}

run();
