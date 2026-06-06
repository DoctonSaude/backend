"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/symptoms/analyze', auth_1.authenticate, async (_req, res) => {
    return res.status(501).json({ error: 'Not implemented' });
});
router.post('/drugs/interactions', auth_1.authenticate, async (_req, res) => {
    return res.status(501).json({ error: 'Not implemented' });
});
router.post('/vital-signs', auth_1.authenticate, async (_req, res) => {
    return res.status(501).json({ error: 'Not implemented' });
});
router.get('/vital-signs', auth_1.authenticate, async (_req, res) => {
    return res.json([]);
});
router.get('/alerts/:patientId', auth_1.authenticate, async (_req, res) => {
    return res.json([]);
});
router.patch('/alerts/:alertId/read', auth_1.authenticate, async (_req, res) => {
    return res.json({ success: true });
});
router.get('/knowledge/search', auth_1.authenticate, async (_req, res) => {
    return res.json([]);
});
router.post('/calculations', auth_1.authenticate, async (_req, res) => {
    return res.status(501).json({ error: 'Not implemented' });
});
exports.default = router;
//# sourceMappingURL=medical.routes.js.map