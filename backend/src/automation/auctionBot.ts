import { config } from '../utils/config.js';
import { getMappingValue, parseAleoU64, getLatestBlockHeight } from '../utils/aleoClient.js';
import { buildAndBroadcastTransaction } from '../utils/transactionBuilder.js';

interface AuctionBotState {
  lastSettlementTimestamp: number;
  settlementCount: number;
  lastAuctionId: number;
  lastError: string | null;
  isRunning: boolean;
}

const state: AuctionBotState = {
  lastSettlementTimestamp: 0,
  settlementCount: 0,
  lastAuctionId: 0,
  lastError: null,
  isRunning: false,
};

export function getAuctionBotStatus() {
  return { ...state };
}

/**
 * Run one auction settlement cycle.
 * Checks for auctions past their reveal phase deadline,
 * then calls settle_auction to finalize.
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
    if (!currentBlock) return false;

    // Check latest few auctions for settlement eligibility
    const checkCount = Math.min(auctionCount, 5);
    for (let i = auctionCount; i > auctionCount - checkCount; i--) {
      try {
        // Check if already settled
        const settledRaw = await getMappingValue('auction_settled', `${i}u64`, programId);
        const isSettled = (settledRaw?.replace(/["\s]/g, '') === 'true');
        if (isSettled) continue;

        // Check if reveal phase is complete (reveal_end_block < current block)
        const revealEndRaw = await getMappingValue('auction_reveal_end', `${i}u64`, programId);
        const revealEnd = parseAleoU64(revealEndRaw);
        if (!revealEnd || currentBlock < revealEnd) continue;

        // Check if there's a highest bid
        const highestBidRaw = await getMappingValue('auction_highest_bid', `${i}u64`, programId);
        const highestBid = parseAleoU64(highestBidRaw);
        if (highestBid === 0) {
          console.log(`[auction-bot] Auction ${i} has no bids, cancelling`);
          const cancelTx = await buildAndBroadcastTransaction(
            programId,
            'cancel_auction',
            [`${i}u64`],
          );
          if (cancelTx) {
            state.lastSettlementTimestamp = Date.now();
            state.lastAuctionId = i;
            submitted = true;
          }
          continue;
        }

        // Settle the auction
        console.log(`[auction-bot] Settling auction ${i} (highest bid: ${highestBid})`);
        const tx = await buildAndBroadcastTransaction(
          programId,
          'settle_auction',
          [`${i}u64`],
        );

        if (tx) {
          state.lastSettlementTimestamp = Date.now();
          state.settlementCount++;
          state.lastAuctionId = i;
          submitted = true;
          console.log(`[auction-bot] Auction ${i} settled: ${tx}`);
          break; // One per cycle to prevent nonce conflicts
        }
      } catch (err) {
        console.warn(`[auction-bot] Error checking auction ${i}:`, err);
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
