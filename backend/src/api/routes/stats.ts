import { Router } from 'express';
import { getMappingValue, parseAleoU64 } from '../../utils/aleoClient.js';
import { config } from '../../utils/config.js';

const router = Router();

interface StatsCache {
  data: Record<string, unknown> | null;
  timestamp: number;
}

const cache: StatsCache = { data: null, timestamp: 0 };
const CACHE_TTL = 15_000;

router.get('/', async (_req, res) => {
  const now = Date.now();
  if (cache.data && now - cache.timestamp < CACHE_TTL) {
    res.json(cache.data);
    return;
  }

  try {
    const [collateralAleoRaw, collateralUsdcxRaw, collateralUsadRaw, borrowedUsdcxRaw, borrowedUsadRaw, borrowedCreditsRaw, priceAleoRaw, loansRaw] =
      await Promise.all([
        getMappingValue('vault_collateral_aleo'),
        getMappingValue('vault_collateral_usdcx', '0u8', config.creditsProgramId),
        getMappingValue('vault_collateral_usad', '0u8', config.creditsProgramId),
        getMappingValue('pool_total_borrowed', '0u8'),
        getMappingValue('pool_total_borrowed', '1u8'),
        getMappingValue('pool_total_borrowed', '2u8'),
        getMappingValue('oracle_price', '0u8'),
        getMappingValue('loan_count'),
      ]);

    const collateralAleo = parseAleoU64(collateralAleoRaw);
    const collateralUsdcx = parseAleoU64(collateralUsdcxRaw);
    const collateralUsad = parseAleoU64(collateralUsadRaw);
    const borrowedUsdcx = parseAleoU64(borrowedUsdcxRaw);
    const borrowedUsad = parseAleoU64(borrowedUsadRaw);
    const borrowedCredits = parseAleoU64(borrowedCreditsRaw);
    const totalBorrowed = borrowedUsdcx + borrowedUsad + borrowedCredits;
    const loanCount = parseAleoU64(loansRaw);
    const oraclePrice = parseAleoU64(priceAleoRaw);

    const totalCollateral = collateralAleo;
    const utilizationRate =
      totalCollateral > 0 ? totalBorrowed / totalCollateral : 0;

    const data = {
      totalCollateral,
      collateralAleo,
      collateralUsdcx,
      collateralUsad,
      totalBorrowed,
      borrowedUsdcx,
      borrowedUsad,
      borrowedCredits,
      loanCount,
      oraclePrice,
      oraclePriceFormatted: (oraclePrice / config.precision).toFixed(4),
      utilizationRate,
      availableLiquidity: Math.max(0, totalCollateral - totalBorrowed),
      timestamp: now,
    };

    cache.data = data;
    cache.timestamp = now;
    res.json(data);
  } catch (err) {
    console.error('[stats] Error fetching protocol stats:', err);
    res.status(500).json({ error: 'Failed to fetch protocol stats' });
  }
});

export default router;
