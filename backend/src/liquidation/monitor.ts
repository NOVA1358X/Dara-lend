import cron from 'node-cron';
import { getMappingValue, parseAleoU64, getLatestBlockHeight } from '../utils/aleoClient.js';
import { config } from '../utils/config.js';

const LTV_THRESHOLD = 75; // 75% — positions above this are eligible
const PRECISION = config.precision;

interface ProtocolSnapshot {
  totalCollateral: number;
  totalBorrowed: number;
  loanCount: number;
  oraclePrice: number;
  blockHeight: number | null;
  globalLtv: number;
  isHealthy: boolean;
  isPaused: boolean;
}

async function getProtocolSnapshot(): Promise<ProtocolSnapshot> {
  const [collateralAleoRaw, collateralUsdcxRaw, collateralUsadRaw, borrowedUsdcxRaw, borrowedUsadRaw, borrowedCreditsRaw, priceRaw, loansRaw, pausedRaw, blockHeight] = await Promise.all([
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
  ]);

  const totalCollateral = parseAleoU64(collateralAleoRaw) + parseAleoU64(collateralUsdcxRaw) + parseAleoU64(collateralUsadRaw);
  const totalBorrowed = parseAleoU64(borrowedUsdcxRaw) + parseAleoU64(borrowedUsadRaw) + parseAleoU64(borrowedCreditsRaw);
  const loanCount = parseAleoU64(loansRaw);
  const oraclePrice = parseAleoU64(priceRaw);
  const isPaused = (pausedRaw?.replace(/["\s]/g, '') === '1u8') || false;

  const collateralValueUsd = oraclePrice > 0 ? (totalCollateral * oraclePrice) / PRECISION : 0;
  const globalLtv = collateralValueUsd > 0 ? (totalBorrowed / collateralValueUsd) * 100 : 0;

  return {
    totalCollateral,
    totalBorrowed,
    loanCount,
    oraclePrice,
    blockHeight,
    globalLtv,
    isHealthy: globalLtv < LTV_THRESHOLD,
    isPaused,
  };
}

let lastSnapshot: ProtocolSnapshot | null = null;

async function runMonitorCycle(): Promise<void> {
  try {
    const snapshot = await getProtocolSnapshot();
    lastSnapshot = snapshot;

    const collAleo = (snapshot.totalCollateral / PRECISION).toFixed(4);
    const borrowUsd = (snapshot.totalBorrowed / PRECISION).toFixed(4);
    const price = (snapshot.oraclePrice / PRECISION).toFixed(4);

    console.log(
      `[sentinel] Block ${snapshot.blockHeight} | Collateral: ${collAleo} ALEO | Borrowed: ${borrowUsd} USDCx | Price: $${price} | LTV: ${snapshot.globalLtv.toFixed(2)}% | ${snapshot.isPaused ? 'PAUSED' : snapshot.isHealthy ? 'HEALTHY' : 'WARNING'}`,
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
