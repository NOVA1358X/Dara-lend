import { Router } from 'express';
import { getOracleStatus } from '../../oracle/priceUpdater.js';
import { getMappingValue, parseAleoU64 } from '../../utils/aleoClient.js';

const router = Router();

router.get('/status', async (_req, res) => {
  try {
    const status = getOracleStatus();

    // Also fetch current on-chain values
    const [onChainPriceRaw, onChainRoundRaw] = await Promise.all([
      getMappingValue('oracle_price'),
      getMappingValue('price_round'),
    ]);

    res.json({
      ...status,
      onChainPrice: parseAleoU64(onChainPriceRaw),
      onChainRound: parseAleoU64(onChainRoundRaw),
    });
  } catch (err) {
    console.error('[oracle] Status endpoint error:', err);
    res.status(500).json({ error: 'Failed to fetch oracle status' });
  }
});

export default router;
