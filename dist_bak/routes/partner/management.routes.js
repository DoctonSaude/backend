"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../../lib/prisma.js"));
const router = (0, express_1.Router)();
/**
 * @route GET /api/partners/rooms
 */
router.get('/rooms', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const rooms = await prisma_js_1.default.room.findMany({
            where: { partnerId: partner.id, isActive: true }
        });
        res.json(rooms);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar salas' });
    }
});
/**
 * @route GET /api/partners/equipment
 */
router.get('/equipment', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const equipment = await prisma_js_1.default.equipment.findMany({
            where: { partnerId: partner.id, isActive: true }
        });
        res.json(equipment);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar equipamentos' });
    }
});
/**
 * @route GET /api/partners/patients
 */
router.get('/patients', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const appointments = await prisma_js_1.default.appointment.findMany({
            where: { partnerId: partner.id },
            include: {
                patient: {
                    include: {
                        user: { select: { name: true, email: true, phone: true, avatar: true } }
                    }
                }
            },
            orderBy: { dateTime: 'desc' }
        });
        const patientMap = new Map();
        appointments.forEach(app => {
            if (!app.patient)
                return;
            if (!patientMap.has(app.patientId)) {
                patientMap.set(app.patientId, {
                    id: app.patient.id,
                    name: app.patient.user.name,
                    email: app.patient.user.email,
                    phone: app.patient.user.phone,
                    avatar: app.patient.user.avatar,
                    lastAppointment: app.dateTime,
                    totalAppointments: 1
                });
            }
            else {
                const p = patientMap.get(app.patientId);
                p.totalAppointments++;
            }
        });
        res.json(Array.from(patientMap.values()));
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar pacientes' });
    }
});
exports.default = router;
//# sourceMappingURL=management.routes.js.map