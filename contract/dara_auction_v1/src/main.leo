import credits.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_stablecoin.aleo;

program dara_auction_v1.aleo {

    // ═══════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════

    const SCALE: u128 = 1_000_000u128;
    const BPS: u128 = 10_000u128;
    const MIN_BID_AMOUNT: u128 = 100_000u128;
    const MIN_COLLATERAL: u64 = 100_000u64;
    const DEFAULT_BID_WINDOW: u32 = 60u32;
    const DEFAULT_REVEAL_WINDOW: u32 = 30u32;

    // ═══════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════

    struct AuctionInfo {
        collateral_amount: u64,
        min_bid: u128,
        start_block: u32,
        bid_end_block: u32,
        reveal_end_block: u32,
        creator_hash: field,
    }

    // ═══════════════════════════════════════════════════
    // RECORDS — All bidder data is FULLY PRIVATE
    // ═══════════════════════════════════════════════════

    record SealedBid {
        owner: address,
        auction_id: field,
        commitment: field,
        deposit: u128,
        nonce_hash: field,
    }

    record RevealedBid {
        owner: address,
        auction_id: field,
        bid_amount: u128,
        deposit: u128,
        nonce_hash: field,
    }

    record AuctionWin {
        owner: address,
        auction_id: field,
        collateral_amount: u64,
        winning_bid: u128,
    }

    record AuctionRefund {
        owner: address,
        auction_id: field,
        refund_amount: u128,
    }

    // ═══════════════════════════════════════════════════
    // MAPPINGS — Only aggregate data, NO bidder identity
    // ═══════════════════════════════════════════════════

    mapping auction_admin: u8 => address;
    mapping auction_paused: u8 => bool;
    mapping auction_count: u8 => u64;
    mapping auctions: field => AuctionInfo;
    mapping auction_settled: field => bool;
    mapping auction_cancelled: field => bool;
    mapping highest_bid: field => u128;
    mapping highest_bidder_hash: field => field;
    mapping bid_count: field => u64;
    mapping total_auctions: u8 => u64;
    mapping total_bid_volume: u8 => u128;
    mapping used_nonces: field => bool;

    // ═══════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════

    @custom
    constructor() {
        Mapping::set(auction_admin, 0u8, aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8);
        Mapping::set(auction_paused, 0u8, false);
        Mapping::set(auction_count, 0u8, 0u64);
        Mapping::set(total_auctions, 0u8, 0u64);
        Mapping::set(total_bid_volume, 0u8, 0u128);
    }

    // ═══════════════════════════════════════════════════
    // 1. START AUCTION — Admin creates auction for collateral
    //    Deposits ALEO collateral into the auction pool
    // ═══════════════════════════════════════════════════

    fn start_auction(
        input_credits: credits.aleo::credits,
        collateral_amount: u64,
        min_bid: u128,
        bid_blocks: u32,
        reveal_blocks: u32,
    ) -> Final {
        assert(collateral_amount >= MIN_COLLATERAL);
        assert(min_bid >= MIN_BID_AMOUNT);
        assert(bid_blocks > 0u32);
        assert(reveal_blocks > 0u32);
        let caller: address = self.caller;

        let (change_credits, credit_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_private_to_public(input_credits, self.address, collateral_amount);

        return final {
            credit_future.run();

            let admin: address = Mapping::get(auction_admin, 0u8);
            assert_eq(caller, admin);

            let paused: bool = Mapping::get_or_use(auction_paused, 0u8, false);
            assert(!paused);

            let count: u64 = Mapping::get_or_use(auction_count, 0u8, 0u64);
            let auction_id: field = BHP256::hash_to_field(count);
            let creator_hash: field = BHP256::hash_to_field(caller);

            let info: AuctionInfo = AuctionInfo {
                collateral_amount: collateral_amount,
                min_bid: min_bid,
                start_block: block.height,
                bid_end_block: block.height + bid_blocks,
                reveal_end_block: block.height + bid_blocks + reveal_blocks,
                creator_hash: creator_hash,
            };

            Mapping::set(auctions, auction_id, info);
            Mapping::set(highest_bid, auction_id, 0u128);
            Mapping::set(highest_bidder_hash, auction_id, 0field);
            Mapping::set(bid_count, auction_id, 0u64);
            Mapping::set(auction_count, 0u8, count + 1u64);

            let total: u64 = Mapping::get_or_use(total_auctions, 0u8, 0u64);
            Mapping::set(total_auctions, 0u8, total + 1u64);
        };
    }

    // ═══════════════════════════════════════════════════
    // 2. SUBMIT SEALED BID — Bidder deposits USDCx + commitment
    //    Bid amount is HIDDEN until reveal phase
    //    commitment = BHP256::hash_to_field(bid_amount_field + secret)
    // ═══════════════════════════════════════════════════

    fn submit_sealed_bid(
        input_token: test_usdcx_stablecoin.aleo::Token,
        merkle_proof: [test_usdcx_stablecoin.aleo::MerkleProof; 2u32],
        auction_id: field,
        commitment: field,
        deposit: u128,
        nonce: field,
    ) -> (SealedBid, Final) {
        assert(deposit >= MIN_BID_AMOUNT);

        let signer_field: field = BHP256::hash_to_field(self.signer);
        let nonce_hash: field = BHP256::hash_to_field(nonce + signer_field);

        let bid: SealedBid = SealedBid {
            owner: self.signer,
            auction_id: auction_id,
            commitment: commitment,
            deposit: deposit,
            nonce_hash: nonce_hash,
        };

        let (compliance_rec, change_tok, deposit_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_private_to_public(self.address, deposit, input_token, merkle_proof);

        return (bid, final {
            deposit_future.run();

            let paused: bool = Mapping::get_or_use(auction_paused, 0u8, false);
            assert(!paused);

            let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
            assert(!nonce_used);
            Mapping::set(used_nonces, nonce_hash, true);

            let info: AuctionInfo = Mapping::get(auctions, auction_id);
            assert(block.height <= info.bid_end_block);

            let settled: bool = Mapping::get_or_use(auction_settled, auction_id, false);
            assert(!settled);
            let cancelled: bool = Mapping::get_or_use(auction_cancelled, auction_id, false);
            assert(!cancelled);

            let count: u64 = Mapping::get_or_use(bid_count, auction_id, 0u64);
            Mapping::set(bid_count, auction_id, count + 1u64);

            let vol: u128 = Mapping::get_or_use(total_bid_volume, 0u8, 0u128);
            Mapping::set(total_bid_volume, 0u8, vol + deposit);
        });
    }

    // ═══════════════════════════════════════════════════
    // 3. REVEAL BID — Bidder reveals actual bid amount
    //    Verifies commitment hash. Updates highest bid.
    // ═══════════════════════════════════════════════════

    fn reveal_bid(
        bid: SealedBid,
        actual_bid: u128,
        secret: field,
    ) -> (RevealedBid, Final) {
        assert(actual_bid > 0u128);
        assert(actual_bid <= bid.deposit);

        let bid_field: field = BHP256::hash_to_field(actual_bid);
        let expected_commitment: field = BHP256::hash_to_field(bid_field + secret);
        assert_eq(expected_commitment, bid.commitment);

        let revealed: RevealedBid = RevealedBid {
            owner: self.signer,
            auction_id: bid.auction_id,
            bid_amount: actual_bid,
            deposit: bid.deposit,
            nonce_hash: bid.nonce_hash,
        };

        let bidder_hash: field = BHP256::hash_to_field(self.signer);
        let aid: field = bid.auction_id;

        return (revealed, final {
            let info: AuctionInfo = Mapping::get(auctions, aid);
            assert(block.height > info.bid_end_block);
            assert(block.height <= info.reveal_end_block);

            let settled: bool = Mapping::get_or_use(auction_settled, aid, false);
            assert(!settled);

            let current_highest: u128 = Mapping::get_or_use(highest_bid, aid, 0u128);
            let current_winner: field = Mapping::get_or_use(highest_bidder_hash, aid, 0field);
            let is_higher: bool = actual_bid > current_highest;
            let new_highest: u128 = is_higher ? actual_bid : current_highest;
            let new_winner: field = is_higher ? bidder_hash : current_winner;
            Mapping::set(highest_bid, aid, new_highest);
            Mapping::set(highest_bidder_hash, aid, new_winner);
        });
    }

    // ═══════════════════════════════════════════════════
    // 4. SETTLE AUCTION — Admin finalizes after reveal window
    //    Marks auction as settled
    // ═══════════════════════════════════════════════════

    fn settle_auction(
        auction_id: field,
    ) -> Final {
        let caller: address = self.caller;

        return final {
            let admin: address = Mapping::get(auction_admin, 0u8);
            assert_eq(caller, admin);

            let info: AuctionInfo = Mapping::get(auctions, auction_id);
            assert(block.height > info.reveal_end_block);

            let settled: bool = Mapping::get_or_use(auction_settled, auction_id, false);
            assert(!settled);

            let cancelled: bool = Mapping::get_or_use(auction_cancelled, auction_id, false);
            assert(!cancelled);

            Mapping::set(auction_settled, auction_id, true);
        };
    }

    // ═══════════════════════════════════════════════════
    // 5. CLAIM COLLATERAL — Winner claims ALEO collateral
    //    Verifies bidder is the highest bidder
    // ═══════════════════════════════════════════════════

    fn claim_collateral(
        bid: RevealedBid,
    ) -> (AuctionWin, Final) {
        let bidder_hash: field = BHP256::hash_to_field(self.signer);
        let aid: field = bid.auction_id;
        let bid_amount: u128 = bid.bid_amount;
        let col_amount: u64 = 0u64;

        let win: AuctionWin = AuctionWin {
            owner: self.signer,
            auction_id: aid,
            collateral_amount: col_amount,
            winning_bid: bid_amount,
        };

        let caller: address = self.caller;

        return (win, final {
            let settled: bool = Mapping::get_or_use(auction_settled, aid, false);
            assert(settled);

            let winner_hash: field = Mapping::get(highest_bidder_hash, aid);
            assert_eq(bidder_hash, winner_hash);
            let winning_bid: u128 = Mapping::get(highest_bid, aid);
            assert_eq(bid_amount, winning_bid);
        });
    }

    // ═══════════════════════════════════════════════════
    // 6. CLAIM COLLATERAL ALEO — Winner redeems the ALEO
    //    Separate step to handle credits transfer
    // ═══════════════════════════════════════════════════

    fn redeem_collateral(
        win_record: AuctionWin,
        collateral_amount: u64,
    ) -> Final {
        assert(collateral_amount > 0u64);
        let caller: address = self.caller;
        let aid: field = win_record.auction_id;

        let (return_credits, transfer_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_public_to_private(caller, collateral_amount);

        return final {
            transfer_future.run();

            let settled: bool = Mapping::get_or_use(auction_settled, aid, false);
            assert(settled);

            let info: AuctionInfo = Mapping::get(auctions, aid);
            assert_eq(collateral_amount, info.collateral_amount);
        };
    }

    // ═══════════════════════════════════════════════════
    // 7. REFUND BID — Losers reclaim USDCx deposits
    // ═══════════════════════════════════════════════════

    fn refund_bid(
        bid: RevealedBid,
    ) -> (AuctionRefund, Final) {
        let bidder_hash: field = BHP256::hash_to_field(self.signer);
        let aid: field = bid.auction_id;
        let deposit: u128 = bid.deposit;

        let refund: AuctionRefund = AuctionRefund {
            owner: self.signer,
            auction_id: aid,
            refund_amount: deposit,
        };

        let caller: address = self.caller;
        let (compliance_rec, usdcx_tok, refund_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(caller, deposit);

        return (refund, final {
            refund_future.run();

            let settled: bool = Mapping::get_or_use(auction_settled, aid, false);
            assert(settled);

            let winner_hash: field = Mapping::get(highest_bidder_hash, aid);
            assert(bidder_hash != winner_hash);
        });
    }

    // ═══════════════════════════════════════════════════
    // 8. CANCEL AUCTION — Admin cancels before settlement
    // ═══════════════════════════════════════════════════

    fn cancel_auction(
        auction_id: field,
    ) -> Final {
        let caller: address = self.caller;

        return final {
            let admin: address = Mapping::get(auction_admin, 0u8);
            assert_eq(caller, admin);

            let settled: bool = Mapping::get_or_use(auction_settled, auction_id, false);
            assert(!settled);

            Mapping::set(auction_cancelled, auction_id, true);
        };
    }

    // ═══════════════════════════════════════════════════
    // 9. PAUSE AUCTIONS
    // ═══════════════════════════════════════════════════

    fn pause_auctions() -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(auction_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(auction_paused, 0u8, true);
        };
    }

    // ═══════════════════════════════════════════════════
    // 10. RESUME AUCTIONS
    // ═══════════════════════════════════════════════════

    fn resume_auctions() -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(auction_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(auction_paused, 0u8, false);
        };
    }

}
