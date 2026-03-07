import express from 'express';
import cors from 'cors';
import statsRouter from './routes/stats.js';
import solvencyRouter from './routes/solvency.js';
import healthRouter from './routes/health.js';
import transactionRouter from './routes/transaction.js';

export function createServer() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.use('/api/stats', statsRouter);
  app.use('/api/solvency', solvencyRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/transaction', transactionRouter);

  app.get('/', (_req, res) => {
    res.json({
      name: 'DARA Lend API',
      version: '1.0.0',
      endpoints: ['/api/stats', '/api/solvency', '/api/health', '/api/transaction/:txId'],
    });
  });

  return app;
}
