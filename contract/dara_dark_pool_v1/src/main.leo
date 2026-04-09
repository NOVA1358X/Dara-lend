import credits.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_stablecoin.aleo;

program dara_dark_pool_v1.aleo {

    // ═══════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════

    const SCALE: u128 = 1_000_000u128;
    const BPS: u128 = 10_000u128;
    const MIN_INTENT_AMOUNT: u128 = 100_000u128;
    const MIN_INTENT_ALEO: u64 = 100_000u64;

    // ═══════════════════════════════════════════════════
    // RECORDS — All user data is FULLY PRIVATE
    // ═══════════════════════════════════════════════════

    record TradeIntent {
        owner: address,
        intent_type: u8,
        token_type: u8,
        amount: u128,
        epoch: u64,
        nonce_hash: field,
    }

    record FillReceipt {
        owner: address,
        intent_type: u8,
        token_type: u8,
        fill_amount: u128,
        epoch: u64,
    }

    // ═══════════════════════════════════════════════════
    // MAPPINGS — Only aggregate data, NO user identity
    // ═══════════════════════════════════════════════════

    mapping darkpool_admin: u8 => address;
    mapping darkpool_paused: u8 => bool;
    mapping current_epoch: u8 => u64;
    mapping epoch_buy_volume: u64 => u128;
    mapping epoch_sell_volume: u64 => u128;
    mapping epoch_settled: u64 => bool;
    mapping epoch_price: u64 => u64;
    mapping epoch_start_block: u64 => u32;
    mapping total_trades: u8 => u64;
    mapping total_volume: u8 => u128;
    mapping used_nonces: field => bool;

    // ═══════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════

    @custom
    constructor() {
        Mapping::set(darkpool_admin, 0u8, aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8);
        Mapping::set(darkpool_paused, 0u8, false);
        Mapping::set(current_epoch, 0u8, 1u64);
        Mapping::set(total_trades, 0u8, 0u64);
        Mapping::set(total_volume, 0u8, 0u128);
    }

    // ═══════════════════════════════════════════════════
    // 1. SUBMIT BUY INTENT — Deposit USDCx to buy ALEO
    //    User identity: PRIVATE (record only)
    //    Intent amount: PRIVATE (record only)
    //    On-chain: only aggregate epoch volume
    // ═══════════════════════════════════════════════════

    fn submit_buy_intent(
        input_token: test_usdcx_stablecoin.aleo::Token,
        merkle_proof: [test_usdcx_stablecoin.aleo::MerkleProof; 2u32],
        amount: u128,
        epoch: u64,
        nonce: field,
    ) -> (TradeIntent, Final) {
        assert(amount >= MIN_INTENT_AMOUNT);

        let signer_field: field = BHP256::hash_to_field(self.signer);
        let nonce_hash: field = BHP256::hash_to_field(nonce + signer_field);

        let intent: TradeIntent = TradeIntent {
            owner: self.signer,
            intent_type: 0u8,
            token_type: 0u8,
            amount: amount,
            epoch: epoch,
            nonce_hash: nonce_hash,
        };

        let (compliance_rec, change_tok, deposit_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_private_to_public(self.address, amount, input_token, merkle_proof);

        return (intent, final {
            deposit_future.run();

            let paused: bool = Mapping::get_or_use(darkpool_paused, 0u8, false);
            assert(!paused);

            let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
            assert(!nonce_used);
            Mapping::set(used_nonces, nonce_hash, true);

            let current: u64 = Mapping::get_or_use(current_epoch, 0u8, 1u64);
            assert_eq(epoch, current);

            let settled: bool = Mapping::get_or_use(epoch_settled, epoch, false);
            assert(!settled);

            let current_volume: u128 = Mapping::get_or_use(epoch_buy_volume, epoch, 0u128);
            Mapping::set(epoch_buy_volume, epoch, current_volume + amount);

            let trades: u64 = Mapping::get_or_use(total_trades, 0u8, 0u64);
            Mapping::set(total_trades, 0u8, trades + 1u64);

            let vol: u128 = Mapping::get_or_use(total_volume, 0u8, 0u128);
            Mapping::set(total_volume, 0u8, vol + amount);
        });
    }

    // ═══════════════════════════════════════════════════
    // 2. SUBMIT SELL INTENT — Deposit ALEO to sell
    //    User identity: PRIVATE (record only)
    // ═══════════════════════════════════════════════════

    fn submit_sell_intent(
        input_credits: credits.aleo::credits,
        amount: u64,
        epoch: u64,
        nonce: field,
    ) -> (TradeIntent, Final) {
        assert(amount >= MIN_INTENT_ALEO);

        let signer_field: field = BHP256::hash_to_field(self.signer);
        let nonce_hash: field = BHP256::hash_to_field(nonce + signer_field);

        let intent: TradeIntent = TradeIntent {
            owner: self.signer,
            intent_type: 1u8,
            token_type: 0u8,
            amount: amount as u128,
            epoch: epoch,
            nonce_hash: nonce_hash,
        };

        let (change_credits, credit_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_private_to_public(input_credits, self.address, amount);

        return (intent, final {
            credit_future.run();

            let paused: bool = Mapping::get_or_use(darkpool_paused, 0u8, false);
            assert(!paused);

            let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
            assert(!nonce_used);
            Mapping::set(used_nonces, nonce_hash, true);

            let current: u64 = Mapping::get_or_use(current_epoch, 0u8, 1u64);
            assert_eq(epoch, current);

            let settled: bool = Mapping::get_or_use(epoch_settled, epoch, false);
            assert(!settled);

            let current_volume: u128 = Mapping::get_or_use(epoch_sell_volume, epoch, 0u128);
            Mapping::set(epoch_sell_volume, epoch, current_volume + (amount as u128));

            let trades: u64 = Mapping::get_or_use(total_trades, 0u8, 0u64);
            Mapping::set(total_trades, 0u8, trades + 1u64);

            let vol: u128 = Mapping::get_or_use(total_volume, 0u8, 0u128);
            Mapping::set(total_volume, 0u8, vol + (amount as u128));
        });
    }

    // ═══════════════════════════════════════════════════
    // 3. SETTLE EPOCH — Admin settles at oracle price
    //    Advances to next epoch
    // ═══════════════════════════════════════════════════

    fn settle_epoch(
        epoch: u64,
        oracle_price: u64,
    ) -> Final {
        assert(oracle_price > 0u64);
        let caller: address = self.caller;

        return final {
            let admin: address = Mapping::get(darkpool_admin, 0u8);
            assert_eq(caller, admin);

            let settled: bool = Mapping::get_or_use(epoch_settled, epoch, false);
            assert(!settled);

            Mapping::set(epoch_settled, epoch, true);
            Mapping::set(epoch_price, epoch, oracle_price);

            let current: u64 = Mapping::get_or_use(current_epoch, 0u8, 1u64);
            let next: u64 = current > epoch ? current : epoch + 1u64;
            Mapping::set(current_epoch, 0u8, next);
            Mapping::set(epoch_start_block, next, block.height);
        };
    }

    // ═══════════════════════════════════════════════════
    // 4. CLAIM BUY FILL — Buyer claims ALEO at epoch price
    //    Consumes TradeIntent, returns ALEO privately
    // ═══════════════════════════════════════════════════

    fn claim_buy_fill(
        intent: TradeIntent,
        fill_aleo: u64,
    ) -> (FillReceipt, Final) {
        assert(intent.intent_type == 0u8);
        assert(fill_aleo > 0u64);

        let intent_epoch: u64 = intent.epoch;
        let intent_amount: u128 = intent.amount;
        let intent_token_type: u8 = intent.token_type;

        let receipt: FillReceipt = FillReceipt {
            owner: self.signer,
            intent_type: 0u8,
            token_type: intent_token_type,
            fill_amount: fill_aleo as u128,
            epoch: intent_epoch,
        };

        let caller: address = self.caller;
        let (return_credits, transfer_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_public_to_private(caller, fill_aleo);

        return (receipt, final {
            transfer_future.run();

            let settled: bool = Mapping::get_or_use(epoch_settled, intent_epoch, false);
            assert(settled);

            let price: u64 = Mapping::get(epoch_price, intent_epoch);
            let expected_aleo: u128 = intent_amount * SCALE / (price as u128);
            assert_eq(fill_aleo as u128, expected_aleo);
        });
    }

    // ═══════════════════════════════════════════════════
    // 5. CLAIM SELL FILL — Seller claims USDCx at epoch price
    //    Consumes TradeIntent, returns USDCx privately
    // ═══════════════════════════════════════════════════

    fn claim_sell_fill(
        intent: TradeIntent,
        fill_usdcx: u128,
    ) -> (FillReceipt, Final) {
        assert(intent.intent_type == 1u8);
        assert(fill_usdcx > 0u128);

        let intent_epoch: u64 = intent.epoch;
        let intent_amount: u128 = intent.amount;
        let intent_token_type: u8 = intent.token_type;

        let receipt: FillReceipt = FillReceipt {
            owner: self.signer,
            intent_type: 1u8,
            token_type: intent_token_type,
            fill_amount: fill_usdcx,
            epoch: intent_epoch,
        };

        let caller: address = self.caller;
        let (compliance_rec, usdcx_tok, transfer_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(caller, fill_usdcx);

        return (receipt, final {
            transfer_future.run();

            let settled: bool = Mapping::get_or_use(epoch_settled, intent_epoch, false);
            assert(settled);

            let price: u64 = Mapping::get(epoch_price, intent_epoch);
            let expected_usdcx: u128 = intent_amount * (price as u128) / SCALE;
            assert_eq(fill_usdcx, expected_usdcx);
        });
    }

    // ═══════════════════════════════════════════════════
    // 6. CANCEL BUY INTENT — Return USDCx before settlement
    // ═══════════════════════════════════════════════════

    fn cancel_buy(
        intent: TradeIntent,
    ) -> Final {
        assert(intent.intent_type == 0u8);
        let amount: u128 = intent.amount;
        let epoch: u64 = intent.epoch;
        let caller: address = self.caller;

        let (compliance_rec, usdcx_tok, refund_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(caller, amount);

        return final {
            refund_future.run();

            let settled: bool = Mapping::get_or_use(epoch_settled, epoch, false);
            assert(!settled);

            let current_volume: u128 = Mapping::get_or_use(epoch_buy_volume, epoch, 0u128);
            let new_volume: u128 = current_volume >= amount ? current_volume - amount : 0u128;
            Mapping::set(epoch_buy_volume, epoch, new_volume);
        };
    }

    // ═══════════════════════════════════════════════════
    // 7. CANCEL SELL INTENT — Return ALEO before settlement
    // ═══════════════════════════════════════════════════

    fn cancel_sell(
        intent: TradeIntent,
    ) -> Final {
        assert(intent.intent_type == 1u8);
        let amount: u64 = intent.amount as u64;
        let epoch: u64 = intent.epoch;
        let caller: address = self.caller;

        let (return_credits, refund_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_public_to_private(caller, amount);

        return final {
            refund_future.run();

            let settled: bool = Mapping::get_or_use(epoch_settled, epoch, false);
            assert(!settled);

            let current_volume: u128 = Mapping::get_or_use(epoch_sell_volume, epoch, 0u128);
            let amount_u128: u128 = amount as u128;
            let new_volume: u128 = current_volume >= amount_u128 ? current_volume - amount_u128 : 0u128;
            Mapping::set(epoch_sell_volume, epoch, new_volume);
        };
    }

    // ═══════════════════════════════════════════════════
    // 8. PAUSE DARK POOL
    // ═══════════════════════════════════════════════════

    fn pause_darkpool() -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(darkpool_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(darkpool_paused, 0u8, true);
        };
    }

    // ═══════════════════════════════════════════════════
    // 9. RESUME DARK POOL
    // ═══════════════════════════════════════════════════

    fn resume_darkpool() -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(darkpool_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(darkpool_paused, 0u8, false);
        };
    }

}
