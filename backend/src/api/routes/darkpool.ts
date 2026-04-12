import { Router } from 'express';
import { config, darkpoolMarkets } from '../../utils/config.js';
import { aggregatePrices } from '../../oracle/aggregator.js';
import { buildAndBroadcastTransaction } from '../../utils/transactionBuilder.js';
import { getTransaction } from '../../utils/aleoClient.js';

const router = Router();

// ─── Order Relay (bypasses Shield Wallet constructor parsing bug) ───

const USDCX_PROGRAM = 'test_usdcx_stablecoin.aleo';
const PRECISION = 1_000_000;

// Freeze list non-inclusion proof (same constant as frontend)
const FREEZE_LIST_PROOF = `[{siblings: [0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field], leaf_index: 1u32}, {siblings: [0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field], leaf_index: 1u32}]`;

// Serialize requests to prevent DPS nonce conflicts
let orderQueue: Promise<unknown> = Promise.resolve();

// SDK cache for record decryption
let _sdkCache: typeof import('@provablehq/sdk') | null = null;
async function getOrderSdk() {
  if (!_sdkCache) _sdkCache = await import('@provablehq/sdk');
  return _sdkCache;
}

function orderSleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Poll a transaction until confirmed, then decrypt a record output.
 * USDCx: [ComplianceRecord, Token] → index 1
 * Test tokens / credits: [Token] → index 0
 */
async function waitForRecordFromTx(
  txId: string,
  tokenProgram: string,
  recordIndex: number,
): Promise<string> {
  const sdk = await getOrderSdk();
  const account = new sdk.Account({ privateKey: config.privateKey });

  for (let i = 0; i < 90; i++) {
    await orderSleep(5000);
    const tx = await getTransaction(txId);
    if (!tx) continue;

    const execution = (tx as any).execution;
    if (!execution?.transitions) continue;

    for (const transition of execution.transitions) {
      if (transition.program !== tokenProgram) continue;
      const records = (transition.outputs || []).filter((o: any) => o.type === 'record');
      if (records.length > recordIndex) {
        try {
          const plaintext = (account as any).decryptRecord(records[recordIndex].value);
          console.log(`[dp-order] Decrypted record from ${tokenProgram}`);
          return String(plaintext);
        } catch {
          // Try all outputs as fallback
          for (let ri = 0; ri < records.length; ri++) {
            if (ri === recordIndex) continue;
            try {
              const pt = String((account as any).decryptRecord(records[ri].value));
              if (pt.includes('amount')) return pt;
            } catch { /* skip */ }
          }
        }
      }
    }
  }
  throw new Error(`Timed out waiting for record from tx ${txId}`);
}

// POST /api/darkpool/order — submit buy/sell order via backend relay
router.post('/order', async (req, res) => {
  try {
    const { market, direction, amount, limitPrice } = req.body as {
      market?: string;
      direction?: string;
      amount?: number;
      limitPrice?: number;
    };

    if (!market || !direction || !amount || amount <= 0) {
      res.status(400).json({ error: 'Required: market, direction (buy|sell), amount (> 0)' });
      return;
    }
    if (direction !== 'buy' && direction !== 'sell') {
      res.status(400).json({ error: 'direction must be "buy" or "sell"' });
      return;
    }
    if (!Number.isFinite(amount) || amount > 1e15) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    const mkt = darkpoolMarkets.find(m => m.id === market);
    if (!mkt) {
      res.status(400).json({ error: `Invalid market. Options: ${darkpoolMarkets.map(m => m.id).join(', ')}` });
      return;
    }

    const limit = limitPrice && Number.isFinite(limitPrice) && limitPrice > 0 ? Math.floor(limitPrice) : 0;
    console.log(`[dp-order] ${direction.toUpperCase()} ${amount} on ${market}, limit=${limit}`);

    const result = await new Promise<{ orderTxId: string; recordTxId: string }>((resolve, reject) => {
      orderQueue = orderQueue
        .then(() => processOrder(mkt, direction as 'buy' | 'sell', Math.floor(amount), limit))
        .then(resolve)
        .catch(reject);
    });

    res.json({ ...result, status: 'submitted' });
  } catch (err: any) {
    console.error('[dp-order] Failed:', err);
    res.status(500).json({ error: err?.message || 'Order submission failed' });
  }
});

async function processOrder(
  market: typeof darkpoolMarkets[0],
  direction: 'buy' | 'sell',
  microAmount: number,
  limitPriceMicro: number,
): Promise<{ orderTxId: string; recordTxId: string }> {
  const nonce = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

  if (direction === 'buy') {
    // Buy: lock USDCx → need private USDCx Token record
    const effectiveLimit = limitPriceMicro > 0 ? limitPriceMicro : 50_000_000;
    const lockAmount = Math.ceil((microAmount * effectiveLimit) / PRECISION);
    const recordAmount = lockAmount + Math.max(Math.ceil(lockAmount * 0.05), 100_000);

    console.log(`[dp-order] Creating USDCx record: ${recordAmount} (lock=${lockAmount})`);
    const recordTxId = await buildAndBroadcastTransaction(
      USDCX_PROGRAM, 'transfer_public_to_private',
      [config.adminAddress, `${recordAmount}u128`], 500_000,
    );
    if (!recordTxId) throw new Error('Failed to create USDCx record');

    const recordPlaintext = await waitForRecordFromTx(recordTxId, USDCX_PROGRAM, 1);

    console.log(`[dp-order] Submitting buy on ${market.programId}...`);
    const orderTxId = await buildAndBroadcastTransaction(
      market.programId, 'submit_buy_order',
      [recordPlaintext, FREEZE_LIST_PROOF, `${microAmount}u128`,
       `${limitPriceMicro}u64`, '999999999u32', config.adminAddress, `${nonce}field`],
      500_000,
    );
    if (!orderTxId) throw new Error('Buy order DPS failed');
    return { orderTxId, recordTxId };

  } else {
    // Sell: lock base token → need private token record
    console.log(`[dp-order] Creating ${market.baseAsset} record: ${microAmount}`);
    const recordTxId = await buildAndBroadcastTransaction(
      market.tokenProgramId, 'transfer_public_to_private',
      [config.adminAddress, `${microAmount}u64`], 500_000,
    );
    if (!recordTxId) throw new Error(`Failed to create ${market.baseAsset} record`);

    const recordPlaintext = await waitForRecordFromTx(recordTxId, market.tokenProgramId, 0);

    console.log(`[dp-order] Submitting sell on ${market.programId}...`);
    const orderTxId = await buildAndBroadcastTransaction(
      market.programId, 'submit_sell_order',
      [recordPlaintext, `${microAmount}u64`, `${limitPriceMicro}u64`,
       '999999999u32', config.adminAddress, `${nonce}field`],
      500_000,
    );
    if (!orderTxId) throw new Error('Sell order DPS failed');
    return { orderTxId, recordTxId };
  }
}

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
