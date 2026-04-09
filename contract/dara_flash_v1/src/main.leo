import credits.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_stablecoin.aleo;

program dara_flash_v1.aleo {

    // ═══════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════

    const SCALE: u128 = 1_000_000u128;
    const BPS: u128 = 10_000u128;
    const FLASH_FEE_BPS: u128 = 9u128;
    const COLLATERAL_RATIO_BPS: u128 = 10_200u128;
    const MIN_FLASH_AMOUNT: u128 = 100_000u128;
    const MIN_FLASH_ALEO: u64 = 100_000u64;
    const MAX_FLASH_AMOUNT: u128 = 10_000_000_000u128;
    const MAX_ORACLE_ASSETS: u8 = 6u8;
    const MAX_PRICE_DEVIATION_BPS: u64 = 1_500u64;
    const MIN_UPDATE_INTERVAL: u32 = 5u32;

    // ═══════════════════════════════════════════════════
    // RECORDS — All loan data is FULLY PRIVATE
    // ═══════════════════════════════════════════════════

    record FlashLoanReceipt {
        owner: address,
        borrow_amount: u128,
        borrow_token: u8,
        collateral_amount: u128,
        collateral_token: u8,
        fee_amount: u128,
        nonce_hash: field,
    }

    record FlashRepayReceipt {
        owner: address,
        amount_repaid: u128,
        collateral_returned: u128,
        collateral_token: u8,
        nonce_hash: field,
    }

    // ═══════════════════════════════════════════════════
    // MAPPINGS — Only aggregate stats, NO user identity
    // ═══════════════════════════════════════════════════

    mapping flash_admin: u8 => address;
    mapping flash_paused: u8 => bool;
    mapping oracle_price: u8 => u64;
    mapping price_round: u8 => u64;
    mapping price_update_block: u8 => u32;
    mapping price_history: u8 => u64;
    mapping total_flash_loans: u8 => u64;
    mapping total_flash_volume: u8 => u128;
    mapping total_fees_earned: u8 => u128;
    mapping active_flash_count: u8 => u64;
    mapping used_nonces: field => bool;

    // ═══════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════

    @custom
    constructor() {
        Mapping::set(flash_admin, 0u8, aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8);
        Mapping::set(flash_paused, 0u8, false);
        Mapping::set(oracle_price, 0u8, 1_000_000u64);
        Mapping::set(oracle_price, 1u8, 1_000_000u64);
        Mapping::set(oracle_price, 2u8, 1_000_000u64);
        Mapping::set(price_history, 0u8, 1_000_000u64);
        Mapping::set(total_flash_loans, 0u8, 0u64);
        Mapping::set(total_flash_volume, 0u8, 0u128);
        Mapping::set(total_fees_earned, 0u8, 0u128);
        Mapping::set(active_flash_count, 0u8, 0u64);
    }

    // ═══════════════════════════════════════════════════
    // 1. UPDATE ORACLE PRICE — Admin-only price feed
    // ═══════════════════════════════════════════════════

    fn update_oracle_price(
        token_id: u8,
        new_price: u64,
        round: u64,
    ) -> Final {
        assert(new_price > 0u64);
        assert(round > 0u64);
        assert(token_id < MAX_ORACLE_ASSETS);
        let caller: address = self.caller;

        return final {
            let admin: address = Mapping::get(flash_admin, 0u8);
            assert_eq(caller, admin);

            let current_round: u64 = Mapping::get_or_use(price_round, token_id, 0u64);
            assert(round > current_round);

            let last_update: u32 = Mapping::get_or_use(price_update_block, token_id, 0u32);
            let elapsed: u32 = block.height - last_update;
            let interval_ok: bool = last_update == 0u32 || elapsed >= MIN_UPDATE_INTERVAL;
            assert(interval_ok);

            let old_price: u64 = Mapping::get_or_use(price_history, token_id, new_price);
            let higher: u64 = new_price >= old_price ? new_price : old_price;
            let lower: u64 = new_price < old_price ? new_price : old_price;
            let diff: u64 = higher - lower;
            let deviation_bps: u64 = old_price > 0u64 ? diff * 10_000u64 / old_price : 0u64;
            let deviation_ok: bool = current_round == 0u64 || deviation_bps <= MAX_PRICE_DEVIATION_BPS;
            assert(deviation_ok);

            Mapping::set(oracle_price, token_id, new_price);
            Mapping::set(price_update_block, token_id, block.height);
            Mapping::set(price_round, token_id, round);
            Mapping::set(price_history, token_id, new_price);
        };
    }

    // ═══════════════════════════════════════════════════
    // 2. FLASH BORROW USDCx — Deposit ALEO, get USDCx instantly
    //    Fee: 0.09% (9 BPS) — lowest on Aleo
    //    Collateral: 102% of borrow value in ALEO
    // ═══════════════════════════════════════════════════

    fn flash_borrow_usdcx(
        input_credits: credits.aleo::credits,
        collateral_aleo: u64,
        borrow_amount: u128,
        current_price: u64,
        nonce: field,
    ) -> (FlashLoanReceipt, Final) {
        assert(borrow_amount >= MIN_FLASH_AMOUNT);
        assert(borrow_amount <= MAX_FLASH_AMOUNT);
        assert(collateral_aleo >= MIN_FLASH_ALEO);

        let fee: u128 = borrow_amount * FLASH_FEE_BPS / BPS;
        let signer_field: field = BHP256::hash_to_field(self.signer);
        let nonce_hash: field = BHP256::hash_to_field(nonce + signer_field);

        let receipt: FlashLoanReceipt = FlashLoanReceipt {
            owner: self.signer,
            borrow_amount: borrow_amount,
            borrow_token: 1u8,
            collateral_amount: collateral_aleo as u128,
            collateral_token: 0u8,
            fee_amount: fee,
            nonce_hash: nonce_hash,
        };

        let (change_credits, credit_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_private_to_public(input_credits, self.address, collateral_aleo);

        return (receipt, final {
            credit_future.run();

            let paused: bool = Mapping::get_or_use(flash_paused, 0u8, false);
            assert(!paused);

            let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
            assert(!nonce_used);
            Mapping::set(used_nonces, nonce_hash, true);

            let stored_price: u64 = Mapping::get(oracle_price, 0u8);
            assert_eq(current_price, stored_price);

            let collateral_value: u128 = (collateral_aleo as u128) * (current_price as u128) / SCALE;
            let required_collateral: u128 = borrow_amount * COLLATERAL_RATIO_BPS / BPS;
            assert(collateral_value >= required_collateral);

            let count: u64 = Mapping::get_or_use(total_flash_loans, 0u8, 0u64);
            Mapping::set(total_flash_loans, 0u8, count + 1u64);

            let vol: u128 = Mapping::get_or_use(total_flash_volume, 0u8, 0u128);
            Mapping::set(total_flash_volume, 0u8, vol + borrow_amount);

            let active: u64 = Mapping::get_or_use(active_flash_count, 0u8, 0u64);
            Mapping::set(active_flash_count, 0u8, active + 1u64);
        });
    }

    // ═══════════════════════════════════════════════════
    // 3. FLASH CLAIM USDCx — Use receipt to claim borrowed USDCx
    // ═══════════════════════════════════════════════════

    fn flash_claim_usdcx(
        receipt: FlashLoanReceipt,
    ) -> (FlashLoanReceipt, Final) {
        assert(receipt.borrow_token == 1u8);
        let claim_amount: u128 = receipt.borrow_amount;
        let caller: address = self.caller;

        let new_receipt: FlashLoanReceipt = FlashLoanReceipt {
            owner: receipt.owner,
            borrow_amount: receipt.borrow_amount,
            borrow_token: receipt.borrow_token,
            collateral_amount: receipt.collateral_amount,
            collateral_token: receipt.collateral_token,
            fee_amount: receipt.fee_amount,
            nonce_hash: receipt.nonce_hash,
        };

        let (compliance_rec, usdcx_tok, send_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(caller, claim_amount);

        return (new_receipt, final {
            send_future.run();
        });
    }

    // ═══════════════════════════════════════════════════
    // 4. FLASH REPAY USDCx — Return USDCx + fee
    // ═══════════════════════════════════════════════════

    fn flash_repay_usdcx(
        receipt: FlashLoanReceipt,
        input_token: test_usdcx_stablecoin.aleo::Token,
        merkle_proof: [test_usdcx_stablecoin.aleo::MerkleProof; 2u32],
    ) -> (FlashRepayReceipt, Final) {
        assert(receipt.borrow_token == 1u8);
        let repay_amount: u128 = receipt.borrow_amount + receipt.fee_amount;
        let fee: u128 = receipt.fee_amount;
        let nh: field = receipt.nonce_hash;

        let repay_receipt: FlashRepayReceipt = FlashRepayReceipt {
            owner: self.signer,
            amount_repaid: repay_amount,
            collateral_returned: receipt.collateral_amount,
            collateral_token: receipt.collateral_token,
            nonce_hash: nh,
        };

        let (compliance_rec, change_tok, repay_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_private_to_public(self.address, repay_amount, input_token, merkle_proof);

        return (repay_receipt, final {
            repay_future.run();

            let fees: u128 = Mapping::get_or_use(total_fees_earned, 0u8, 0u128);
            Mapping::set(total_fees_earned, 0u8, fees + fee);

            let active: u64 = Mapping::get_or_use(active_flash_count, 0u8, 0u64);
            let new_active: u64 = active > 0u64 ? active - 1u64 : 0u64;
            Mapping::set(active_flash_count, 0u8, new_active);
        });
    }

    // ═══════════════════════════════════════════════════
    // 5. FLASH WITHDRAW ALEO — Get ALEO collateral back after repay
    // ═══════════════════════════════════════════════════

    fn flash_withdraw_aleo(
        repay_receipt: FlashRepayReceipt,
    ) -> Final {
        assert(repay_receipt.collateral_token == 0u8);
        let col_amount: u64 = repay_receipt.collateral_returned as u64;
        let caller: address = self.caller;

        let (return_credits, return_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_public_to_private(caller, col_amount);

        return final {
            return_future.run();
        };
    }

    // ═══════════════════════════════════════════════════
    // 6. FLASH BORROW ALEO — Deposit USDCx, get ALEO instantly
    // ═══════════════════════════════════════════════════

    fn flash_borrow_aleo(
        input_token: test_usdcx_stablecoin.aleo::Token,
        merkle_proof: [test_usdcx_stablecoin.aleo::MerkleProof; 2u32],
        collateral_usdcx: u128,
        borrow_amount: u64,
        current_price: u64,
        nonce: field,
    ) -> (FlashLoanReceipt, Final) {
        assert(collateral_usdcx >= MIN_FLASH_AMOUNT);
        assert(borrow_amount >= MIN_FLASH_ALEO);

        let borrow_u128: u128 = borrow_amount as u128;
        let fee: u128 = borrow_u128 * FLASH_FEE_BPS / BPS;
        let signer_field: field = BHP256::hash_to_field(self.signer);
        let nonce_hash: field = BHP256::hash_to_field(nonce + signer_field);

        let receipt: FlashLoanReceipt = FlashLoanReceipt {
            owner: self.signer,
            borrow_amount: borrow_u128,
            borrow_token: 0u8,
            collateral_amount: collateral_usdcx,
            collateral_token: 1u8,
            fee_amount: fee,
            nonce_hash: nonce_hash,
        };

        let (compliance_rec, change_tok, deposit_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_private_to_public(self.address, collateral_usdcx, input_token, merkle_proof);

        return (receipt, final {
            deposit_future.run();

            let paused: bool = Mapping::get_or_use(flash_paused, 0u8, false);
            assert(!paused);

            let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
            assert(!nonce_used);
            Mapping::set(used_nonces, nonce_hash, true);

            let stored_price: u64 = Mapping::get(oracle_price, 0u8);
            assert_eq(current_price, stored_price);

            let borrow_value: u128 = borrow_u128 * (current_price as u128) / SCALE;
            let required_collateral: u128 = borrow_value * COLLATERAL_RATIO_BPS / BPS;
            assert(collateral_usdcx >= required_collateral);

            let count: u64 = Mapping::get_or_use(total_flash_loans, 0u8, 0u64);
            Mapping::set(total_flash_loans, 0u8, count + 1u64);

            let vol: u128 = Mapping::get_or_use(total_flash_volume, 0u8, 0u128);
            Mapping::set(total_flash_volume, 0u8, vol + borrow_u128);

            let active: u64 = Mapping::get_or_use(active_flash_count, 0u8, 0u64);
            Mapping::set(active_flash_count, 0u8, active + 1u64);
        });
    }

    // ═══════════════════════════════════════════════════
    // 7. FLASH CLAIM ALEO — Claim borrowed ALEO credits
    // ═══════════════════════════════════════════════════

    fn flash_claim_aleo(
        receipt: FlashLoanReceipt,
    ) -> (FlashLoanReceipt, Final) {
        assert(receipt.borrow_token == 0u8);
        let claim_amount: u64 = receipt.borrow_amount as u64;
        let caller: address = self.caller;

        let new_receipt: FlashLoanReceipt = FlashLoanReceipt {
            owner: receipt.owner,
            borrow_amount: receipt.borrow_amount,
            borrow_token: receipt.borrow_token,
            collateral_amount: receipt.collateral_amount,
            collateral_token: receipt.collateral_token,
            fee_amount: receipt.fee_amount,
            nonce_hash: receipt.nonce_hash,
        };

        let (return_credits, send_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_public_to_private(caller, claim_amount);

        return (new_receipt, final {
            send_future.run();
        });
    }

    // ═══════════════════════════════════════════════════
    // 8. FLASH REPAY ALEO — Return ALEO + fee
    // ═══════════════════════════════════════════════════

    fn flash_repay_aleo(
        receipt: FlashLoanReceipt,
        input_credits: credits.aleo::credits,
    ) -> (FlashRepayReceipt, Final) {
        assert(receipt.borrow_token == 0u8);
        let repay_amount: u64 = (receipt.borrow_amount + receipt.fee_amount) as u64;
        let fee: u128 = receipt.fee_amount;
        let nh: field = receipt.nonce_hash;

        let repay_receipt: FlashRepayReceipt = FlashRepayReceipt {
            owner: self.signer,
            amount_repaid: repay_amount as u128,
            collateral_returned: receipt.collateral_amount,
            collateral_token: receipt.collateral_token,
            nonce_hash: nh,
        };

        let (change_credits, repay_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_private_to_public(input_credits, self.address, repay_amount);

        return (repay_receipt, final {
            repay_future.run();

            let fees: u128 = Mapping::get_or_use(total_fees_earned, 0u8, 0u128);
            Mapping::set(total_fees_earned, 0u8, fees + fee);

            let active: u64 = Mapping::get_or_use(active_flash_count, 0u8, 0u64);
            let new_active: u64 = active > 0u64 ? active - 1u64 : 0u64;
            Mapping::set(active_flash_count, 0u8, new_active);
        });
    }

    // ═══════════════════════════════════════════════════
    // 9. FLASH WITHDRAW USDCx — Get USDCx collateral back
    // ═══════════════════════════════════════════════════

    fn flash_withdraw_usdcx(
        repay_receipt: FlashRepayReceipt,
    ) -> Final {
        assert(repay_receipt.collateral_token == 1u8);
        let col_amount: u128 = repay_receipt.collateral_returned;
        let caller: address = self.caller;

        let (compliance_rec, usdcx_tok, return_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(caller, col_amount);

        return final {
            return_future.run();
        };
    }

    // ═══════════════════════════════════════════════════
    // 10. PAUSE FLASH LOANS
    // ═══════════════════════════════════════════════════

    fn pause_flash() -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(flash_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(flash_paused, 0u8, true);
        };
    }

    // ═══════════════════════════════════════════════════
    // 11. RESUME FLASH LOANS
    // ═══════════════════════════════════════════════════

    fn resume_flash() -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(flash_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(flash_paused, 0u8, false);
        };
    }

}
