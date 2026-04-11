import { config, darkpoolMarkets } from '../utils/config.js';
import { runOracleBotCycle, getOracleBotStatus } from '../oracle/oracleBot.js';
import { runLiquidationBotCycle, getLiquidationBotStatus } from '../liquidation/liquidationBot.js';
import { runInterestBotCycle, getInterestBotStatus } from './interestBot.js';
import { runYieldBotCycle, getYieldBotStatus } from './yieldBot.js';
import { runDarkPoolBotCycle, getDarkPoolBotStatus } from './darkpoolBot.js';
import { runAuctionBotCycle, getAuctionBotStatus } from './auctionBot.js';
import { runFlashOracleBotCycle, getFlashOracleBotStatus } from './flashOracleBot.js';
import { getRecentSubmissions } from '../utils/transactionBuilder.js';

type BotPhase = 'idle' | 'oracle' | 'liquidation' | 'interest' | 'yield' | 'darkpool' | 'auction' | 'flash-oracle' | 'cooldown';

interface OrchestratorState {
  phase: BotPhase;
  tickCount: number;
  startedAt: number;
  lastTickTimestamp: number;
  lastOracleResult: boolean;
  lastLiquidationResult: boolean;
  lastInterestResult: boolean;
  lastYieldResult: boolean;
  lastDarkPoolResult: boolean;
  lastAuctionResult: boolean;
  lastFlashOracleResult: boolean;
  errors: string[];
}

const state: OrchestratorState = {
  phase: 'idle',
  tickCount: 0,
  startedAt: 0,
  lastTickTimestamp: 0,
  lastOracleResult: false,
  lastLiquidationResult: false,
  lastInterestResult: false,
  lastYieldResult: false,
  lastDarkPoolResult: false,
  lastAuctionResult: false,
  lastFlashOracleResult: false,
  errors: [],
};

const MAX_ERRORS = 20;
let tickTimer: ReturnType<typeof setInterval> | null = null;

function pushError(msg: string) {
  state.errors.unshift(`[${new Date().toISOString()}] ${msg}`);
  if (state.errors.length > MAX_ERRORS) state.errors.pop();
}

/**
 * Get full orchestrator health report for the /api/health/bot endpoint.
 */
export function getOrchestratorHealth() {
  return {
    enabled: config.botEnabled,
    dpsEnabled: config.dpsEnabled,
    phase: state.phase,
    tickCount: state.tickCount,
    uptimeMs: state.startedAt ? Date.now() - state.startedAt : 0,
    lastTickTimestamp: state.lastTickTimestamp,
    lastResults: {
      oracle: state.lastOracleResult,
      liquidation: state.lastLiquidationResult,
      interest: state.lastInterestResult,
      yield: state.lastYieldResult,
      darkpool: state.lastDarkPoolResult,
      auction: state.lastAuctionResult,
      flashOracle: state.lastFlashOracleResult,
    },
    bots: {
      oracle: getOracleBotStatus(),
      liquidation: getLiquidationBotStatus(),
      interest: getInterestBotStatus(),
      yield: getYieldBotStatus(),
      darkpool: getDarkPoolBotStatus(),
      auction: getAuctionBotStatus(),
      flashOracle: getFlashOracleBotStatus(),
    },
    recentTransactions: getRecentSubmissions().slice(0, 10),
    errors: state.errors,
  };
}

/**
 * Single tick of the orchestrator.
 * Runs bots sequentially to prevent Aleo nonce conflicts.
 *
 * Order: oracle → liquidation → interest → yield
 * Each step waits for the previous to complete before proceeding.
 */
async function tick(): Promise<void> {
  if (state.phase !== 'idle') {
    console.warn('[orchestrator] Previous tick still running, skipping');
    return;
  }

  state.tickCount++;
  state.lastTickTimestamp = Date.now();

  try {
    // Phase 1: Oracle price update
    state.phase = 'oracle';
    state.lastOracleResult = await runOracleBotCycle();

    // Wait between phases if a TX was submitted (allow block confirmation)
    if (state.lastOracleResult) {
      state.phase = 'cooldown';
      await sleep(15_000);
    }

    // Phase 2: Liquidation scan + execution
    state.phase = 'liquidation';
    state.lastLiquidationResult = await runLiquidationBotCycle();

    if (state.lastLiquidationResult) {
      state.phase = 'cooldown';
      await sleep(15_000);
    }

    // Phase 3: Interest accrual
    state.phase = 'interest';
    state.lastInterestResult = await runInterestBotCycle();

    if (state.lastInterestResult) {
      state.phase = 'cooldown';
      await sleep(15_000);
    }

    // Phase 4: Yield distribution
    state.phase = 'yield';
    state.lastYieldResult = await runYieldBotCycle();

    if (state.lastYieldResult) {
      state.phase = 'cooldown';
      await sleep(15_000);
    }

    // Phase 5: Dark pool epoch settlement
    state.phase = 'darkpool';
    state.lastDarkPoolResult = await runDarkPoolBotCycle();

    if (state.lastDarkPoolResult) {
      state.phase = 'cooldown';
      await sleep(15_000);
    }

    // Phase 6: Auction settlement
    state.phase = 'auction';
    state.lastAuctionResult = await runAuctionBotCycle();

    if (state.lastAuctionResult) {
      state.phase = 'cooldown';
      await sleep(15_000);
    }

    // Phase 7: Flash loan oracle price update
    state.phase = 'flash-oracle';
    state.lastFlashOracleResult = await runFlashOracleBotCycle();

  } catch (err) {
    const msg = `Tick ${state.tickCount} failed: ${err}`;
    console.error(`[orchestrator] ${msg}`);
    pushError(msg);
  } finally {
    state.phase = 'idle';
  }
}

/**
 * Start the orchestrator loop.
 * Only runs if BOT_ENABLED=true in env.
 */
export function startOrchestrator(): void {
  if (!config.botEnabled) {
    console.log('[orchestrator] Bot disabled (BOT_ENABLED != true)');
    return;
  }

  if (!config.privateKey) {
    console.warn('[orchestrator] No PRIVATE_KEY configured, bot cannot execute transactions');
    return;
  }

  console.log(`[orchestrator] Starting bot orchestrator (tick: ${config.botTickInterval}ms)`);
  console.log(`[orchestrator] DPS: ${config.dpsEnabled ? 'ENABLED' : 'DISABLED (local fallback)'}`);
  console.log(`[orchestrator] Oracle cooldown: ${config.oraclePushCooldown}ms, stale: ${config.oracleStaleThreshold}ms`);
  console.log(`[orchestrator] Interest interval: ${config.interestAccrualInterval}ms`);

  state.startedAt = Date.now();

  // Run first tick after a short delay to let the server start
  setTimeout(() => tick(), 5_000);

  // Then run on interval
  tickTimer = setInterval(() => tick(), config.botTickInterval);
}

export function stopOrchestrator(): void {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
    console.log('[orchestrator] Stopped');
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
