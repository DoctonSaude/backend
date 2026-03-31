import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/sessions', authenticate, async (_req, res) => {
  return res.status(501).json({ error: 'Not implemented' });
});

router.get('/connectivity-test', async (_req, res) => {
  return res.json({ ok: true, timestamp: new Date().toISOString() });
});

export default router;
