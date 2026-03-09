import express from 'express';
import cors from 'cors';
import statsRouter from './routes/stats.js';
import solvencyRouter from './routes/solvency.js';
import healthRouter from './routes/health.js';
import transactionRouter from './routes/transaction.js';
import priceRouter from './routes/price.js';
import oracleRouter from './routes/oracle.js';

export function createServer() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.use('/api/stats', statsRouter);
  app.use('/api/solvency', solvencyRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/transaction', transactionRouter);
  app.use('/api/price', priceRouter);
  app.use('/api/oracle', oracleRouter);

  app.get('/', (_req, res) => {
    res.json({
      name: 'DARA Lend API',
      version: '1.0.0',
      endpoints: ['/api/stats', '/api/solvency', '/api/health', '/api/transaction/:txId', '/api/oracle/status'],
    });
  });

  return app;
}
