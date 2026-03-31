"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Health check básico
app.get('/api/ping', (req, res) => {
    res.status(200).send('PONG - SERVER IS ALIVE');
});
// CORS básico
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Tenant-Id, Cache-Control, Pragma');
    }
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    console.log(`[SIMPLE] ${req.method} ${req.path} | Origin: ${origin}`);
    next();
});
// Rota de teste
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Server working!',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV
    });
});
const server = app.listen(PORT, () => {
    console.log(`🚀 SIMPLE SERVER running on port ${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/ping`);
});
server.on('error', (err) => {
    console.error('❌ Failed to start simple server:', err);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=server-simple.js.map