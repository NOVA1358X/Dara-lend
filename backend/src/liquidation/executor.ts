import cron from 'node-cron';
import { config } from '../utils/config.js';
import { getMappingValue, parseAleoU64, getLatestBlockHeight } from '../utils/aleoClient.js';

const LTV_THRESHOLD = 75; // 75% — positions above this are eligible
const PRECISION = config.precision;

interface ProtocolSnapshot {
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
  // Vault analytics
  vaultPoolUsdcx: number;
  vaultPoolUsad: number;
  vaultTransferCount: number;
}

async function getProtocolSnapshot(): Promise<ProtocolSnapshot> {
  const [
    collateralAleoRaw, collateralUsdcxRaw, collateralUsadRaw,
    borrowedUsdcxRaw, borrowedUsadRaw, borrowedCreditsRaw,
    priceAleoRaw, loansRaw, pausedRaw, blockHeight,
    // Vault data
    vaultPoolUsdcxRaw, vaultPoolUsadRaw,
    vaultTransferUsdcxRaw, vaultTransferUsadRaw,
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
    getMappingValue('transfer_count', '0u8', config.vaultProgramId),
    getMappingValue('transfer_count', '1u8', config.vaultProgramId),
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
  const isPaused = (pausedRaw?.replace(/["\s]/g, '') === 'true') || false;

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
    isHealthy: globalLtv < LTV_THRESHOLD,
    isPaused,
    vaultPoolUsdcx: parseAleoU64(vaultPoolUsdcxRaw),
    vaultPoolUsad: parseAleoU64(vaultPoolUsadRaw),
    vaultTransferCount: parseAleoU64(vaultTransferUsdcxRaw) + parseAleoU64(vaultTransferUsadRaw),
  };
}

let lastSnapshot: ProtocolSnapshot | null = null;

async function runMonitorCycle(): Promise<void> {
  try {
    const snapshot = await getProtocolSnapshot();
    lastSnapshot = snapshot;

    const collAleo = (snapshot.totalCollateralAleo / PRECISION).toFixed(4);
    const collUsdcx = (snapshot.totalCollateralUsdcx / PRECISION).toFixed(4);
    const collUsad = (snapshot.totalCollateralUsad / PRECISION).toFixed(4);
    const borrowUsdcx = (snapshot.totalBorrowedUsdcx / PRECISION).toFixed(4);
    const borrowUsad = (snapshot.totalBorrowedUsad / PRECISION).toFixed(4);
    const price = (snapshot.oraclePriceAleo / PRECISION).toFixed(4);
    const vaultUsdcx = (snapshot.vaultPoolUsdcx / PRECISION).toFixed(4);
    const vaultUsad = (snapshot.vaultPoolUsad / PRECISION).toFixed(4);

    console.log(
      `[sentinel] Block ${snapshot.blockHeight} | Coll: ${collAleo} ALEO + ${collUsdcx} USDCx + ${collUsad} USAD | Borrow: ${borrowUsdcx} USDCx + ${borrowUsad} USAD | Price: $${price} | LTV: ${snapshot.globalLtv.toFixed(2)}% | Vault: ${vaultUsdcx} USDCx + ${vaultUsad} USAD | Transfers: ${snapshot.vaultTransferCount} | ${snapshot.isPaused ? 'PAUSED' : snapshot.isHealthy ? 'HEALTHY' : 'WARNING'}`,
    );

    if (snapshot.isPaused) {
      console.warn('[sentinel] Circuit breaker active — protocol paused');
    } else if (!snapshot.isHealthy) {
      console.warn(
        `[sentinel] ⚠ Global LTV ${snapshot.globalLtv.toFixed(2)}% exceeds ${LTV_THRESHOLD}% threshold — liquidation opportunities likely exist`,
      );
    }
  } catch (err) {
    console.error('[sentinel] Monitoring cycle failed:', err);
  }
}

export function getMonitorStatus() {
  return lastSnapshot;
}

export function startLiquidationMonitor(): void {
  console.log('[sentinel] Starting liquidation sentinel (every 2 minutes)');

  runMonitorCycle();

  cron.schedule('*/2 * * * *', () => {
    runMonitorCycle();
  });
}
