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
}

async function getProtocolSnapshot(): Promise<ProtocolSnapshot> {
  const [collateralRaw, borrowedRaw, loansRaw, priceRaw, blockHeight] = await Promise.all([
    getMappingValue('vault_total_collateral'),
    getMappingValue('total_borrowed'),
    getMappingValue('loan_count'),
    getMappingValue('oracle_price'),
    getLatestBlockHeight(),
  ]);

  const totalCollateral = parseAleoU64(collateralRaw);
  const totalBorrowed = parseAleoU64(borrowedRaw);
  const loanCount = parseAleoU64(loansRaw);
  const oraclePrice = parseAleoU64(priceRaw);

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
      `[monitor] Block ${snapshot.blockHeight} | Collateral: ${collAleo} ALEO | Borrowed: ${borrowUsd} USDCx | Price: $${price} | LTV: ${snapshot.globalLtv.toFixed(2)}% | ${snapshot.isHealthy ? 'HEALTHY' : 'WARNING'}`,
    );

    if (!snapshot.isHealthy) {
      console.warn(
        `[monitor] ⚠ Global LTV ${snapshot.globalLtv.toFixed(2)}% exceeds ${LTV_THRESHOLD}% threshold — liquidation opportunities likely exist`,
      );
    }
  } catch (err) {
    console.error('[monitor] Monitoring cycle failed:', err);
  }
}

export function getMonitorStatus() {
  return lastSnapshot;
}

export function startLiquidationMonitor(): void {
  console.log('[monitor] Starting liquidation monitor (every 2 minutes)');

  runMonitorCycle();

  cron.schedule('*/2 * * * *', () => {
    runMonitorCycle();
  });
}
