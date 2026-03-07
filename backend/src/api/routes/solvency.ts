import { Router } from 'express';
import { getMappingValue, parseAleoU64 } from '../../utils/aleoClient.js';
import { config } from '../../utils/config.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [collateralRaw, borrowedRaw] = await Promise.all([
      getMappingValue('vault_total_collateral'),
      getMappingValue('total_borrowed'),
    ]);

    const totalCollateral = parseAleoU64(collateralRaw);
    const totalBorrowed = parseAleoU64(borrowedRaw);
    const isSolvent = totalCollateral >= totalBorrowed;
    const collateralizationRatio =
      totalBorrowed > 0
        ? ((totalCollateral / totalBorrowed) * 100).toFixed(2)
        : 'N/A';

    res.json({
      isSolvent,
      totalCollateral,
      totalBorrowed,
      collateralizationRatio,
      programId: config.programId,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[solvency] Error:', err);
    res.status(500).json({ error: 'Failed to verify solvency' });
  }
});

export default router;
