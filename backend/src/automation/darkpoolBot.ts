import { config, darkpoolMarkets, type DarkPoolMarketConfig } from '../utils/config.js';
import { getMappingValue, parseAleoU64, getLatestBlockHeight } from '../utils/aleoClient.js';
import { buildAndBroadcastTransaction } from '../utils/transactionBuilder.js';
import { aggregatePrices } from '../oracle/aggregator.js';

// ─── Multi-Market Batch-Based Dark Pool Bot ─────────────────────
// Flow per tick per market:
//   1. update_oracle_price  — push fresh price + TWAP accumulator
//      Price is clamped to ±14% per step for gradual convergence
//      when on-chain seed diverges from real market price.
//   2–4: Settlement steps (propose/approve/advance) DISABLED —
//      single-key bot cannot complete 2-of-3 operator approval.
//      approve_settlement requires a DIFFERENT operator from the
//      proposer; re-enable when multi-key setup is deployed.

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

// Oracle timing: 5 min normal, 60s catch-up when price deviation > 50%
const MIN_ORACLE_INTERVAL_MS      = 300_000;  // 5 min between oracle updates per market
const CATCHUP_ORACLE_INTERVAL_MS  =  60_000;  // 60s when price needs rapid convergence
const CATCHUP_DEVIATION_THRESHOLD =    0.50;  // 50% deviation triggers catch-up mode
const MAX_PRICE_MOVE_RATIO        =    0.14;  // 14% max per step (contract allows 15%)

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

    // Steps 2–4 disabled: single-key bot cannot complete 2-of-3 approval.
    // approve_settlement rejects when caller === proposer (operator_approved_batch hash collision).
    // Re-enable when multi-key operator setup is deployed.

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

  console.log(`${tag} Approving batch ${currentBatch} at price ${proposedPrice}`);

  const tx = await buildAndBroadcastTransaction(
    programId,
    'approve_settlement',
    [`${currentBatch}u64`, `${proposedPrice}u64`],
  );

  if (tx) {
    state.lastApprovalTimestamp = Date.now();
    console.log(`${tag} Batch ${currentBatch} approved: ${tx}`);
    return true;
  }
  return false;
}

// ─── Step 4: Advance to next batch ──────────────────────────────
async function stepAdvanceBatch(programId: string, state: DarkPoolBotState, tag: string): Promise<boolean> {
  const batchRaw = await getMappingValue('current_batch', '0u8', programId);
  const currentBatch = parseAleoU64(batchRaw) || 1;

  // Only advance if current batch is approved
  const approvedRaw = await getMappingValue('batch_approved', `${currentBatch}u64`, programId);
  if (approvedRaw?.replace(/["\s]/g, '') !== 'true') return false;

  console.log(`${tag} Advancing from batch ${currentBatch} to ${currentBatch + 1}`);

  const tx = await buildAndBroadcastTransaction(
    programId,
    'advance_batch',
    [`${currentBatch}u64`],
  );

  if (tx) {
    state.lastAdvanceTimestamp = Date.now();
    state.currentBatch = currentBatch + 1;
    console.log(`${tag} Advanced to batch ${currentBatch + 1}: ${tx}`);
    return true;
  }
  return false;
}
