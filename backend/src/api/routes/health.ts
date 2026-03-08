import { Router } from 'express';
import { getLatestBlockHeight } from '../../utils/aleoClient.js';
import { config } from '../../utils/config.js';
import { getOracleStatus } from '../../oracle/priceUpdater.js';
import { getMonitorStatus } from '../../liquidation/monitor.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const blockHeight = await getLatestBlockHeight();
    const oracle = getOracleStatus();
    const monitor = getMonitorStatus();

    res.json({
      status: 'ok',
      programId: config.programId,
      network: 'testnet',
      blockHeight,
      timestamp: Date.now(),
      oracle: {
        lastUpdateTimestamp: oracle.lastUpdateTimestamp || null,
        lastUpdatePrice: oracle.lastUpdatePrice || null,
        ageMs: oracle.lastUpdateTimestamp ? Date.now() - oracle.lastUpdateTimestamp : null,
      },
      protocol: monitor
        ? {
            totalCollateral: monitor.totalCollateral,
            totalBorrowed: monitor.totalBorrowed,
            loanCount: monitor.loanCount,
            oraclePrice: monitor.oraclePrice,
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
