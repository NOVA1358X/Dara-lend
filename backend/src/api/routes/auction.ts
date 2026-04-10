import { Router } from 'express';
import { config } from '../../utils/config.js';
import { getMappingValue, getLatestBlockHeight } from '../../utils/aleoClient.js';

const router = Router();

const cleanAleo = (raw: string): string => raw.replace(/["\s]/g, '').replace(/u\d+$/i, '');
const safeParse = (raw: string | null | undefined): string => {
  if (!raw || raw.includes('null') || raw.includes('error') || raw.includes('NOT_FOUND')) return '0';
  return cleanAleo(raw) || '0';
};

// Precomputed BHP256::hash_to_field(n_u64) for auction indices 0-9
const AUCTION_ID_HASHES: Record<number, string> = {
  0: '1652537219830374581351801133917453045132431561774681405210829109289309809653field',
  1: '3904538235078694782185823076632282886217961102128932463472941961302626985810field',
  2: '6166342214520700714293691441393595459819170509229148082349542888441470290697field',
  3: '2202382911525370664583268589701702089783227781579861903008538515875797617554field',
  4: '641191311826300068154926258315493886821689237038809166974400271680449809495field',
  5: '1384946382922025096738613590804518732490420771185259317319692407551559020642field',
  6: '4749267368329870819662397015074118545503495346847366781301881346274941963534field',
  7: '5909931256362643343842198150741641304168228616252145504784896873616588194458field',
  8: '6570036553036976211210420456848004756680832573481705515171701672060881289882field',
  9: '5020647010733192249898475765672489758623102564504821494353141994222324015394field',
};

// GET /api/auction/active — active auctions info
router.get('/active', async (_req, res) => {
  try {
    const programId = config.auctionProgramId;

    const [countRaw, pausedRaw] = await Promise.all([
      getMappingValue('auction_count', '0u8', programId),
      getMappingValue('auction_paused', '0u8', programId),
    ]);

    const auctionCount = countRaw ? parseInt(cleanAleo(countRaw), 10) || 0 : 0;
    const paused = pausedRaw?.includes('true') || false;

    res.json({
      auctionCount,
      paused,
      programId,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch auction data' });
  }
});

// GET /api/auction/stats — aggregate auction stats
router.get('/stats', async (_req, res) => {
  try {
    const programId = config.auctionProgramId;

    const [totalRaw, volumeRaw] = await Promise.all([
      getMappingValue('total_auctions', '0u8', programId),
      getMappingValue('total_bid_volume', '0u8', programId),
    ]);

    res.json({
      totalAuctions: safeParse(totalRaw),
      totalBidVolume: safeParse(volumeRaw),
      programId,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch auction stats' });
  }
});

// GET /api/auction/list — list all auctions with on-chain data
router.get('/list', async (_req, res) => {
  try {
    const programId = config.auctionProgramId;

    const [countRaw, blockHeight] = await Promise.all([
      getMappingValue('auction_count', '0u8', programId),
      getLatestBlockHeight(),
    ]);

    const auctionCount = countRaw ? parseInt(cleanAleo(countRaw), 10) || 0 : 0;
    const currentBlock = blockHeight ?? 0;

    // Fetch data for each auction (max 10)
    const count = Math.min(auctionCount, 10);
    const auctions = [];

    for (let i = 0; i < count; i++) {
      const idHash = AUCTION_ID_HASHES[i];
      if (!idHash) continue;

      try {
        const [infoRaw, settledRaw, cancelledRaw, highBidRaw, bidCountRaw] = await Promise.all([
          getMappingValue('auctions', idHash, programId),
          getMappingValue('auction_settled', idHash, programId),
          getMappingValue('auction_cancelled', idHash, programId),
          getMappingValue('highest_bid', idHash, programId),
          getMappingValue('bid_count', idHash, programId),
        ]);

        if (!infoRaw || infoRaw.includes('NOT_FOUND') || infoRaw.includes('null')) continue;

        // Parse AuctionInfo struct: { collateral_amount: u64, min_bid: u128, start_block: u32, bid_end_block: u32, reveal_end_block: u32, creator_hash: field }
        const getField = (raw: string, name: string, suffix: string): string => {
          const regex = new RegExp(`${name}\\s*:\\s*(\\d+)${suffix}`);
          const match = raw.match(regex);
          return match ? match[1] : '0';
        };

        const collateral = parseInt(getField(infoRaw, 'collateral_amount', 'u64'), 10);
        const minBid = parseInt(getField(infoRaw, 'min_bid', 'u128'), 10);
        const startBlock = parseInt(getField(infoRaw, 'start_block', 'u32'), 10);
        const bidEndBlock = parseInt(getField(infoRaw, 'bid_end_block', 'u32'), 10);
        const revealEndBlock = parseInt(getField(infoRaw, 'reveal_end_block', 'u32'), 10);

        const isSettled = settledRaw?.includes('true') || false;
        const isCancelled = cancelledRaw?.includes('true') || false;
        const highestBid = parseInt(safeParse(highBidRaw), 10);
        const bidCount = parseInt(safeParse(bidCountRaw), 10);

        // Determine phase
        let phase: string;
        if (isCancelled) phase = 'cancelled';
        else if (isSettled) phase = 'settled';
        else if (currentBlock <= bidEndBlock) phase = 'bidding';
        else if (currentBlock <= revealEndBlock) phase = 'reveal';
        else phase = 'awaiting_settlement';

        auctions.push({
          index: i,
          auctionIdHash: idHash,
          collateral,
          minBid,
          startBlock,
          bidEndBlock,
          revealEndBlock,
          phase,
          highestBid,
          bidCount,
          currentBlock,
        });
      } catch {
        // skip this auction
      }
    }

    res.json({ auctions, auctionCount, currentBlock });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch auction list' });
  }
});

// GET /api/auction/:index — single auction detail by index (0-based)
router.get('/:index', async (req, res) => {
  try {
    const programId = config.auctionProgramId;
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0 || index > 9) {
      res.status(400).json({ error: 'Invalid auction index (0-9)' });
      return;
    }

    const idHash = AUCTION_ID_HASHES[index];
    if (!idHash) {
      res.status(400).json({ error: 'No precomputed hash for this index' });
      return;
    }

    const [infoRaw, settledRaw, cancelledRaw, highBidRaw, bidCountRaw, blockHeight] = await Promise.all([
      getMappingValue('auctions', idHash, programId),
      getMappingValue('auction_settled', idHash, programId),
      getMappingValue('auction_cancelled', idHash, programId),
      getMappingValue('highest_bid', idHash, programId),
      getMappingValue('bid_count', idHash, programId),
      getLatestBlockHeight(),
    ]);

    if (!infoRaw || infoRaw.includes('NOT_FOUND') || infoRaw.includes('null')) {
      res.status(404).json({ error: 'Auction not found' });
      return;
    }

    const currentBlock = blockHeight ?? 0;

    const getField = (raw: string, name: string, suffix: string): string => {
      const regex = new RegExp(`${name}\\s*:\\s*(\\d+)${suffix}`);
      const match = raw.match(regex);
      return match ? match[1] : '0';
    };

    const collateral = parseInt(getField(infoRaw, 'collateral_amount', 'u64'), 10);
    const minBid = parseInt(getField(infoRaw, 'min_bid', 'u128'), 10);
    const startBlock = parseInt(getField(infoRaw, 'start_block', 'u32'), 10);
    const bidEndBlock = parseInt(getField(infoRaw, 'bid_end_block', 'u32'), 10);
    const revealEndBlock = parseInt(getField(infoRaw, 'reveal_end_block', 'u32'), 10);

    const isSettled = settledRaw?.includes('true') || false;
    const isCancelled = cancelledRaw?.includes('true') || false;
    const highestBid = parseInt(safeParse(highBidRaw), 10);
    const bidCount = parseInt(safeParse(bidCountRaw), 10);

    let phase: string;
    if (isCancelled) phase = 'cancelled';
    else if (isSettled) phase = 'settled';
    else if (currentBlock <= bidEndBlock) phase = 'bidding';
    else if (currentBlock <= revealEndBlock) phase = 'reveal';
    else phase = 'awaiting_settlement';

    res.json({
      index,
      auctionIdHash: idHash,
      collateral,
      minBid,
      startBlock,
      bidEndBlock,
      revealEndBlock,
      phase,
      highestBid,
      bidCount,
      currentBlock,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch auction detail' });
  }
});

export default router;
