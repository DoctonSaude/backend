"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
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
        const response = await axios_1.default.post(`${API_URL}/auth/register`, testData);
        console.log('Registration Success:', response.data);
        return response.data;
    }
    catch (error) {
        console.error('Registration Failed:', error.response?.data || error.message);
        return null;
    }
}
async function testLogin(email) {
    console.log('--- TESTING LOGIN ---');
    try {
        const response = await axios_1.default.post(`${API_URL}/auth/login`, {
            email,
            password: 'password123'
        });
        console.log('Login Success:', response.data);
    }
    catch (error) {
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
//# sourceMappingURL=test_auth_api.js.map