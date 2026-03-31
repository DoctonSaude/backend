"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/sessions', auth_1.authenticate, async (_req, res) => {
    return res.status(501).json({ error: 'Not implemented' });
});
router.get('/connectivity-test', async (_req, res) => {
    return res.json({ ok: true, timestamp: new Date().toISOString() });
});
exports.default = router;
//# sourceMappingURL=telemedicine.routes.js.map