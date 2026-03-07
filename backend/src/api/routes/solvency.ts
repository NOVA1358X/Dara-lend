import { Router } from 'express';
import { getMappingValue, parseAleoU64, parseAleoField } from '../../utils/aleoClient.js';
import { config } from '../../utils/config.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [collateralRaw, borrowedRaw, solvencyRaw] = await Promise.all([
      getMappingValue('vault_total_collateral'),
      getMappingValue('total_borrowed'),
      getMappingValue('solvency_commitment'),
    ]);

    const totalCollateral = parseAleoU64(collateralRaw);
    const totalBorrowed = parseAleoU64(borrowedRaw);
    const solvencyCommitment = parseAleoField(solvencyRaw);
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
      solvencyCommitment: solvencyCommitment || null,
      verification:
        'The solvency commitment is a BHP256 hash of (total_collateral, total_borrowed). Verify by comparing the on-chain hash with BHP256::hash_to_field((totalCollateral, totalBorrowed)).',
      programId: config.programId,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[solvency] Error:', err);
    res.status(500).json({ error: 'Failed to verify solvency' });
  }
});

export default router;
