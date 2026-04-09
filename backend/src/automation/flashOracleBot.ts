import { config } from '../utils/config.js';
import { getMappingValue, parseAleoU64 } from '../utils/aleoClient.js';
import { buildAndBroadcastTransaction } from '../utils/transactionBuilder.js';
import { aggregatePrices } from '../oracle/aggregator.js';

interface FlashOracleBotState {
  lastUpdateTimestamp: number;
  updateCount: number;
  lastPrice: number;
  lastError: string | null;
  isRunning: boolean;
}

const state: FlashOracleBotState = {
  lastUpdateTimestamp: 0,
  updateCount: 0,
  lastPrice: 0,
  lastError: null,
  isRunning: false,
};

export function getFlashOracleBotStatus() {
  return { ...state };
}

/**
 * Push oracle price to the flash loan contract.
 * Flash loans have their own oracle mapping (same as credits pattern).
 * 
 * Returns true if a transaction was submitted.
 */
export async function runFlashOracleBotCycle(): Promise<boolean> {
  if (state.isRunning) return false;
  state.isRunning = true;

  let submitted = false;

  try {
    const programId = config.flashProgramId;
    if (!programId) return false;

    // Check if flash contract is paused
    const pausedRaw = await getMappingValue('flash_paused', '0u8', programId);
    const isPaused = (pausedRaw?.replace(/["\s]/g, '') === 'true');
    if (isPaused) return false;

    // Get current on-chain price in flash contract
    const currentPriceRaw = await getMappingValue('oracle_price', '0u8', programId);
    const currentPrice = parseAleoU64(currentPriceRaw);

    // Get aggregated price  
    const aggregated = await aggregatePrices();
    if (!aggregated.medianPrice || aggregated.medianPrice <= 0) return false;

    const newPriceMicro = Math.round(aggregated.medianPrice * config.precision);

    // Only update if price deviation > 0.5%
    if (currentPrice > 0) {
      const deviation = Math.abs(newPriceMicro - currentPrice) / currentPrice;
      if (deviation < 0.005) return false;
    }

    // Get current round
    const roundRaw = await getMappingValue('price_round', '0u8', programId);
    const currentRound = parseAleoU64(roundRaw) || 0;
    const nextRound = currentRound + 1;

    console.log(`[flash-oracle-bot] Updating flash oracle: $${aggregated.medianPrice.toFixed(4)} (round ${nextRound})`);

    const tx = await buildAndBroadcastTransaction(
      programId,
      'update_oracle_price',
      [`${newPriceMicro}u64`, `${nextRound}u64`],
    );

    if (tx) {
      state.lastUpdateTimestamp = Date.now();
      state.updateCount++;
      state.lastPrice = newPriceMicro;
      submitted = true;
      console.log(`[flash-oracle-bot] Price updated: ${tx}`);
    }
  } catch (err) {
    const msg = `Flash oracle bot cycle failed: ${err}`;
    console.error(`[flash-oracle-bot] ${msg}`);
    state.lastError = msg;
  } finally {
    state.isRunning = false;
  }

  return submitted;
}
