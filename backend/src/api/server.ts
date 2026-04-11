import express from 'express';
import cors from 'cors';
import { config, darkpoolMarkets } from '../utils/config.js';
import statsRouter from './routes/stats.js';
import solvencyRouter from './routes/solvency.js';
import healthRouter from './routes/health.js';
import transactionRouter from './routes/transaction.js';
import priceRouter from './routes/price.js';
import oracleRouter from './routes/oracle.js';
import analyticsRouter from './routes/analytics.js';
import governanceRouter from './routes/governance.js';
import darkpoolRouter from './routes/darkpool.js';
import auctionRouter from './routes/auction.js';
import flashRouter from './routes/flash.js';

export function createServer() {
  const app = express();

  const allowedOrigins = [config.frontendUrl, 'http://localhost:3000', 'http://localhost:5173'];
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  }));
  app.use(express.json());

  app.use('/api/stats', statsRouter);
  app.use('/api/solvency', solvencyRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/transaction', transactionRouter);
  app.use('/api/price', priceRouter);
  app.use('/api/oracle', oracleRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/governance', governanceRouter);
  app.use('/api/darkpool', darkpoolRouter);
  app.use('/api/auction', auctionRouter);
  app.use('/api/flash', flashRouter);

  app.get('/', (_req, res) => {
    res.json({
      name: 'DARA Lend API',
      version: '5.0.0',
      programs: [
        config.programId, config.vaultProgramId, config.creditsProgramId, config.govProgramId,
        config.darkpoolProgramId, config.dpBtcProgramId, config.dpEthProgramId, config.dpSolProgramId,
        config.testBtcProgramId, config.testEthProgramId, config.testSolProgramId,
        config.auctionProgramId, config.flashProgramId,
      ],
      darkpoolMarkets: darkpoolMarkets.map(m => ({ id: m.id, label: m.label, programId: m.programId })),
      endpoints: ['/api/stats', '/api/solvency', '/api/health', '/api/transaction/:txId', '/api/oracle/status', '/api/analytics/tvl', '/api/analytics/price-history', '/api/analytics/interest-rates', '/api/analytics/overview', '/api/analytics/vault', '/api/analytics/multi-price', '/api/governance/claim', '/api/governance/info', '/api/darkpool/markets', '/api/darkpool/batch', '/api/darkpool/stats', '/api/darkpool/:market/batch', '/api/darkpool/:market/stats', '/api/darkpool/:market/twap', '/api/auction/active', '/api/auction/stats', '/api/auction/list', '/api/auction/:index', '/api/flash/stats', '/api/flash/available'],
    });
  });

  return app;
}
