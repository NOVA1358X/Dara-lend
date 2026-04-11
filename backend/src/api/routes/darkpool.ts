import { Router } from 'express';
import { config, darkpoolMarkets } from '../../utils/config.js';
import { aggregatePrices } from '../../oracle/aggregator.js';

const router = Router();

const cleanAleo = (raw: string): string => raw.replace(/["\s]/g, '').replace(/u\d+$/i, '');
const safeParse = (raw: string | undefined): string => {
  if (!raw || raw.includes('null') || raw.includes('error') || raw.includes('NOT_FOUND')) return '0';
  return cleanAleo(raw) || '0';
};

function resolveProgramId(marketParam?: string): string {
  if (!marketParam) return config.darkpoolProgramId;
  const market = darkpoolMarkets.find(m => m.id === marketParam);
  return market?.programId ?? config.darkpoolProgramId;
}

function mappingUrl(mapping: string, key: string, programId: string = config.darkpoolProgramId): string {
  return `${config.aleoApiUrl}/program/${programId}/mapping/${mapping}/${key}`;
}

async function fetchMapping(mapping: string, key: string, programId: string = config.darkpoolProgramId): Promise<string> {
  return fetch(mappingUrl(mapping, key, programId)).then(r => r.text()).catch(() => '');
}

// GET /api/darkpool/markets — list all available dark pool markets
router.get('/markets', (_req, res) => {
  res.json({
    markets: darkpoolMarkets.map(m => ({
      id: m.id,
      label: m.label,
      programId: m.programId,
      baseAsset: m.baseAsset,
      quoteAsset: m.quoteAsset,
      tokenProgramId: m.tokenProgramId,
      priceScale: m.priceScale,
    })),
  });
});

// GET /api/darkpool/batch — current batch info
router.get('/batch', async (_req, res) => {
  try {
    const [batchRaw, pausedRaw] = await Promise.all([
      fetchMapping('current_batch', '0u8'),
      fetchMapping('pool_paused', '0u8'),
    ]);

    const currentBatch = parseInt(safeParse(batchRaw), 10) || 1;
    const paused = pausedRaw?.includes('true') || false;

    const [approvedRaw, priceRaw, countRaw, startBlockRaw] = await Promise.all([
      fetchMapping('batch_approved', `${currentBatch}u64`),
      fetchMapping('batch_proposed_price', `${currentBatch}u64`),
      fetchMapping('batch_approval_count', `${currentBatch}u64`),
      fetchMapping('batch_start_block', `${currentBatch}u64`),
    ]);

    res.json({
      currentBatch,
      paused,
      approved: approvedRaw?.includes('true') || false,
      proposedPrice: safeParse(priceRaw),
      approvalCount: parseInt(safeParse(countRaw), 10) || 0,
      startBlock: safeParse(startBlockRaw),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dark pool batch data' });
  }
});

// GET /api/darkpool/stats — aggregate stats + oracle
router.get('/stats', async (_req, res) => {
  try {
    const [tradesRaw, volumeRaw, oraclePriceRaw, oracleRoundRaw, feeVaultRaw, feeBpsRaw] = await Promise.all([
      fetchMapping('total_trades', '0u8'),
      fetchMapping('total_volume', '0u8'),
      fetchMapping('oracle_price', '0u8'),
      fetchMapping('oracle_round', '0u8'),
      fetchMapping('fee_vault', '0u8'),
      fetchMapping('fee_bps', '0u8'),
    ]);

    res.json({
      totalTrades: safeParse(tradesRaw),
      totalVolume: safeParse(volumeRaw),
      oraclePrice: safeParse(oraclePriceRaw),
      oracleRound: safeParse(oracleRoundRaw),
      feeVault: safeParse(feeVaultRaw),
      feeBps: safeParse(feeBpsRaw),
      programId: config.darkpoolProgramId,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dark pool stats' });
  }
});

// GET /api/darkpool/twap — TWAP accumulator state
router.get('/twap', async (_req, res) => {
  try {
    const [cumPriceRaw, cumCountRaw, lastResetRaw, windowRaw, maxDevRaw] = await Promise.all([
      fetchMapping('twap_cum_price', '0u8'),
      fetchMapping('twap_cum_count', '0u8'),
      fetchMapping('twap_last_reset', '0u8'),
      fetchMapping('twap_window_blocks', '0u8'),
      fetchMapping('twap_max_deviation_bps', '0u8'),
    ]);

    const cumPrice = BigInt(safeParse(cumPriceRaw) || '0');
    const cumCount = BigInt(safeParse(cumCountRaw) || '0');
    const twap = cumCount > 0n ? (cumPrice / cumCount).toString() : '0';

    res.json({
      cumulativePrice: safeParse(cumPriceRaw),
      cumulativeCount: safeParse(cumCountRaw),
      twap,
      lastReset: safeParse(lastResetRaw),
      windowBlocks: safeParse(windowRaw),
      maxDeviationBps: safeParse(maxDevRaw),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch TWAP data' });
  }
});

// GET /api/darkpool/operators — operator addresses
router.get('/operators', async (_req, res) => {
  try {
    const [op0Raw, op1Raw, op2Raw, adminRaw] = await Promise.all([
      fetchMapping('operators', '1u8'),
      fetchMapping('operators', '2u8'),
      fetchMapping('operators', '3u8'),
      fetchMapping('operators', '0u8'),
    ]);

    res.json({
      admin: cleanAleo(adminRaw || ''),
      operator0: cleanAleo(op0Raw || ''),
      operator1: cleanAleo(op1Raw || ''),
      operator2: cleanAleo(op2Raw || ''),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch operators' });
  }
});

// GET /api/darkpool/batch/:id — fetch specific batch data (default ALEO market)
router.get('/batch/:id', async (req, res) => {
  try {
    const batchId = parseInt(req.params.id, 10);
    if (!batchId || batchId < 1) {
      res.status(400).json({ error: 'Invalid batch id' });
      return;
    }

    const [approvedRaw, priceRaw, countRaw, startBlockRaw, proposerRaw] = await Promise.all([
      fetchMapping('batch_approved', `${batchId}u64`),
      fetchMapping('batch_proposed_price', `${batchId}u64`),
      fetchMapping('batch_approval_count', `${batchId}u64`),
      fetchMapping('batch_start_block', `${batchId}u64`),
      fetchMapping('batch_proposer', `${batchId}u64`),
    ]);

    res.json({
      batch: batchId,
      approved: approvedRaw?.includes('true') || false,
      proposedPrice: safeParse(priceRaw),
      approvalCount: parseInt(safeParse(countRaw), 10) || 0,
      startBlock: safeParse(startBlockRaw),
      proposer: cleanAleo(proposerRaw || ''),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch batch data' });
  }
});

// ─── Multi-Market Routes (/:market/...) ─────────────────────────

// GET /api/darkpool/:market/batch — current batch info for a specific market
router.get('/:market/batch', async (req, res) => {
  try {
    const pid = resolveProgramId(req.params.market);
    const [batchRaw, pausedRaw] = await Promise.all([
      fetchMapping('current_batch', '0u8', pid),
      fetchMapping('pool_paused', '0u8', pid),
    ]);

    const currentBatch = parseInt(safeParse(batchRaw), 10) || 1;
    const paused = pausedRaw?.includes('true') || false;

    const [approvedRaw, priceRaw, countRaw, startBlockRaw] = await Promise.all([
      fetchMapping('batch_approved', `${currentBatch}u64`, pid),
      fetchMapping('batch_proposed_price', `${currentBatch}u64`, pid),
      fetchMapping('batch_approval_count', `${currentBatch}u64`, pid),
      fetchMapping('batch_start_block', `${currentBatch}u64`, pid),
    ]);

    res.json({
      market: req.params.market,
      programId: pid,
      currentBatch,
      paused,
      approved: approvedRaw?.includes('true') || false,
      proposedPrice: safeParse(priceRaw),
      approvalCount: parseInt(safeParse(countRaw), 10) || 0,
      startBlock: safeParse(startBlockRaw),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dark pool batch data' });
  }
});

// GET /api/darkpool/:market/stats — aggregate stats + oracle for a specific market
router.get('/:market/stats', async (req, res) => {
  try {
    const pid = resolveProgramId(req.params.market);
    const marketConfig = darkpoolMarkets.find(m => m.id === req.params.market);
    const oracleSymbol = marketConfig?.oracleSymbol ?? 'ALEO';
    const priceScale = marketConfig?.priceScale ?? 1;

    const [tradesRaw, volumeRaw, oraclePriceRaw, oracleRoundRaw, feeVaultRaw, feeBpsRaw, aggregated] = await Promise.all([
      fetchMapping('total_trades', '0u8', pid),
      fetchMapping('total_volume', '0u8', pid),
      fetchMapping('oracle_price', '0u8', pid),
      fetchMapping('oracle_round', '0u8', pid),
      fetchMapping('fee_vault', '0u8', pid),
      fetchMapping('fee_bps', '0u8', pid),
      aggregatePrices(oracleSymbol).catch(() => null),
    ]);

    res.json({
      market: req.params.market,
      totalTrades: safeParse(tradesRaw),
      totalVolume: safeParse(volumeRaw),
      oraclePrice: safeParse(oraclePriceRaw),
      oracleRound: safeParse(oracleRoundRaw),
      feeVault: safeParse(feeVaultRaw),
      feeBps: safeParse(feeBpsRaw),
      realPrice: aggregated?.medianPrice ?? 0,
      priceScale,
      programId: pid,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dark pool stats' });
  }
});

// GET /api/darkpool/:market/twap — TWAP for a specific market
router.get('/:market/twap', async (req, res) => {
  try {
    const pid = resolveProgramId(req.params.market);
    const [cumPriceRaw, cumCountRaw, lastResetRaw, windowRaw, maxDevRaw] = await Promise.all([
      fetchMapping('twap_cum_price', '0u8', pid),
      fetchMapping('twap_cum_count', '0u8', pid),
      fetchMapping('twap_last_reset', '0u8', pid),
      fetchMapping('twap_window_blocks', '0u8', pid),
      fetchMapping('twap_max_deviation_bps', '0u8', pid),
    ]);

    const cumPrice = BigInt(safeParse(cumPriceRaw) || '0');
    const cumCount = BigInt(safeParse(cumCountRaw) || '0');
    const twap = cumCount > 0n ? (cumPrice / cumCount).toString() : '0';

    res.json({
      market: req.params.market,
      cumulativePrice: safeParse(cumPriceRaw),
      cumulativeCount: safeParse(cumCountRaw),
      twap,
      lastReset: safeParse(lastResetRaw),
      windowBlocks: safeParse(windowRaw),
      maxDeviationBps: safeParse(maxDevRaw),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch TWAP data' });
  }
});

// GET /api/darkpool/:market/operators — operator addresses for a specific market
router.get('/:market/operators', async (req, res) => {
  try {
    const pid = resolveProgramId(req.params.market);
    const [op0Raw, op1Raw, op2Raw, adminRaw] = await Promise.all([
      fetchMapping('operators', '1u8', pid),
      fetchMapping('operators', '2u8', pid),
      fetchMapping('operators', '3u8', pid),
      fetchMapping('operators', '0u8', pid),
    ]);

    res.json({
      market: req.params.market,
      admin: cleanAleo(adminRaw || ''),
      operator0: cleanAleo(op0Raw || ''),
      operator1: cleanAleo(op1Raw || ''),
      operator2: cleanAleo(op2Raw || ''),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch operators' });
  }
});

export default router;
