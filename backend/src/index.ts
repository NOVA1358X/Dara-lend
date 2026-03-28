import { createServer } from './api/server.js';
import { startPriceUpdater } from './oracle/priceUpdater.js';
import { startLiquidationMonitor } from './liquidation/executor.js';
import { startOrchestrator } from './automation/orchestrator.js';
import { config } from './utils/config.js';

const app = createServer();

app.listen(config.port, () => {
  console.log(`[server] DARA Lend Sentinel running on port ${config.port}`);
  console.log(`[server] Programs: ${config.programId}, ${config.vaultProgramId}`);
  console.log(`[server] Network: ${config.aleoRpcUrl}`);
});

// Read-only monitoring for API endpoints
startPriceUpdater();
startLiquidationMonitor();

// Bot orchestrator: oracle writes, liquidation execution, interest accrual, yield distribution
startOrchestrator();
