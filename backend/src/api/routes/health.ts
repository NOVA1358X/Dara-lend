import { Router } from 'express';
import { getLatestBlockHeight } from '../../utils/aleoClient.js';
import { config } from '../../utils/config.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const blockHeight = await getLatestBlockHeight();
    res.json({
      status: 'ok',
      programId: config.programId,
      network: 'testnet',
      blockHeight,
      timestamp: Date.now(),
    });
  } catch {
    res.status(503).json({ status: 'error', timestamp: Date.now() });
  }
});

export default router;
