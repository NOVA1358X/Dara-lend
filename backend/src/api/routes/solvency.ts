import { Router } from 'express';
import { getMappingValue, parseAleoU64 } from '../../utils/aleoClient.js';
import { config } from '../../utils/config.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [collateralRaw, borrowedUsdcxRaw, borrowedUsadRaw, borrowedCreditsRaw, pausedRaw] = await Promise.all([
      getMappingValue('vault_collateral_aleo'),
      getMappingValue('pool_total_borrowed', '0u8'),
      getMappingValue('pool_total_borrowed', '1u8'),
      getMappingValue('pool_total_borrowed', '2u8'),
      getMappingValue('protocol_paused'),
    ]);

    const totalCollateral = parseAleoU64(collateralRaw);
    const totalBorrowed = parseAleoU64(borrowedUsdcxRaw) + parseAleoU64(borrowedUsadRaw) + parseAleoU64(borrowedCreditsRaw);
    const isSolvent = totalCollateral >= totalBorrowed;
    const isPaused = (pausedRaw?.replace(/["\s]/g, '') === '1u8') || false;
    const collateralizationRatio =
      totalBorrowed > 0
        ? ((totalCollateral / totalBorrowed) * 100).toFixed(2)
        : 'N/A';

    res.json({
      isSolvent,
      isPaused,
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
