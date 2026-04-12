import { config, darkpoolMarkets, type DarkPoolMarketConfig } from '../utils/config.js';
import { getMappingValue, parseAleoU64, getLatestBlockHeight, getTransaction } from '../utils/aleoClient.js';
import { buildAndBroadcastTransaction } from '../utils/transactionBuilder.js';
import { aggregatePrices } from '../oracle/aggregator.js';

// ─── Multi-Market Batch-Based Dark Pool Bot ─────────────────────
// Flow per tick per market:
//   1. update_oracle_price  — push fresh price + TWAP accumulator
//   2. propose_settlement   — propose batch settlement at oracle price (operator 1)
//   3. approve_settlement   — confirm with 2nd operator key (operator 2)
//   4. execute_match         — match buy/sell orders from approved batch
//   5. advance_batch         — move to next batch after matches executed

export interface DarkPoolBotState {
  lastOracleUpdateTimestamp: number;
  lastProposalTimestamp: number;
  lastApprovalTimestamp: number;
  lastAdvanceTimestamp: number;
  oracleRound: number;
  lastSubmittedRound: number;
  catchUpMode: boolean;
  currentBatch: number;
  settlementCount: number;
  lastError: string | null;
  isRunning: boolean;
}

// ─── Order Auth Record Tracking ─────────────────────────────────
// Tracks OrderAuth records for execute_match. Records are decrypted
// from on-chain transactions reported by the frontend or scanned.

export interface TrackedOrder {
  txId: string;
  programId: string;
  direction: 'buy' | 'sell';      // 0=buy, 1=sell
  trader: string;                  // user address
  recordPlaintext: string | null;  // decrypted OrderAuth record string (null = pending)
  orderId: string | null;          // order_id field
  size: number;
  limitPrice: number;
  batchId: number;
  matched: boolean;
  createdAt: number;
}

// Per-market order store (in-memory)
const pendingOrders: Map<string, TrackedOrder[]> = new Map();

// SDK cache for record decryption
let sdkModule: typeof import('@provablehq/sdk') | null = null;
async function getSdkModule() {
  if (!sdkModule) sdkModule = await import('@provablehq/sdk');
  return sdkModule;
}

/**
 * Register an order for tracking (called by API route when frontend reports an order).
 */
export function registerOrder(
  txId: string,
  programId: string,
  direction: 'buy' | 'sell',
  trader: string,
  size: number,
  limitPrice: number,
): void {
  const market = darkpoolMarkets.find(m => m.programId === programId);
  const marketId = market?.id || programId;
  if (!pendingOrders.has(marketId)) pendingOrders.set(marketId, []);
  const list = pendingOrders.get(marketId)!;

  // Avoid duplicates
  if (list.some(o => o.txId === txId)) return;

  list.push({
    txId, programId, direction, trader,
    recordPlaintext: null, orderId: null,
    size, limitPrice, batchId: 0,
    matched: false, createdAt: Date.now(),
  });
  console.log(`[dp-bot] Registered ${direction} order ${txId} on ${marketId}`);
}

/**
 * Try to decrypt OrderAuth records from pending (unresolved) orders.
 */
async function resolveOrderRecords(marketId: string): Promise<void> {
  const orders = pendingOrders.get(marketId);
  if (!orders) return;

  const unresolved = orders.filter(o => !o.recordPlaintext);
  if (unresolved.length === 0) return;

  const sdk = await getSdkModule();
  const account = new sdk.Account({ privateKey: config.privateKey });

  for (const order of unresolved) {
    try {
      const tx = await getTransaction(order.txId);
      if (!tx) continue; // TX not yet confirmed

      const execution = (tx as any).execution;
      if (!execution?.transitions) continue;

      for (const transition of execution.transitions) {
        if (transition.program !== order.programId) continue;
        const records = (transition.outputs || []).filter((o: any) => o.type === 'record');

        for (const rec of records) {
          try {
            const plaintext = String((account as any).decryptRecord(rec.value));
            // OrderAuth records contain "trader:" field, OrderCommitment has "batch_id:"
            if (plaintext.includes('trader:') && plaintext.includes('order_id:')) {
              order.recordPlaintext = plaintext;

              // Parse fields from plaintext
              const orderIdMatch = plaintext.match(/order_id:\s*(\S+?)\.private/);
              if (orderIdMatch) order.orderId = orderIdMatch[1];

              console.log(`[dp-bot] Resolved OrderAuth for ${order.direction} order ${order.txId}`);
              break;
            }
          } catch { /* not our record, skip */ }
        }
        if (order.recordPlaintext) break;
      }
    } catch (err) {
      console.warn(`[dp-bot] Failed to resolve order ${order.txId}:`, err);
    }
  }
}

