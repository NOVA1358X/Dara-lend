import { Router } from 'express';
import { getMappingValue, parseAleoU64 } from '../../utils/aleoClient.js';
import { config } from '../../utils/config.js';
import { getOracleStatus } from '../../oracle/priceUpdater.js';
import { getMonitorStatus } from '../../liquidation/executor.js';

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
      vaultProgramId: config.vaultProgramId,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[analytics] Overview error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

// GET /api/analytics/vault - Vault pool status
router.get('/vault', async (_req, res) => {
  try {
    const [
      poolTotalUsdcxRaw, poolTotalUsadRaw,
      poolSharesUsdcxRaw, poolSharesUsadRaw,
      yieldUsdcxRaw, yieldUsadRaw,
      depositCountUsdcxRaw, depositCountUsadRaw,
      transferCountUsdcxRaw, transferCountUsadRaw,
      volumeUsdcxRaw, volumeUsadRaw,
    ] = await Promise.all([
      getMappingValue('supply_pool_total', '0u8', config.vaultProgramId),
      getMappingValue('supply_pool_total', '1u8', config.vaultProgramId),
      getMappingValue('supply_pool_shares', '0u8', config.vaultProgramId),
      getMappingValue('supply_pool_shares', '1u8', config.vaultProgramId),
      getMappingValue('pool_yield_accumulated', '0u8', config.vaultProgramId),
      getMappingValue('pool_yield_accumulated', '1u8', config.vaultProgramId),
      getMappingValue('pool_deposit_count', '0u8', config.vaultProgramId),
      getMappingValue('pool_deposit_count', '1u8', config.vaultProgramId),
      getMappingValue('transfer_count', '0u8', config.vaultProgramId),
      getMappingValue('transfer_count', '1u8', config.vaultProgramId),
      getMappingValue('total_volume', '0u8', config.vaultProgramId),
      getMappingValue('total_volume', '1u8', config.vaultProgramId),
    ]);

    const poolTotalUsdcx = parseAleoU64(poolTotalUsdcxRaw);
    const poolTotalUsad = parseAleoU64(poolTotalUsadRaw);
    const poolSharesUsdcx = parseAleoU64(poolSharesUsdcxRaw);
    const poolSharesUsad = parseAleoU64(poolSharesUsadRaw);

    res.json({
      pools: {
        usdcx: {
          totalDeposits: poolTotalUsdcx,
          totalShares: poolSharesUsdcx,
          yieldAccumulated: parseAleoU64(yieldUsdcxRaw),
          depositCount: parseAleoU64(depositCountUsdcxRaw),
          sharePrice: poolSharesUsdcx > 0 ? poolTotalUsdcx / poolSharesUsdcx : 1,
        },
        usad: {
          totalDeposits: poolTotalUsad,
          totalShares: poolSharesUsad,
          yieldAccumulated: parseAleoU64(yieldUsadRaw),
          depositCount: parseAleoU64(depositCountUsadRaw),
          sharePrice: poolSharesUsad > 0 ? poolTotalUsad / poolSharesUsad : 1,
        },
      },
      privateTransfers: {
        usdcx: {
          count: parseAleoU64(transferCountUsdcxRaw),
          volume: parseAleoU64(volumeUsdcxRaw),
        },
        usad: {
          count: parseAleoU64(transferCountUsadRaw),
          volume: parseAleoU64(volumeUsadRaw),
        },
      },
      precision: config.precision,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[analytics] Vault error:', err);
    res.status(500).json({ error: 'Failed to fetch vault analytics' });
  }
});

// GET /api/analytics/multi-price - All oracle prices
router.get('/multi-price', async (_req, res) => {
  try {
    const assetIds = [0, 1, 2];
    const labels = ['ALEO', 'USDCx', 'USAD'];

    const pricePromises = assetIds.map((id) =>
      getMappingValue('oracle_price', `${id}u8`),
    );
    const roundPromises = assetIds.map((id) =>
      getMappingValue('price_round', `${id}u8`),
    );

    const [prices, rounds] = await Promise.all([
      Promise.all(pricePromises),
      Promise.all(roundPromises),
    ]);

    const assets = assetIds.map((id, i) => ({
      tokenId: id,
      symbol: labels[i],
      price: parseAleoU64(prices[i]),
      priceFormatted: (parseAleoU64(prices[i]) / config.precision).toFixed(4),
      round: parseAleoU64(rounds[i]),
    }));

    res.json({
      assets,
      precision: config.precision,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[analytics] Multi-price error:', err);
    res.status(500).json({ error: 'Failed to fetch multi-asset prices' });
  }
});

export default router;
