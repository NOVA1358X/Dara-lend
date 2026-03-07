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
    const [collateralRaw, borrowedRaw, loansRaw, priceRaw] =
      await Promise.all([
        getMappingValue('vault_total_collateral'),
        getMappingValue('total_borrowed'),
        getMappingValue('loan_count'),
        getMappingValue('oracle_price'),
      ]);

    const totalCollateral = parseAleoU64(collateralRaw);
    const totalBorrowed = parseAleoU64(borrowedRaw);
    const loanCount = parseAleoU64(loansRaw);
    const oraclePrice = parseAleoU64(priceRaw);

    const utilizationRate =
      totalCollateral > 0 ? totalBorrowed / totalCollateral : 0;

    const data = {
      totalCollateral,
      totalBorrowed,
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