// Per-market state tracking
const marketStates: Map<string, DarkPoolBotState> = new Map();

function getOrCreateState(marketId: string): DarkPoolBotState {
  let s = marketStates.get(marketId);
  if (!s) {
    s = {
      lastOracleUpdateTimestamp: 0,
      lastProposalTimestamp: 0,
      lastApprovalTimestamp: 0,
      lastAdvanceTimestamp: 0,
      oracleRound: 0,
      lastSubmittedRound: 0,
      catchUpMode: false,
      currentBatch: 1,
      settlementCount: 0,
      lastError: null,
      isRunning: false,
    };
    marketStates.set(marketId, s);
  }
  return s;
}

// Oracle timing: 5 min normal, 15s catch-up when price deviation > 20%
const MIN_ORACLE_INTERVAL_MS      = 300_000;  // 5 min between oracle updates per market
const CATCHUP_ORACLE_INTERVAL_MS  =  15_000;  // 15s when price needs rapid convergence
const CATCHUP_DEVIATION_THRESHOLD =    0.20;  // 20% deviation triggers catch-up mode
const MAX_PRICE_MOVE_RATIO        =    0.145; // 14.5% max per step (contract allows 15%)

export function getDarkPoolBotStatus() {
  const perMarket: Record<string, DarkPoolBotState> = {};
  for (const market of darkpoolMarkets) {
    perMarket[market.id] = { ...getOrCreateState(market.id) };
  }
  return perMarket;
}

/**
 * Run one dark pool bot cycle across ALL markets sequentially.
 * Processes every market in a single tick — DPS handles nonces server-side,
 * and sequential awaits prevent conflicts.
 * Returns true if any transaction was submitted.
 */
export async function runDarkPoolBotCycle(): Promise<boolean> {
  let anySubmitted = false;

  for (const market of darkpoolMarkets) {
    const submitted = await runSingleMarketCycle(market);
    if (submitted) anySubmitted = true;
  }

  return anySubmitted;
}

/**
 * Run one dark pool bot cycle for a single market.
 */
