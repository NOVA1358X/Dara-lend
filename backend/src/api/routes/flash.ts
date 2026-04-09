import { Router } from 'express';
import { config } from '../../utils/config.js';

const router = Router();

// GET /api/flash/stats — flash loan aggregate stats
router.get('/stats', async (_req, res) => {
  try {
    const apiUrl = config.aleoApiUrl;
    const programId = config.flashProgramId;

    const [loansRaw, volumeRaw, feesRaw, activeRaw] = await Promise.all([
      fetch(`${apiUrl}/program/${programId}/mapping/total_flash_loans/0u8`).then(r => r.text()).catch(() => ''),
      fetch(`${apiUrl}/program/${programId}/mapping/total_flash_volume/0u8`).then(r => r.text()).catch(() => ''),
      fetch(`${apiUrl}/program/${programId}/mapping/total_fees_earned/0u8`).then(r => r.text()).catch(() => ''),
      fetch(`${apiUrl}/program/${programId}/mapping/active_flash_count/0u8`).then(r => r.text()).catch(() => ''),
    ]);

    const safeParse = (raw: string | undefined, re: RegExp): string => {
      if (!raw || raw.includes('null') || raw.includes('error') || raw.includes('NOT_FOUND')) return '0';
      return raw.replace(re, '') || '0';
    };

    res.json({
      totalFlashLoans: safeParse(loansRaw, /["\su64]/g),
      totalVolume: safeParse(volumeRaw, /["\su128]/g),
      totalFeesEarned: safeParse(feesRaw, /["\su128]/g),
      activeFlashLoans: safeParse(activeRaw, /["\su64]/g),
      programId: config.flashProgramId,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch flash loan stats' });
  }
});

// GET /api/flash/available — available liquidity for flash loans
router.get('/available', async (_req, res) => {
  try {
    const apiUrl = config.aleoApiUrl;
    const programId = config.flashProgramId;

    const [priceRaw, pausedRaw] = await Promise.all([
      fetch(`${apiUrl}/program/${programId}/mapping/oracle_price/0u8`).then(r => r.text()).catch(() => ''),
      fetch(`${apiUrl}/program/${programId}/mapping/flash_paused/0u8`).then(r => r.text()).catch(() => ''),
    ]);

    const safeParse = (raw: string | undefined, re: RegExp): string => {
      if (!raw || raw.includes('null') || raw.includes('error') || raw.includes('NOT_FOUND')) return '0';
      return raw.replace(re, '') || '0';
    };

    res.json({
      oraclePrice: safeParse(priceRaw, /["\su64]/g),
      paused: pausedRaw?.includes('true') || false,
      feeBps: 9,
      collateralRatioBps: 10200,
      programId: config.flashProgramId,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch flash loan availability' });
  }
});

export default router;
