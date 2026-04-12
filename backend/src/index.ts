import { createServer } from './api/server.js';
import { startPriceUpdater } from './oracle/priceUpdater.js';
import { startLiquidationMonitor } from './liquidation/executor.js';
import { startOrchestrator } from './automation/orchestrator.js';
import { config } from './utils/config.js';
import { warmupSdk } from './utils/transactionBuilder.js';
import { initOrderStore } from './utils/orderStore.js';

const app = createServer();

app.listen(config.port, async () => {
  console.log(`[server] DARA Lend Sentinel running on port ${config.port}`);
  console.log(`[server] Programs: ${config.programId}, ${config.vaultProgramId}, ${config.creditsProgramId}, ${config.govProgramId}`);
  console.log(`[server] Advanced: ${config.darkpoolProgramId}, ${config.dpBtcProgramId}, ${config.dpEthProgramId}, ${config.dpSolProgramId}`);
  console.log(`[server] Extra: ${config.auctionProgramId}, ${config.flashProgramId}`);
  console.log(`[server] Network: ${config.aleoRpcUrl}`);
  // Pre-warm Provable SDK so WASM is ready before first request
  warmupSdk();
  // Initialize persistent order store (PostgreSQL if DATABASE_URL set)
  await initOrderStore();
});

// Read-only monitoring for API endpoints
startPriceUpdater();
startLiquidationMonitor();

// Bot orchestrator: oracle writes, liquidation execution, interest accrual, yield distribution
startOrchestrator();
