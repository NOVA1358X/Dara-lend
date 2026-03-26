import { Router } from 'express';
import { getMappingValue, parseAleoU64 } from '../../utils/aleoClient.js';
import { config } from '../../utils/config.js';
import { getOracleStatus } from '../../oracle/priceUpdater.js';
import { getMonitorStatus } from '../../liquidation/monitor.js';

const router = Router();

// In-memory time-series store (resets on server restart)
interface DataPoint {
  timestamp: number;
  value: number;
}

const tvlHistory: DataPoint[] = [];
const priceHistory: DataPoint[] = [];
const borrowHistory: DataPoint[] = [];
const MAX_HISTORY = 500;

function pushDataPoint(list: DataPoint[], value: number) {
  list.push({ timestamp: Date.now(), value });
  if (list.length > MAX_HISTORY) list.shift();
}

// Record a snapshot every 2 minutes
async function recordSnapshot() {
  try {
    const [collRaw, borrowUsdcxRaw, borrowUsadRaw, borrowCreditsRaw, priceRaw] = await Promise.all([
      getMappingValue('vault_collateral_aleo'),
      getMappingValue('pool_total_borrowed', '0u8'),
      getMappingValue('pool_total_borrowed', '1u8'),
      getMappingValue('pool_total_borrowed', '2u8'),
      getMappingValue('oracle_price', '0u8'),
    ]);

    const tvl = parseAleoU64(collRaw);
    const totalBorrowed = parseAleoU64(borrowUsdcxRaw) + parseAleoU64(borrowUsadRaw) + parseAleoU64(borrowCreditsRaw);
    const price = parseAleoU64(priceRaw);

    pushDataPoint(tvlHistory, tvl);
    pushDataPoint(borrowHistory, totalBorrowed);
    pushDataPoint(priceHistory, price);
  } catch {
    // silently skip
  }
}

// Start recording
setInterval(recordSnapshot, 120_000);
recordSnapshot();

// GET /api/analytics/tvl - TVL time series
router.get('/tvl', (_req, res) => {
  res.json({
    history: tvlHistory,
    precision: config.precision,
  });
});

// GET /api/analytics/price-history - Oracle price time series
router.get('/price-history', (_req, res) => {
  res.json({
    history: priceHistory,
    precision: config.precision,
  });
});

// GET /api/analytics/borrow-history - Borrow volume time series
router.get('/borrow-history', (_req, res) => {
  res.json({
    history: borrowHistory,
    precision: config.precision,
  });
});

// GET /api/analytics/interest-rates - Current rate params
router.get('/interest-rates', async (_req, res) => {
  try {
    const [baseRaw, slopeRaw, supplyApyRaw, borrowApyRaw] = await Promise.all([
      getMappingValue('rate_base_bps'),
      getMappingValue('rate_slope_bps'),
      getMappingValue('supply_apy_bps'),
      getMappingValue('borrow_apy_bps'),
    ]);

    res.json({
      rateBaseBps: parseAleoU64(baseRaw),
      rateSlopeBps: parseAleoU64(slopeRaw),
      supplyApyBps: parseAleoU64(supplyApyRaw),
      borrowApyBps: parseAleoU64(borrowApyRaw),
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[analytics] Interest rates error:', err);
    res.status(500).json({ error: 'Failed to fetch interest rates' });
  }
});

// GET /api/analytics/overview - Full protocol overview
router.get('/overview', async (_req, res) => {
  try {
    const [oracle, monitor] = await Promise.all([
      getOracleStatus(),
      Promise.resolve(getMonitorStatus()),
    ]);

    res.json({
      oracle,
      monitor,
      tvlHistory: tvlHistory.slice(-24),
      priceHistory: priceHistory.slice(-24),
      borrowHistory: borrowHistory.slice(-24),
      precision: config.precision,
      programId: config.programId,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[analytics] Overview error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

export default router;
