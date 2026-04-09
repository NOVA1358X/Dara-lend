import { config } from '../utils/config.js';
import { getMappingValue, parseAleoU64 } from '../utils/aleoClient.js';
import { aggregatePrices, type AggregatedPrice } from './aggregator.js';
import { buildAndBroadcastTransaction } from '../utils/transactionBuilder.js';

const PRECISION = config.precision;

interface OracleBotState {
  lastPushTimestamp: number;
  lastPushRound: number;
  lastPushPrice: number;
  pushCount: number;
  lastError: string | null;
  isRunning: boolean;
}

const state: OracleBotState = {
  lastPushTimestamp: 0,
  lastPushRound: 0,
  lastPushPrice: 0,
  pushCount: 0,
  lastError: null,
  isRunning: false,
};

export function getOracleBotStatus() {
  return { ...state };
}

/**
 * Evaluate whether an oracle price push is needed, and if so, execute it.
 * Called by the orchestrator on each tick.
 *
 * Returns true if a transaction was submitted.
 */
export async function runOracleBotCycle(): Promise<boolean> {
  if (state.isRunning) return false;
  state.isRunning = true;

  try {
    // 1. Aggregate from 5 external sources
    const aggregation = await aggregatePrices();

    if (aggregation.confidence === 'none') {
      console.warn('[oracle-bot] No sources available, skipping push');
      return false;
    }

    if (aggregation.confidence === 'low') {
      console.warn('[oracle-bot] Low confidence (1 source), proceeding with caution');
      // 1 source is still acceptable for testnet — Coinbase alone is authoritative
    }

    // 2. Read current on-chain state
    const [priceRaw, roundRaw] = await Promise.all([
      getMappingValue('oracle_price', '0u8'),
      getMappingValue('price_round', '0u8'),
    ]);
    const onChainPrice = parseAleoU64(priceRaw);
    const onChainRound = parseAleoU64(roundRaw);

    // 3. Check cooldown
    const timeSincePush = Date.now() - state.lastPushTimestamp;
    if (timeSincePush < config.oraclePushCooldown) {
      return false;
    }

    // 4. Decide whether to push
    const newPriceMicro = Math.round(aggregation.medianPrice * PRECISION);
    const priceDelta = onChainPrice > 0
      ? Math.abs(newPriceMicro - onChainPrice) / onChainPrice
      : 1; // Always push if no on-chain price

    const isStale = timeSincePush > config.oracleStaleThreshold;
    const significantChange = priceDelta >= config.priceChangeThreshold;

    if (!significantChange && !isStale) {
      return false;
    }

    // 5. Push ALEO price (token_id = 0) to main contract
    const nextRound = onChainRound + 1;
    const reason = isStale ? 'stale' : `delta ${(priceDelta * 100).toFixed(3)}%`;
    console.log(
      `[oracle-bot] Pushing ALEO price $${aggregation.medianPrice.toFixed(4)} ` +
      `(${newPriceMicro}u64) round ${nextRound} (${reason})`,
    );

    const txId = await buildAndBroadcastTransaction(
      config.programId,
      'update_oracle_price',
      [`0u8`, `${newPriceMicro}u64`, `${nextRound}u64`],
      500_000,
    );

    if (txId) {
      state.lastPushTimestamp = Date.now();
      state.lastPushRound = nextRound;
      state.lastPushPrice = newPriceMicro;
      state.pushCount++;
      state.lastError = null;
      console.log(`[oracle-bot] Price pushed → ${txId}`);

      // Also push ALEO price to credits contract (it has its own oracle_price mapping)
      // borrow_credits finalize asserts current_aleo_price == credits oracle_price[0u8]
      try {
        const creditsRoundRaw = await getMappingValue('price_round', '0u8', config.creditsProgramId);
        const creditsRound = parseAleoU64(creditsRoundRaw) + 1;
        const creditsTxId = await buildAndBroadcastTransaction(
          config.creditsProgramId,
          'update_oracle_price',
          [`0u8`, `${newPriceMicro}u64`, `${creditsRound}u64`],
          500_000,
        );
        if (creditsTxId) {
          console.log(`[oracle-bot] Credits contract price synced → ${creditsTxId}`);
        } else {
          console.warn('[oracle-bot] Credits oracle push returned null (non-fatal)');
        }
      } catch (creditsErr) {
        console.warn('[oracle-bot] Credits oracle push failed (non-fatal):', creditsErr);
      }

      return true;
    }

    state.lastError = 'Transaction broadcast returned null';
    return false;
  } catch (err) {
    state.lastError = String(err);
    console.error('[oracle-bot] Cycle failed:', err);
    return false;
  } finally {
    state.isRunning = false;
  }
}