async function runSingleMarketCycle(market: DarkPoolMarketConfig): Promise<boolean> {
  const state = getOrCreateState(market.id);
  if (state.isRunning) return false;
  state.isRunning = true;

  let submitted = false;
  const tag = `[dp-bot:${market.id}]`;

  try {
    const programId = market.programId;
    if (!programId) return false;

    // Check if dark pool is paused
    const pausedRaw = await getMappingValue('pool_paused', '0u8', programId);
    if (pausedRaw?.replace(/["\s]/g, '') === 'true') {
      console.log(`${tag} Pool paused, skipping`);
      return false;
    }

    // ─── Step 1: Oracle Price Update ──────────────────────────
    const oracleSubmitted = await stepOracleUpdate(programId, market, state, tag);
    if (oracleSubmitted) submitted = true;

    // ─── Step 2: Propose Settlement ──────────────────────────
    if (!oracleSubmitted) { // Only attempt if no oracle TX this tick (avoid nonce conflicts)
      const proposed = await stepProposeSettlement(programId, state, tag);
      if (proposed) { submitted = true; }
      else {
        // ─── Step 3: Approve Settlement (2nd operator key) ──────
        const approved = await stepApproveSettlement(programId, state, tag);
        if (approved) { submitted = true; }
        else {
          // ─── Step 4: Execute Matches ──────────────────────────
          const market_ = darkpoolMarkets.find(m => m.programId === programId);
          if (market_) {
            const matched = await stepExecuteMatch(programId, market_.id, state, tag);
            if (matched) { submitted = true; }
            else {
              // ─── Step 5: Advance Batch ──────────────────────────
              const advanced = await stepAdvanceBatch(programId, state, tag);
              if (advanced) submitted = true;
            }
          }
        }
      }
    }

  } catch (err) {
    const msg = `${tag} cycle failed: ${err}`;
    console.error(msg);
    state.lastError = msg;
  } finally {
    state.isRunning = false;
  }

  return submitted;
}

// ─── Step 1: Push oracle price + TWAP (with convergence clamping) ──
async function stepOracleUpdate(programId: string, market: DarkPoolMarketConfig, state: DarkPoolBotState, tag: string): Promise<boolean> {
  const now = Date.now();

  // Adaptive interval: 60s in catch-up mode, 5 min normal
  const interval = state.catchUpMode ? CATCHUP_ORACLE_INTERVAL_MS : MIN_ORACLE_INTERVAL_MS;
  if (now - state.lastOracleUpdateTimestamp < interval) return false;

  const aggregated = await aggregatePrices(market.oracleSymbol);
  if (!aggregated.medianPrice || aggregated.medianPrice <= 0) return false;

  // Get current round from chain
  const roundRaw = await getMappingValue('oracle_round', '0u8', programId);
  const currentRound = parseAleoU64(roundRaw) || 0;
  const nextRound = currentRound + 1;

  // Skip if we already submitted this round (TX still pending confirmation)
  if (state.lastSubmittedRound >= nextRound) {
    console.log(`${tag} Round ${nextRound} already submitted, waiting for confirmation`);
    return false;
  }

  // Calculate target price
  const targetPrice = Math.round(aggregated.medianPrice * market.precision / market.priceScale);

  // Get current on-chain price for convergence clamping
  const priceRaw = await getMappingValue('oracle_price', '0u8', programId);
  const currentOnChainPrice = parseAleoU64(priceRaw) || 0;

  let priceMicro = targetPrice;

  // Clamp to ±14% if on-chain price exists (gradual convergence)
  if (currentOnChainPrice > 0) {
    const deviation = Math.abs(targetPrice - currentOnChainPrice) / currentOnChainPrice;

    if (deviation > MAX_PRICE_MOVE_RATIO) {
      // Clamp to 14% move toward target
      priceMicro = targetPrice > currentOnChainPrice
        ? Math.round(currentOnChainPrice * (1 + MAX_PRICE_MOVE_RATIO))
        : Math.round(currentOnChainPrice * (1 - MAX_PRICE_MOVE_RATIO));

      console.log(`${tag} Price convergence: on-chain ${currentOnChainPrice} → target ${targetPrice} (${(deviation * 100).toFixed(1)}% off), clamped to ${priceMicro}`);

      // Enter catch-up mode if deviation > 50%
      state.catchUpMode = deviation > CATCHUP_DEVIATION_THRESHOLD;
    } else {
      // Within 14% — push exact target, exit catch-up mode
      state.catchUpMode = false;
    }
  }

  // Clamp to valid range
  priceMicro = Math.max(1, Math.min(priceMicro, 100_000_000));

  console.log(`${tag} Updating oracle: $${aggregated.medianPrice.toFixed(4)} → scaled ${priceMicro}u64 (÷${market.priceScale}, round ${nextRound}${state.catchUpMode ? ', CATCH-UP' : ''})`);

  const tx = await buildAndBroadcastTransaction(
    programId,
    'update_oracle_price',
    [`${priceMicro}u64`, `${nextRound}u64`],
  );

  if (tx) {
    state.lastOracleUpdateTimestamp = now;
    state.oracleRound = nextRound;
    state.lastSubmittedRound = nextRound;
    console.log(`${tag} Oracle updated: ${tx}`);
    return true;
  }
  return false;
}

// ─── Step 2: Propose settlement price for current batch ─────────
async function stepProposeSettlement(programId: string, state: DarkPoolBotState, tag: string): Promise<boolean> {
  const batchRaw = await getMappingValue('current_batch', '0u8', programId);
  const currentBatch = parseAleoU64(batchRaw) || 1;
  state.currentBatch = currentBatch;

  // Check if batch already approved
  const approvedRaw = await getMappingValue('batch_approved', `${currentBatch}u64`, programId);
  if (approvedRaw?.replace(/["\s]/g, '') === 'true') return false;

  // Check if already proposed (has a proposer)
  const proposerRaw = await getMappingValue('batch_proposer', `${currentBatch}u64`, programId);
  if (proposerRaw && !proposerRaw.includes('null') && !proposerRaw.includes('NOT_FOUND')) {
    return false; // Already proposed, skip to approval step
  }

  // Check if batch is mature (min_batch_blocks elapsed)
  const startBlockRaw = await getMappingValue('batch_start_block', `${currentBatch}u64`, programId);
  const startBlock = parseAleoU64(startBlockRaw);
  const minBlocksRaw = await getMappingValue('min_batch_blocks', '0u8', programId);
  const minBlocks = parseAleoU64(minBlocksRaw) || 100;

  const currentBlock = await getLatestBlockHeight();
  if (!currentBlock) return false;
  if (startBlock > 0 && currentBlock - startBlock < minBlocks) {
    console.log(`${tag} Batch ${currentBatch} not mature (block ${currentBlock}, need ${startBlock + minBlocks})`);
    return false;
  }

  // Use oracle price as proposed settlement price
  const priceRaw = await getMappingValue('oracle_price', '0u8', programId);
  const oraclePrice = parseAleoU64(priceRaw);
  if (!oraclePrice || oraclePrice <= 0) {
    console.log(`${tag} No oracle price set, cannot propose`);
    return false;
  }

  console.log(`${tag} Proposing settlement for batch ${currentBatch} at price ${oraclePrice}`);

  const tx = await buildAndBroadcastTransaction(
    programId,
    'propose_settlement',
    [`${currentBatch}u64`, `${oraclePrice}u64`],
  );

  if (tx) {
    state.lastProposalTimestamp = Date.now();
    state.settlementCount++;
    console.log(`${tag} Batch ${currentBatch} proposed: ${tx}`);
    return true;
  }
  return false;
}

// ─── Step 3: Approve settlement (2nd operator confirms) ─────────
async function stepApproveSettlement(programId: string, state: DarkPoolBotState, tag: string): Promise<boolean> {
  if (!config.operator2PrivateKey) {
    console.log(`${tag} No OPERATOR2_PRIVATE_KEY configured, skipping approval`);
    return false;
  }

  const batchRaw = await getMappingValue('current_batch', '0u8', programId);
  const currentBatch = parseAleoU64(batchRaw) || 1;

  // Check if already fully approved
  const approvedRaw = await getMappingValue('batch_approved', `${currentBatch}u64`, programId);
  if (approvedRaw?.replace(/["\s]/g, '') === 'true') return false;

  // Check approval count — need to approve if count is 1 (proposed but not confirmed)
  const countRaw = await getMappingValue('batch_approval_count', `${currentBatch}u64`, programId);
  const approvalCount = parseAleoU64(countRaw);
  if (approvalCount < 1) return false; // Not yet proposed
  if (approvalCount >= 2) return false; // Already has 2 approvals

  // Get proposed price
  const priceRaw = await getMappingValue('batch_proposed_price', `${currentBatch}u64`, programId);
  const proposedPrice = parseAleoU64(priceRaw);
  if (!proposedPrice) return false;

  console.log(`${tag} Approving batch ${currentBatch} at price ${proposedPrice} (operator 2)`);

  const tx = await buildAndBroadcastTransaction(
    programId,
    'approve_settlement',
    [`${currentBatch}u64`, `${proposedPrice}u64`],
    500_000,
    config.operator2PrivateKey,  // Use 2nd operator key — different from proposer
  );

  if (tx) {
    state.lastApprovalTimestamp = Date.now();
    console.log(`${tag} Batch ${currentBatch} approved: ${tx}`);
    return true;
  }
  return false;
}

// ─── Step 4: Execute matches for approved batch ─────────────────
async function stepExecuteMatch(programId: string, marketId: string, state: DarkPoolBotState, tag: string): Promise<boolean> {
  const batchRaw = await getMappingValue('current_batch', '0u8', programId);
  const currentBatch = parseAleoU64(batchRaw) || 1;

  // Only execute matches if batch is approved
  const approvedRaw = await getMappingValue('batch_approved', `${currentBatch}u64`, programId);
  if (approvedRaw?.replace(/["\s]/g, '') !== 'true') return false;

  // Resolve any pending order records
  await resolveOrderRecords(marketId);

  const orders = pendingOrders.get(marketId);
  if (!orders || orders.length === 0) return false;

  // Get clearing price (the approved proposed price)
  const priceRaw = await getMappingValue('batch_proposed_price', `${currentBatch}u64`, programId);
  const clearingPrice = parseAleoU64(priceRaw);
  if (!clearingPrice) return false;

  // Find unmatched buy and sell orders with resolved record plaintexts
  const buys = orders.filter(o =>
    o.direction === 'buy' && !o.matched && o.recordPlaintext &&
    o.limitPrice >= clearingPrice);
  const sells = orders.filter(o =>
    o.direction === 'sell' && !o.matched && o.recordPlaintext &&
    o.limitPrice <= clearingPrice);

  if (buys.length === 0 || sells.length === 0) {
    if (buys.length === 0 && sells.length === 0) return false; // No orders at all
    console.log(`${tag} Batch ${currentBatch}: ${buys.length} buys, ${sells.length} sells (need both)`);
    return false;
  }

  // Match the first available buy with the first available sell
  const buy = buys[0];
  const sell = sells[0];

  console.log(`${tag} Executing match: buy ${buy.txId.slice(0, 12)} vs sell ${sell.txId.slice(0, 12)} at price ${clearingPrice}`);

  const tx = await buildAndBroadcastTransaction(
    programId,
    'execute_match',
    [
      buy.recordPlaintext!,
      sell.recordPlaintext!,
      `${clearingPrice}u64`,
      `${currentBatch}u64`,
      buy.trader,
      sell.trader,
    ],
    800_000, // Higher fee for execute_match (cross-program calls)
  );

  if (tx) {
    buy.matched = true;
    sell.matched = true;
    state.settlementCount++;
    console.log(`${tag} Match executed: ${tx}`);
    return true;
  }
  return false;
}

// ─── Step 5: Advance to next batch ──────────────────────────────
async function stepAdvanceBatch(programId: string, state: DarkPoolBotState, tag: string): Promise<boolean> {
  const batchRaw = await getMappingValue('current_batch', '0u8', programId);
  const currentBatch = parseAleoU64(batchRaw) || 1;

  // Only advance if current batch is approved
  const approvedRaw = await getMappingValue('batch_approved', `${currentBatch}u64`, programId);
  if (approvedRaw?.replace(/["\s]/g, '') !== 'true') return false;

  // Check if there are unmatched orders that still need execution
  const market = darkpoolMarkets.find(m => m.programId === programId);
  if (market) {
    const orders = pendingOrders.get(market.id);
    if (orders) {
      const unmatched = orders.filter(o => !o.matched && o.recordPlaintext);
      const unmatchedBuys = unmatched.filter(o => o.direction === 'buy').length;
      const unmatchedSells = unmatched.filter(o => o.direction === 'sell').length;
      // Don't advance if there are matchable pairs waiting
      if (unmatchedBuys > 0 && unmatchedSells > 0) {
        console.log(`${tag} Skipping advance — ${unmatchedBuys} buys and ${unmatchedSells} sells still need matching`);
        return false;
      }
    }
  }

  console.log(`${tag} Advancing from batch ${currentBatch} to ${currentBatch + 1}`);

  const tx = await buildAndBroadcastTransaction(
    programId,
    'advance_batch',
    [`${currentBatch}u64`],
  );

  if (tx) {
    state.lastAdvanceTimestamp = Date.now();
    state.currentBatch = currentBatch + 1;

    // Clean up matched orders from the completed batch
    if (market) {
      const orders = pendingOrders.get(market.id);
      if (orders) {
        const kept = orders.filter(o => !o.matched);
        pendingOrders.set(market.id, kept);
      }
    }

    console.log(`${tag} Advanced to batch ${currentBatch + 1}: ${tx}`);
    return true;
  }
  return false;
}

/**
 * Get tracked orders for a specific market (used by API).
 */
export function getTrackedOrders(marketId: string): TrackedOrder[] {
  return pendingOrders.get(marketId) || [];
}
