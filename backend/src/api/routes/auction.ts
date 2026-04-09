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

    res.json({
      totalAuctions: totalRaw?.replace(/["\su64]/g, '') || '0',
      totalBidVolume: volumeRaw?.replace(/["\su128]/g, '') || '0',
      programId: config.auctionProgramId,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch auction stats' });
  }
});

export default router;
