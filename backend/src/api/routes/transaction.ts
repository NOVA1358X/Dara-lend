import { Router } from 'express';
import { getTransaction } from '../../utils/aleoClient.js';

const router = Router();

router.get('/:txId', async (req, res) => {
  const { txId } = req.params;

  if (!txId || !/^at1[a-z0-9]+$/.test(txId)) {
    res.status(400).json({ error: 'Invalid transaction ID format' });
    return;
  }

  try {
    const tx = await getTransaction(txId);
    if (!tx) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    res.json(tx);
  } catch (err) {
    console.error('[transaction] Error:', err);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

export default router;
