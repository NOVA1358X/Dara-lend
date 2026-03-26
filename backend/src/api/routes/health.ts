import { Router } from 'express';
import { getLatestBlockHeight } from '../../utils/aleoClient.js';
import { config } from '../../utils/config.js';
import { getOracleStatus } from '../../oracle/priceUpdater.js';
import { getMonitorStatus } from '../../liquidation/executor.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const blockHeight = await getLatestBlockHeight();
    const oracle = await getOracleStatus();
    const monitor = getMonitorStatus();

    res.json({
      status: 'ok',
      programId: config.programId,
      network: 'testnet',
      blockHeight,
      timestamp: Date.now(),
      oracle: {
        lastAggregationTimestamp: oracle.lastAggregationTimestamp || null,
        medianPrice: oracle.medianPrice || null,
        onChainPrice: oracle.onChainPrice || null,
        ageMs: oracle.lastAggregationTimestamp ? Date.now() - oracle.lastAggregationTimestamp : null,
      },
      protocol: monitor
        ? {
            totalCollateralAleo: monitor.totalCollateralAleo,
            totalCollateralUsdcx: monitor.totalCollateralUsdcx,
            totalCollateralUsad: monitor.totalCollateralUsad,
            totalBorrowedUsdcx: monitor.totalBorrowedUsdcx,
            totalBorrowedUsad: monitor.totalBorrowedUsad,
            loanCount: monitor.loanCount,
            oraclePriceAleo: monitor.oraclePriceAleo,
            globalLtv: monitor.globalLtv,
            isHealthy: monitor.isHealthy,
          }
        : null,
    });
  } catch {
    res.status(503).json({ status: 'error', timestamp: Date.now() });
  }
});

export default router;
