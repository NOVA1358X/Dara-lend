import { config } from '../utils/config.js';
import { getMappingValue, parseAleoU64 } from '../utils/aleoClient.js';
import { buildAndBroadcastTransaction } from '../utils/transactionBuilder.js';

interface InterestBotState {
  lastAccrualTimestamp: number;
  lastAccrualBlock: number;
  accrualCount: number;
  lastError: string | null;
  isRunning: boolean;
}

const state: InterestBotState = {
  lastAccrualTimestamp: 0,
  lastAccrualBlock: 0,
  accrualCount: 0,
  lastError: null,
  isRunning: false,
};

export function getInterestBotStatus() {
  return { ...state };
}

/**
 * Run one interest accrual cycle.
 * Called by the orchestrator on each tick (typically every 10min).
 *
 * Calls accrue_interest() on the lending program via DPS.
 * Only executes if there are active loans.
 *
 * Returns true if a transaction was submitted.
 */
export async function runInterestBotCycle(): Promise<boolean> {
  if (state.isRunning) return false;
  state.isRunning = true;

  try {
    // Check cooldown
    const timeSinceAccrual = Date.now() - state.lastAccrualTimestamp;
    if (timeSinceAccrual < config.interestAccrualInterval) {
      return false;
    }

    // Only accrue if active loans exist
    const loanCountRaw = await getMappingValue('loan_count');
    const loanCount = parseAleoU64(loanCountRaw);

    if (loanCount === 0) {
      return false;
    }

    // Check protocol isn't paused
    const pausedRaw = await getMappingValue('protocol_paused');
    if (pausedRaw?.replace(/["\s]/g, '') === 'true') {
      console.log('[interest-bot] Protocol paused, skipping accrual');
      return false;
    }

    console.log(`[interest-bot] Accruing interest for ${loanCount} active loans`);

    const txId = await buildAndBroadcastTransaction(
      config.programId,
      'accrue_interest',
      [],
      500_000,
    );

    if (txId) {
      state.lastAccrualTimestamp = Date.now();
      state.accrualCount++;
      state.lastError = null;
      console.log(`[interest-bot] Interest accrued → ${txId}`);
      return true;
    }

    state.lastError = 'Accrual broadcast returned null';
    return false;
  } catch (err) {
    state.lastError = String(err);
    console.error('[interest-bot] Cycle failed:', err);
    return false;
  } finally {
    state.isRunning = false;
  }
}
