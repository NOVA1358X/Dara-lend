import { Router } from 'express';
import { config } from '../../utils/config.js';

const router = Router();

// GET /api/darkpool/epoch — current epoch info
router.get('/epoch', async (_req, res) => {
  try {
    const apiUrl = config.aleoApiUrl;
    const programId = config.darkpoolProgramId;

    const [epochRaw, pausedRaw] = await Promise.all([
      fetch(`${apiUrl}/program/${programId}/mapping/current_epoch/0u8`).then(r => r.text()).catch(() => ''),
      fetch(`${apiUrl}/program/${programId}/mapping/darkpool_paused/0u8`).then(r => r.text()).catch(() => ''),
    ]);

    const cleanAleo = (raw: string): string => raw.replace(/["\s]/g, '').replace(/u\d+$/i, '');
    const currentEpoch = epochRaw ? parseInt(cleanAleo(epochRaw), 10) || 1 : 1;
    const paused = pausedRaw?.includes('true') || false;

    // Fetch volume for current epoch
    const [buyVolRaw, sellVolRaw, settledRaw, priceRaw] = await Promise.all([
      fetch(`${apiUrl}/program/${programId}/mapping/epoch_buy_volume/${currentEpoch}u64`).then(r => r.text()).catch(() => ''),
      fetch(`${apiUrl}/program/${programId}/mapping/epoch_sell_volume/${currentEpoch}u64`).then(r => r.text()).catch(() => ''),
      fetch(`${apiUrl}/program/${programId}/mapping/epoch_settled/${currentEpoch}u64`).then(r => r.text()).catch(() => ''),
      fetch(`${apiUrl}/program/${programId}/mapping/epoch_price/${currentEpoch}u64`).then(r => r.text()).catch(() => ''),
    ]);

    const safeParse = (raw: string | undefined): string => {
      if (!raw || raw.includes('null') || raw.includes('error') || raw.includes('NOT_FOUND')) return '0';
      return cleanAleo(raw) || '0';
    };

    res.json({
      currentEpoch,
      paused,
      buyVolume: safeParse(buyVolRaw),
      sellVolume: safeParse(sellVolRaw),
      settled: settledRaw?.includes('true') || false,
      price: safeParse(priceRaw),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dark pool epoch data' });
  }
});

// GET /api/darkpool/stats — aggregate stats
router.get('/stats', async (_req, res) => {
  try {
    const apiUrl = config.aleoApiUrl;
    const programId = config.darkpoolProgramId;

    const [tradesRaw, volumeRaw] = await Promise.all([
      fetch(`${apiUrl}/program/${programId}/mapping/total_trades/0u8`).then(r => r.text()).catch(() => ''),
      fetch(`${apiUrl}/program/${programId}/mapping/total_volume/0u8`).then(r => r.text()).catch(() => ''),
    ]);

    const cleanAleo = (raw: string): string => raw.replace(/["\s]/g, '').replace(/u\d+$/i, '');
    const safeParse = (raw: string | undefined): string => {
      if (!raw || raw.includes('null') || raw.includes('error') || raw.includes('NOT_FOUND')) return '0';
      return cleanAleo(raw) || '0';
    };

    res.json({
      totalTrades: safeParse(tradesRaw),
      totalVolume: safeParse(volumeRaw),
      programId: config.darkpoolProgramId,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dark pool stats' });
  }
});

export default router;
