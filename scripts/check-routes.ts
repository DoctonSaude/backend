import { app } from '../src/server.js';
import listEndpoints from 'express-list-endpoints';

console.log('--- Registered Routes ---');
const endpoints = listEndpoints(app);
endpoints.forEach(e => {
    if (e.path.includes('prescriptions')) {
        console.log(`[FOUND]: ${e.methods.join(', ')} -> ${e.path}`);
    } else if (e.path.includes('partners')) {
        console.log(`[PARTNERS]: ${e.methods.join(', ')} -> ${e.path}`);
    }
});
console.log('--- Done ---');
