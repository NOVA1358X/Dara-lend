import { config } from '../utils/config.js';
import { getMappingValue, parseAleoU64, getLatestBlockHeight } from '../utils/aleoClient.js';
import { buildAndBroadcastTransaction } from '../utils/transactionBuilder.js';

// Precomputed BHP256::hash_to_field(n_u64) for auction indices 0-9
// Same hashes as PROPOSAL_ID_TABLE — Leo CLI verified
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

const cleanAleo = (raw: string): string => raw.replace(/["\s]/g, '').replace(/u\d+$/i, '');

interface AuctionBotState {
  lastSettlementTimestamp: number;
  settlementCount: number;
  lastAuctionIndex: number;
  lastError: string | null;
  isRunning: boolean;
}

const state: AuctionBotState = {
  lastSettlementTimestamp: 0,
  settlementCount: 0,
  lastAuctionIndex: -1,
  lastError: null,
  isRunning: false,
};

export function getAuctionBotStatus() {
  return { ...state };
}

/**
 * Run one auction settlement cycle.
 * Checks for auctions past their reveal phase deadline,
 * then calls settle_auction (if bids > 0) or cancel_auction (if 0 bids).
 *
 * Contract uses BHP256::hash_to_field(count) as auction_id (field key).
 * Mappings: auctions (AuctionInfo struct), auction_settled, auction_cancelled,
 *           highest_bid, bid_count — all keyed by field.
 *
 * Returns true if a transaction was submitted.
 */
export async function runAuctionBotCycle(): Promise<boolean> {
  if (state.isRunning) return false;
  state.isRunning = true;

  let submitted = false;

  try {
    const programId = config.auctionProgramId;
    if (!programId) return false;

    // Check if auctions are paused
    const pausedRaw = await getMappingValue('auction_paused', '0u8', programId);
    const isPaused = (pausedRaw?.replace(/["\s]/g, '') === 'true');
    if (isPaused) {
      console.log('[auction-bot] Auctions paused, skipping');
      return false;
    }

    // Get current auction count
    const auctionCountRaw = await getMappingValue('auction_count', '0u8', programId);
    const auctionCount = parseAleoU64(auctionCountRaw);
    if (auctionCount === 0) return false;

    const currentBlock = await getLatestBlockHeight();
    if (!currentBlock) {
      console.warn('[auction-bot] Could not fetch block height');
      return false;
    }

    // Check latest auctions (max 10, 0-indexed)
    const checkCount = Math.min(auctionCount, 10);
    for (let i = checkCount - 1; i >= 0; i--) {
      const idHash = AUCTION_ID_HASHES[i];
      if (!idHash) continue;

      try {
        // Check if already settled or cancelled
        const [settledRaw, cancelledRaw] = await Promise.all([
          getMappingValue('auction_settled', idHash, programId),
          getMappingValue('auction_cancelled', idHash, programId),
        ]);
        const isSettled = settledRaw?.includes('true') || false;
        const isCancelled = cancelledRaw?.includes('true') || false;
        if (isSettled || isCancelled) continue;

        // Fetch auction info struct to get reveal_end_block
        const infoRaw = await getMappingValue('auctions', idHash, programId);
        if (!infoRaw || infoRaw.includes('null') || infoRaw.includes('NOT_FOUND')) continue;

        // Parse reveal_end_block from AuctionInfo struct
        const revealEndMatch = infoRaw.match(/reveal_end_block\s*:\s*(\d+)u32/);
        const revealEndBlock = revealEndMatch ? parseInt(revealEndMatch[1], 10) : 0;
        if (!revealEndBlock || currentBlock <= revealEndBlock) continue;

        // Past reveal phase — check if there are bids
        const highestBidRaw = await getMappingValue('highest_bid', idHash, programId);
        const highestBid = highestBidRaw ? parseInt(cleanAleo(highestBidRaw), 10) || 0 : 0;

        if (highestBid === 0) {
          // No bids → cancel
          console.log(`[auction-bot] Auction #${i} has no bids, cancelling (hash: ${idHash.slice(0, 20)}...)`);
          const cancelTx = await buildAndBroadcastTransaction(
            programId,
            'cancel_auction',
            [idHash],
          );
          if (cancelTx) {
            state.lastSettlementTimestamp = Date.now();
            state.lastAuctionIndex = i;
            submitted = true;
            console.log(`[auction-bot] Auction #${i} cancelled: ${cancelTx}`);
          }
          break; // One TX per cycle
        } else {
          // Has bids → settle
          console.log(`[auction-bot] Settling auction #${i} (highest bid: ${highestBid}, hash: ${idHash.slice(0, 20)}...)`);
          const tx = await buildAndBroadcastTransaction(
            programId,
            'settle_auction',
            [idHash],
          );
          if (tx) {
            state.lastSettlementTimestamp = Date.now();
            state.settlementCount++;
            state.lastAuctionIndex = i;
            submitted = true;
            console.log(`[auction-bot] Auction #${i} settled: ${tx}`);
          }
          break; // One TX per cycle
        }
      } catch (err) {
        console.warn(`[auction-bot] Error checking auction #${i}:`, err);
      }
    }
  } catch (err) {
    const msg = `Auction bot cycle failed: ${err}`;
    console.error(`[auction-bot] ${msg}`);
    state.lastError = msg;
  } finally {
    state.isRunning = false;
  }

  return submitted;
}
