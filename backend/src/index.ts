import { createServer } from './api/server.js';
import { startPriceUpdater } from './oracle/priceUpdater.js';
import { config } from './utils/config.js';

const app = createServer();

app.listen(config.port, () => {
  console.log(`[server] DARA Lend API running on port ${config.port}`);
  console.log(`[server] Program: ${config.programId}`);
  console.log(`[server] Network: ${config.aleoRpcUrl}`);
});

startPriceUpdater();
