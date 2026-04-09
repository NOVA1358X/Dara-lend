import { config } from '../utils/config.js';
import { getMappingValue, parseAleoU64, getLatestBlockHeight } from '../utils/aleoClient.js';
import { buildAndBroadcastTransaction } from '../utils/transactionBuilder.js';
import { aggregatePrices } from '../oracle/aggregator.js';

interface DarkPoolBotState {
  lastSettlementTimestamp: number;
  settlementCount: number;
  lastEpoch: number;
  lastError: string | null;
  isRunning: boolean;
}

const state: DarkPoolBotState = {
  lastSettlementTimestamp: 0,
  settlementCount: 0,
  lastEpoch: 0,
  lastError: null,
  isRunning: false,
};

const EPOCH_DURATION_BLOCKS = 100;

export function getDarkPoolBotStatus() {
  return { ...state };
}

/**
 * Run one dark pool settlement cycle.
 * Checks current epoch, determines if it's ready for settlement,
 * then calls settle_epoch with oracle mid-price.
 *
 * Returns true if a transaction was submitted.
 */
export async function runDarkPoolBotCycle(): Promise<boolean> {
  if (state.isRunning) return false;
  state.isRunning = true;

  let submitted = false;

  try {
    const programId = config.darkpoolProgramId;
    if (!programId) return false;

    // Check if dark pool is paused
    const pausedRaw = await getMappingValue('darkpool_paused', '0u8', programId);
    const isPaused = (pausedRaw?.replace(/["\s]/g, '') === 'true');
    if (isPaused) {
      console.log('[darkpool-bot] Dark pool paused, skipping');
      return false;
    }

    // Get current epoch
    const epochRaw = await getMappingValue('current_epoch', '0u8', programId);
    const currentEpoch = parseAleoU64(epochRaw) || 1;

    // Check if epoch is already settled
    const settledRaw = await getMappingValue('epoch_settled', `${currentEpoch}u64`, programId);
    const isSettled = (settledRaw?.replace(/["\s]/g, '') === 'true');
    if (isSettled) {
      console.log(`[darkpool-bot] Epoch ${currentEpoch} already settled`);
      return false;
    }

    // Check epoch start block and current block height to determine if epoch is mature
    const epochStartRaw = await getMappingValue('epoch_start_block', `${currentEpoch}u64`, programId);
    const epochStartBlock = parseAleoU64(epochStartRaw);
    const currentBlock = await getLatestBlockHeight();

    if (!currentBlock) return false;

    // epoch_start_block is only written by settle_epoch for the NEXT epoch.
    // The very first epoch (epoch 1) has no start_block — treat it as immediately
    // mature once it has volume, because the constructor didn't set it.
    if (epochStartBlock > 0 && currentBlock - epochStartBlock < EPOCH_DURATION_BLOCKS) {
      console.log(`[darkpool-bot] Epoch ${currentEpoch} not mature yet (block ${currentBlock}, started ${epochStartBlock}, need ${EPOCH_DURATION_BLOCKS})`);
      return false;
    }
    if (epochStartBlock === 0) {
      console.log(`[darkpool-bot] Epoch ${currentEpoch} has no start_block (first epoch) — treating as mature`);
    }

    // Check if there's volume to settle
    const buyVolRaw = await getMappingValue('epoch_buy_volume', `${currentEpoch}u64`, programId);
    const sellVolRaw = await getMappingValue('epoch_sell_volume', `${currentEpoch}u64`, programId);
    const buyVol = parseAleoU64(buyVolRaw);
    const sellVol = parseAleoU64(sellVolRaw);

    if (buyVol === 0 && sellVol === 0) {
      console.log(`[darkpool-bot] Epoch ${currentEpoch} has no volume, skipping`);
      return false;
    }

    // Get oracle price from aggregator
    const aggregated = await aggregatePrices();
    if (!aggregated.medianPrice || aggregated.medianPrice <= 0) {
      console.warn('[darkpool-bot] No valid oracle price, cannot settle');
      return false;
    }

    const priceMicro = Math.round(aggregated.medianPrice * config.precision);
    console.log(`[darkpool-bot] Settling epoch ${currentEpoch} at price $${aggregated.medianPrice.toFixed(4)} (buy: ${buyVol}, sell: ${sellVol})`);

    // Call settle_epoch(epoch, price)
    const tx = await buildAndBroadcastTransaction(
      programId,
      'settle_epoch',
      [`${currentEpoch}u64`, `${priceMicro}u64`],
    );

    if (tx) {
      state.lastSettlementTimestamp = Date.now();
      state.settlementCount++;
      state.lastEpoch = currentEpoch;
      submitted = true;
      console.log(`[darkpool-bot] Epoch ${currentEpoch} settled: ${tx}`);
    }
  } catch (err) {
    const msg = `Dark pool bot cycle failed: ${err}`;
    console.error(`[darkpool-bot] ${msg}`);
    state.lastError = msg;
  } finally {
    state.isRunning = false;
  }

  return submitted;
}
