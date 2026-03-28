import { config } from '../utils/config.js';
import { getMappingValue, parseAleoU64 } from '../utils/aleoClient.js';
import { buildAndBroadcastTransaction } from '../utils/transactionBuilder.js';

interface YieldBotState {
  lastDistributionTimestamp: number;
  distributionCount: number;
  lastFeesUsdcx: number;
  lastFeesUsad: number;
  lastError: string | null;
  isRunning: boolean;
}

const state: YieldBotState = {
  lastDistributionTimestamp: 0,
  distributionCount: 0,
  lastFeesUsdcx: -1,  // -1 = not yet seeded from chain
  lastFeesUsad: -1,
  lastError: null,
  isRunning: false,
};

export function getYieldBotStatus() {
  return { ...state };
}

/**
 * Run one yield distribution cycle.
 * Called by the orchestrator after interest accrual.
 *
 * Reads total_fees_collected delta, then calls distribute_yield on the vault
 * for both USDCx and USAD pools.
 *
 * Returns true if any transaction was submitted.
 */
export async function runYieldBotCycle(): Promise<boolean> {
  if (state.isRunning) return false;
  state.isRunning = true;

  let submitted = false;

  try {
    // Respect yield distribution interval (default 6hr)
    const timeSinceDistribution = Date.now() - state.lastDistributionTimestamp;
    if (state.lastDistributionTimestamp > 0 && timeSinceDistribution < config.yieldDistributionInterval) {
      return false;
    }

    // Check vault isn't paused
    const vaultPausedRaw = await getMappingValue('vault_paused', '0u8', config.vaultProgramId);
    if (vaultPausedRaw?.replace(/["\s]/g, '') === 'true') {
      console.log('[yield-bot] Vault paused, skipping distribution');
      return false;
    }

    // Read current fees collected (keys: 0=USDCx, 1=USAD in lending contract)
    const [feesUsdcxRaw, feesUsadRaw] = await Promise.all([
      getMappingValue('total_fees_collected', '0u8'),
      getMappingValue('total_fees_collected', '1u8'),
    ]);

    const currentFeesUsdcx = parseAleoU64(feesUsdcxRaw);
    const currentFeesUsad = parseAleoU64(feesUsadRaw);

    // On first run after startup, seed baseline from chain — do NOT distribute historical fees
    if (state.lastFeesUsdcx === -1) {
      state.lastFeesUsdcx = currentFeesUsdcx;
      state.lastFeesUsad = currentFeesUsad;
      console.log(`[yield-bot] Baseline seeded: ${currentFeesUsdcx} USDCx, ${currentFeesUsad} USAD — waiting for new fees`);
      return false;
    }
    // Calculate delta since last distribution
    const deltaUsdcx = currentFeesUsdcx - state.lastFeesUsdcx;
    const deltaUsad = currentFeesUsad - state.lastFeesUsad;

    // Distribute USDCx yield if above threshold
    if (deltaUsdcx >= config.yieldDistributionMinAmount) {
      console.log(`[yield-bot] Distributing ${deltaUsdcx} USDCx yield to vault`);

      const txId = await buildAndBroadcastTransaction(
        config.vaultProgramId,
        'distribute_yield',
        ['0u8', `${deltaUsdcx}u128`],
        500_000,
      );

      if (txId) {
        state.lastFeesUsdcx = currentFeesUsdcx;
        state.distributionCount++;
        submitted = true;
        console.log(`[yield-bot] USDCx yield distributed → ${txId}`);
      }
    }

    // Distribute USAD yield if above threshold
    if (deltaUsad >= config.yieldDistributionMinAmount) {
      // Wait for prior tx to avoid nonce conflicts
      if (submitted) {
        await new Promise(r => setTimeout(r, 10_000));
      }

      console.log(`[yield-bot] Distributing ${deltaUsad} USAD yield to vault`);

      const txId = await buildAndBroadcastTransaction(
        config.vaultProgramId,
        'distribute_yield',
        ['1u8', `${deltaUsad}u128`],
        500_000,
      );

      if (txId) {
        state.lastFeesUsad = currentFeesUsad;
        state.distributionCount++;
        submitted = true;
        console.log(`[yield-bot] USAD yield distributed → ${txId}`);
      }
    }

    if (submitted) {
      state.lastDistributionTimestamp = Date.now();
      state.lastError = null;
    }

    return submitted;
  } catch (err) {
    state.lastError = String(err);
    console.error('[yield-bot] Cycle failed:', err);
    return false;
  } finally {
    state.isRunning = false;
  }
}
