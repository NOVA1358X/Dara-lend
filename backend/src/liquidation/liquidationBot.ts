import { config } from '../utils/config.js';
import { getMappingValue, parseAleoU64, getLatestBlockHeight } from '../utils/aleoClient.js';
import { buildAndBroadcastTransaction } from '../utils/transactionBuilder.js';

const PRECISION = config.precision;
const LIQUIDATION_LTV = 80; // Individual position LTV threshold for liquidation (80%)

interface LiquidationBotState {
  lastScanTimestamp: number;
  liquidationsExecuted: number;
  lastError: string | null;
  isRunning: boolean;
  lastScanHealthy: boolean;
  globalLtv: number;
}

const state: LiquidationBotState = {
  lastScanTimestamp: 0,
  liquidationsExecuted: 0,
  lastError: null,
  isRunning: false,
  lastScanHealthy: true,
  globalLtv: 0,
};

export function getLiquidationBotStatus() {
  return { ...state };
}

export interface ProtocolSnapshot {
  totalCollateralAleo: number;
  totalCollateralUsdcx: number;
  totalCollateralUsad: number;
  totalBorrowedUsdcx: number;
  totalBorrowedUsad: number;
  totalBorrowedCredits: number;
  loanCount: number;
  oraclePriceAleo: number;
  blockHeight: number | null;
  globalLtv: number;
  isHealthy: boolean;
  isPaused: boolean;
  vaultPoolUsdcx: number;
  vaultPoolUsad: number;
}

