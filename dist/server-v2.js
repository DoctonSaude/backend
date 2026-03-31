"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 3001;
// Middleware essencial
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// CORS garantido
app.use((0, cors_1.default)({
    origin: [
        'https://app.docton.com.br',
        'https://admin.docton.com.br',
        'https://parceiro.docton.com.br',
        'https://docton.com.br',
        'https://doctonsaude.com.br',
        ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000', 'http://localhost:5173'] : [])
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Tenant-Id'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));
// Health check
app.get('/api/ping', (req, res) => {
    res.status(200).send('PONG - DOCTON API v2.0');
});
// Status da API
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime()
    });
});
// Auth routes básicas (sem banco por enquanto)
app.post('/api/auth/register', (req, res) => {
    console.log('[AUTH] Register request received (fallback mode)');
    res.status(201).json({
        success: true,
        message: 'Registration completed (fallback mode)',
        user: {
            id: 'temp-' + Date.now(),
            email: req.body.email || 'user@example.com',
            name: req.body.name || 'New User',
            role: 'PATIENT'
        },
        token: 'fallback-jwt-token-' + Date.now(),
        fallback: true
    });
});
app.post('/api/auth/login', (req, res) => {
    console.log('[AUTH] Login request received (fallback mode)');
    res.status(200).json({
        success: true,
        message: 'Login successful (fallback mode)',
        user: {
            id: 'temp-' + Date.now(),
            email: req.body.email || 'user@example.com',
            name: 'User',
            role: 'PATIENT'
        },
        token: 'fallback-jwt-token-' + Date.now(),
        fallback: true
    });
});
app.get('/api/auth/validate', (req, res) => {
    res.json({
        valid: true,
        user: {
            id: 'temp-user',
            email: 'user@example.com',
            name: 'User',
            role: 'PATIENT'
        },
        fallback: true
    });
});
// Analytics fallback
app.post('/api/analytics/track', (req, res) => {
    console.log('[ANALYTICS] Event tracked (fallback mode):', req.body.event);
    res.json({ success: true, fallback: true });
});
app.post('/api/analytics/track-batch', (req, res) => {
    console.log('[ANALYTICS] Batch tracked (fallback mode):', req.body.events?.length || 0, 'events');
    res.json({ success: true, fallback: true });
});
// Dashboard fallbacks
app.get('/api/patients/dashboard', (req, res) => {
    res.json({
        stats: { totalAppointments: 0, upcomingAppointments: 0, completedAppointments: 0 },
        upcomingAppointments: [],
        recentAppointments: [],
        healthMetrics: null,
        notifications: [],
        quickActions: [],
        fallback: true
    });
});
app.get('/api/gamification/dashboard', (req, res) => {
    res.json({
        points: 0,
        streak: 0,
        level: 1,
        achievements: [],
        challenges: [],
        fallback: true
    });
});
app.get('/api/loyalty/me', (req, res) => {
    res.json({
        pointsBalance: 0,
        tier: 'Bronze',
        benefits: [],
        fallback: true
    });
});
app.get('/api/notifications', (req, res) => {
    res.json({
        notifications: [],
        unreadCount: 0,
        fallback: true
    });
});
// Catch all
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        fallback: true
    });
});
// Start server
server.listen(PORT, () => {
    console.log('🚀 DOCTON API v2.0 started successfully');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🏥 Health: http://localhost:${PORT}/api/ping`);
    console.log('✅ All systems operational (fallback mode)');
});
server.on('error', (err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=server-v2.js.map