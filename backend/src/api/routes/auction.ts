import { Router } from 'express';
import { config } from '../../utils/config.js';

const router = Router();

// GET /api/auction/active — active auctions info
router.get('/active', async (_req, res) => {
  try {
    const apiUrl = config.aleoApiUrl;
    const programId = config.auctionProgramId;

    const [countRaw, pausedRaw] = await Promise.all([
      fetch(`${apiUrl}/program/${programId}/mapping/auction_count/0u8`).then(r => r.text()).catch(() => ''),
      fetch(`${apiUrl}/program/${programId}/mapping/auction_paused/0u8`).then(r => r.text()).catch(() => ''),
    ]);

    const auctionCount = countRaw ? parseInt(countRaw.replace(/["\su64]/g, ''), 10) || 0 : 0;
    const paused = pausedRaw?.includes('true') || false;

    res.json({
      auctionCount,
      paused,
      programId: config.auctionProgramId,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch auction data' });
  }
});

// GET /api/auction/stats — aggregate auction stats
router.get('/stats', async (_req, res) => {
  try {
    const apiUrl = config.aleoApiUrl;
    const programId = config.auctionProgramId;

    const [totalRaw, volumeRaw] = await Promise.all([
      fetch(`${apiUrl}/program/${programId}/mapping/total_auctions/0u8`).then(r => r.text()).catch(() => ''),
      fetch(`${apiUrl}/program/${programId}/mapping/total_bid_volume/0u8`).then(r => r.text()).catch(() => ''),
    ]);

    const safeParse = (raw: string | undefined, re: RegExp): string => {
      if (!raw || raw.includes('null') || raw.includes('error') || raw.includes('NOT_FOUND')) return '0';
      return raw.replace(re, '') || '0';
    };

    res.json({
      totalAuctions: safeParse(totalRaw, /["\su64]/g),
      totalBidVolume: safeParse(volumeRaw, /["\su128]/g),
      programId: config.auctionProgramId,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch auction stats' });
  }
});

export default router;