export async function getProtocolSnapshot(): Promise<ProtocolSnapshot> {
  const [
    collateralAleoRaw, collateralUsdcxRaw, collateralUsadRaw,
    borrowedUsdcxRaw, borrowedUsadRaw, borrowedCreditsRaw,
    priceAleoRaw, loansRaw, pausedRaw, blockHeight,
    vaultPoolUsdcxRaw, vaultPoolUsadRaw,
  ] = await Promise.all([
    getMappingValue('vault_collateral_aleo'),
    getMappingValue('vault_collateral_usdcx'),
    getMappingValue('vault_collateral_usad'),
    getMappingValue('pool_total_borrowed', '0u8'),
    getMappingValue('pool_total_borrowed', '1u8'),
    getMappingValue('pool_total_borrowed', '2u8'),
    getMappingValue('oracle_price', '0u8'),
    getMappingValue('loan_count'),
    getMappingValue('protocol_paused'),
    getLatestBlockHeight(),
    getMappingValue('supply_pool_total', '0u8', config.vaultProgramId),
    getMappingValue('supply_pool_total', '1u8', config.vaultProgramId),
  ]);

  const totalCollateralAleo = parseAleoU64(collateralAleoRaw);
  const totalCollateralUsdcx = parseAleoU64(collateralUsdcxRaw);
  const totalCollateralUsad = parseAleoU64(collateralUsadRaw);
  const totalBorrowedUsdcx = parseAleoU64(borrowedUsdcxRaw);
  const totalBorrowedUsad = parseAleoU64(borrowedUsadRaw);
  const totalBorrowedCredits = parseAleoU64(borrowedCreditsRaw);
  const totalBorrowed = totalBorrowedUsdcx + totalBorrowedUsad + totalBorrowedCredits;
  const loanCount = parseAleoU64(loansRaw);
  const oraclePriceAleo = parseAleoU64(priceAleoRaw);
  const isPaused = pausedRaw?.replace(/["\s]/g, '') === 'true';

  const collateralValueUsd = oraclePriceAleo > 0 ? (totalCollateralAleo * oraclePriceAleo) / PRECISION : 0;
  const totalCollateralValue = collateralValueUsd + totalCollateralUsdcx + totalCollateralUsad;
  const globalLtv = totalCollateralValue > 0 ? (totalBorrowed / totalCollateralValue) * 100 : 0;

  return {
    totalCollateralAleo,
    totalCollateralUsdcx,
    totalCollateralUsad,
    totalBorrowedUsdcx,
    totalBorrowedUsad,
    totalBorrowedCredits,
    loanCount,
    oraclePriceAleo,
    blockHeight,
    globalLtv,
    isHealthy: globalLtv < LIQUIDATION_LTV,
    isPaused,
    vaultPoolUsdcx: parseAleoU64(vaultPoolUsdcxRaw),
    vaultPoolUsad: parseAleoU64(vaultPoolUsadRaw),
  };
}

/**
 * Run one liquidation monitoring + execution cycle.
 * Called by the orchestrator on each tick.
 *
 * Logic:
 * 1. Take protocol snapshot
 * 2. If protocol is paused, skip
 * 3. If global LTV is healthy (< 80%), log and return
 * 4. If unhealthy, attempt to execute liquidation for the most at-risk collateral type
 *
 * Note: Individual loan scanning requires LiquidationAuth records owned by the admin.
 * Without record scanning, we use a heuristic: if the global LTV exceeds the threshold
 * and there are active loans, we attempt liquidation via the collateral type with the
 * highest ratio of borrowed-to-collateral.
 *
 * Returns true if a liquidation transaction was submitted.
 */
export async function runLiquidationBotCycle(): Promise<boolean> {
  if (state.isRunning) return false;
  state.isRunning = true;

  try {
    const snapshot = await getProtocolSnapshot();
    state.lastScanTimestamp = Date.now();
    state.globalLtv = snapshot.globalLtv;

    if (snapshot.isPaused) {
      console.log('[liquidation-bot] Protocol paused, skipping');
      state.lastScanHealthy = true;
      return false;
    }

    if (snapshot.loanCount === 0) {
      state.lastScanHealthy = true;
      return false;
    }

    const price = snapshot.oraclePriceAleo;
    if (price === 0) {
      console.warn('[liquidation-bot] Oracle price is 0, skipping');
      return false;
    }

    state.lastScanHealthy = snapshot.isHealthy;

    if (snapshot.isHealthy) {
      const ltvStr = snapshot.globalLtv.toFixed(2);
      console.log(
        `[liquidation-bot] Block ${snapshot.blockHeight} | LTV ${ltvStr}% | HEALTHY`,
      );
      return false;
    }

    // Protocol is unhealthy — determine which collateral type to liquidate
    console.warn(
      `[liquidation-bot] LTV ${snapshot.globalLtv.toFixed(2)}% exceeds ${LIQUIDATION_LTV}% — attempting liquidation`,
    );

    // Identify collateral with highest borrow exposure
    const exposures = [
      { token: 'aleo', fn: 'liquidate', borrowed: snapshot.totalBorrowedCredits, collateral: snapshot.totalCollateralAleo },
      { token: 'usdcx', fn: 'liquidate_usdcx', borrowed: snapshot.totalBorrowedUsdcx, collateral: snapshot.totalCollateralUsdcx },
      { token: 'usad', fn: 'liquidate_usad', borrowed: snapshot.totalBorrowedUsad, collateral: snapshot.totalCollateralUsad },
    ].filter(e => e.borrowed > 0 && e.collateral > 0);

    if (exposures.length === 0) {
      console.warn('[liquidation-bot] No borrowing exposure found despite high LTV');
      return false;
    }

    // Sort by LTV ratio descending — prioritize the riskiest collateral
    exposures.sort((a, b) => {
      const ltvA = a.collateral > 0 ? a.borrowed / a.collateral : 0;
      const ltvB = b.collateral > 0 ? b.borrowed / b.collateral : 0;
      return ltvB - ltvA;
    });

    const target = exposures[0];
    console.log(
      `[liquidation-bot] Targeting ${target.token} collateral (borrowed: ${target.borrowed}, collateral: ${target.collateral})`,
    );

    // Note: Actual liquidation requires a LiquidationAuth private record owned by the orchestrator.
    // This record is issued when a borrower takes a loan with the orchestrator as the authorized liquidator.
    // The record must be scanned from chain (requires Provable Record Scanner) and passed as the first input.
    // Until record scanning is wired in, we log the opportunity and skip on-chain execution.
    console.warn(
      `[liquidation-bot] OPPORTUNITY DETECTED — ${target.token} collateral LTV critical. ` +
      `Manual liquidation required: call '${target.fn}' with a valid LiquidationAuth record at oracle price ${price}.`,
    );

    // Placeholder: once record scanning is integrated, retrieve LiquidationAuth and call:
    // buildAndBroadcastTransaction(config.programId, target.fn, [authRecord, `${price}u64`], 500_000)
    state.lastError = 'Record scanner required for auto-liquidation (LiquidationAuth)';
    return false;

    state.lastError = 'Liquidation broadcast returned null';
    return false;
  } catch (err) {
    state.lastError = String(err);
    console.error('[liquidation-bot] Cycle failed:', err);
    return false;
  } finally {
    state.isRunning = false;
  }
}
