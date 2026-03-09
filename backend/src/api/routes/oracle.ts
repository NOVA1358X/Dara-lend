import { Router } from 'express';
import { getOracleStatus } from '../../oracle/priceUpdater.js';

const router = Router();

router.get('/status', async (_req, res) => {
  try {
    const status = await getOracleStatus();
    res.json(status);
  } catch (err) {
    console.error('[oracle] Status endpoint error:', err);
    res.status(500).json({ error: 'Failed to fetch oracle status' });
  }
});

export default router;
