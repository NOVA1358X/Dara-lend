import credits.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_stablecoin.aleo;

program dara_lend_v8_credits.aleo {

    // ═══════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════

    const SCALE: u128 = 1_000_000u128;
    const LTV_BPS: u128 = 7_000u128;
    const LIQ_BPS: u128 = 8_000u128;
    const BPS: u128 = 10_000u128;
    const MIN_COLLATERAL_STABLE: u128 = 100_000u128;
    const FEE_BPS: u128 = 50u128;
    const LIQUIDATION_BONUS_BPS: u128 = 500u128;
    const MAX_TOTAL_BORROWED: u128 = 100_000_000_000u128;
    const MAX_ORACLE_ASSETS: u8 = 6u8;
    const MAX_PRICE_DEVIATION_BPS: u64 = 1_500u64;
    const MIN_UPDATE_INTERVAL: u32 = 5u32;

    // ═══════════════════════════════════════════════════
    // RECORDS
    // ═══════════════════════════════════════════════════

    record CollateralReceipt {
        owner: address,
        collateral_amount: u64,
        collateral_amount_u128: u128,
        token_type: u8,
        deposit_block: u32,
        nonce_hash: field,
    }

    record DebtPosition {
        owner: address,
        collateral_amount: u64,
        collateral_amount_u128: u128,
        collateral_token: u8,
        debt_amount: u128,
        debt_token: u8,
        liquidation_price: u64,
        loan_id: field,
    }

    record LiquidationAuth {
        owner: address,
        loan_id: field,
        collateral_amount: u64,
        collateral_amount_u128: u128,
        collateral_token: u8,
        debt_amount: u128,
        debt_token: u8,
        liquidation_price: u64,
        borrower_hash: field,
    }

    record RepaymentReceipt {
        owner: address,
        amount_repaid: u128,
        collateral_returned: u64,
        collateral_returned_u128: u128,
        collateral_token: u8,
        loan_id: field,
    }

    record LiquidationReceipt {
        owner: address,
        loan_id: field,
        collateral_seized: u64,
        collateral_seized_u128: u128,
        collateral_token: u8,
        debt_covered: u128,
    }

    // ═══════════════════════════════════════════════════
    // MAPPINGS
    // ═══════════════════════════════════════════════════

    mapping vault_collateral_usdcx: u8 => u128;
    mapping vault_collateral_usad: u8 => u128;
    mapping pool_total_borrowed: u8 => u128;
    mapping loan_count: u8 => u64;
    mapping active_loans: field => bool;
    mapping oracle_price: u8 => u64;
    mapping price_update_block: u8 => u32;
    mapping price_round: u8 => u64;
    mapping used_nonces: field => bool;
    mapping credits_admin: u8 => address;
    mapping total_fees_collected: u8 => u128;
    mapping credits_paused: u8 => bool;

    // ═══════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════

    @custom
    constructor() {
        Mapping::set(credits_admin, 0u8, aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8);
        Mapping::set(oracle_price, 0u8, 1_000_000u64);
        Mapping::set(oracle_price, 1u8, 1_000_000u64);
        Mapping::set(oracle_price, 2u8, 1_000_000u64);
        Mapping::set(credits_paused, 0u8, false);
    }

    // ═══════════════════════════════════════════════════
    // 1. UPDATE ORACLE PRICE
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
            let admin: address = Mapping::get(credits_admin, 0u8);
            assert_eq(caller, admin);

            let current_round: u64 = Mapping::get_or_use(price_round, token_id, 0u64);
            assert(round > current_round);

            let last_update: u32 = Mapping::get_or_use(price_update_block, token_id, 0u32);
            let elapsed: u32 = block.height - last_update;
            let interval_ok: bool = last_update == 0u32 || elapsed >= MIN_UPDATE_INTERVAL;
            assert(interval_ok);

            Mapping::set(oracle_price, token_id, new_price);
            Mapping::set(price_update_block, token_id, block.height);
            Mapping::set(price_round, token_id, round);
        };
    }

    // ═══════════════════════════════════════════════════
    // 2. EMERGENCY PAUSE
    // ═══════════════════════════════════════════════════

    fn emergency_pause() -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(credits_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(credits_paused, 0u8, true);
        };
    }

    // ═══════════════════════════════════════════════════
    // 3. RESUME
    // ═══════════════════════════════════════════════════

    fn resume_protocol() -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(credits_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(credits_paused, 0u8, false);
        };
    }

    // ═══════════════════════════════════════════════════
    // 4. SUPPLY USDCx COLLATERAL
    // ═══════════════════════════════════════════════════

    fn supply_usdcx_collateral(
        input_token: test_usdcx_stablecoin.aleo::Token,
        merkle_proof: [test_usdcx_stablecoin.aleo::MerkleProof; 2u32],
        amount: u128,
        nonce: field,
    ) -> (CollateralReceipt, Final) {
        assert(amount >= MIN_COLLATERAL_STABLE);

        let signer_field: field = BHP256::hash_to_field(self.signer);
        let nonce_hash: field = BHP256::hash_to_field(nonce + signer_field);

        let receipt: CollateralReceipt = CollateralReceipt {
            owner: self.signer,
            collateral_amount: 0u64,
            collateral_amount_u128: amount,
            token_type: 1u8,
            deposit_block: 0u32,
            nonce_hash: nonce_hash,
        };

        let (compliance_rec, change_tok, usdcx_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_private_to_public(self.address, amount, input_token, merkle_proof);

        return (receipt, final {
            usdcx_future.run();

            let paused: bool = Mapping::get_or_use(credits_paused, 0u8, false);
            assert(!paused);

            let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
            assert(!nonce_used);
            Mapping::set(used_nonces, nonce_hash, true);

            let current: u128 = Mapping::get_or_use(vault_collateral_usdcx, 0u8, 0u128);
            Mapping::set(vault_collateral_usdcx, 0u8, current + amount);
        });
    }

    // ═══════════════════════════════════════════════════
    // 5. SUPPLY USAD COLLATERAL
    // ═══════════════════════════════════════════════════

    fn supply_usad_collateral(
        input_token: test_usad_stablecoin.aleo::Token,
        merkle_proof: [test_usad_stablecoin.aleo::MerkleProof; 2u32],
        amount: u128,
        nonce: field,
    ) -> (CollateralReceipt, Final) {
        assert(amount >= MIN_COLLATERAL_STABLE);

        let signer_field: field = BHP256::hash_to_field(self.signer);
        let nonce_hash: field = BHP256::hash_to_field(nonce + signer_field);

        let receipt: CollateralReceipt = CollateralReceipt {
            owner: self.signer,
            collateral_amount: 0u64,
            collateral_amount_u128: amount,
            token_type: 2u8,
            deposit_block: 0u32,
            nonce_hash: nonce_hash,
        };

        let (compliance_rec, change_tok, usad_future): (test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, Final) =
            test_usad_stablecoin.aleo::transfer_private_to_public(self.address, amount, input_token, merkle_proof);

        return (receipt, final {
            usad_future.run();

            let paused: bool = Mapping::get_or_use(credits_paused, 0u8, false);
            assert(!paused);

            let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
            assert(!nonce_used);
            Mapping::set(used_nonces, nonce_hash, true);

            let current: u128 = Mapping::get_or_use(vault_collateral_usad, 0u8, 0u128);
            Mapping::set(vault_collateral_usad, 0u8, current + amount);
        });
    }

    // ═══════════════════════════════════════════════════
    // 6. BORROW CREDITS — ALEO against stablecoin collateral
    // ═══════════════════════════════════════════════════

    fn borrow_credits(
        collateral_record: CollateralReceipt,
        borrow_amount: u64,
        current_col_price: u64,
        current_aleo_price: u64,
        orchestrator: address,
    ) -> (DebtPosition, LiquidationAuth, Final) {
        assert(borrow_amount > 0u64);
        assert(collateral_record.token_type == 1u8 || collateral_record.token_type == 2u8);

        let col_u128: u128 = collateral_record.collateral_amount_u128;
        let col_value: u128 = col_u128 * (current_col_price as u128) / SCALE;
        let borrow_u128: u128 = borrow_amount as u128;
        let borrow_value: u128 = borrow_u128 * (current_aleo_price as u128) / SCALE;
        let max_borrow_value: u128 = col_value * LTV_BPS / BPS;
        assert(borrow_value <= max_borrow_value);

        let fee_u128: u128 = borrow_u128 * FEE_BPS / BPS;
        let net_borrow: u64 = (borrow_u128 - fee_u128) as u64;
        let liq_price_u128: u128 = borrow_value * BPS * SCALE / (col_u128 * LIQ_BPS);
        let liquidation_price: u64 = liq_price_u128 as u64;

        let loan_id: field = BHP256::hash_to_field(collateral_record.nonce_hash);
        let borrower_hash: field = BHP256::hash_to_field(self.signer);
        let col_amount_u128: u128 = collateral_record.collateral_amount_u128;
        let col_token_type: u8 = collateral_record.token_type;

        let debt: DebtPosition = DebtPosition {
            owner: self.signer,
            collateral_amount: 0u64,
            collateral_amount_u128: col_amount_u128,
            collateral_token: col_token_type,
            debt_amount: borrow_u128,
            debt_token: 0u8,
            liquidation_price: liquidation_price,
            loan_id: loan_id,
        };

        let liq_auth: LiquidationAuth = LiquidationAuth {
            owner: orchestrator,
            loan_id: loan_id,
            collateral_amount: 0u64,
            collateral_amount_u128: col_amount_u128,
            collateral_token: col_token_type,
            debt_amount: borrow_u128,
            debt_token: 0u8,
            liquidation_price: liquidation_price,
            borrower_hash: borrower_hash,
        };

        let caller: address = self.caller;
        let (borrow_credits_out, borrow_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_public_to_private(caller, net_borrow);

        return (debt, liq_auth, final {
            borrow_future.run();

            let paused: bool = Mapping::get_or_use(credits_paused, 0u8, false);
            assert(!paused);

            let stored_col_price: u64 = Mapping::get(oracle_price, col_token_type);
            assert_eq(current_col_price, stored_col_price);
            let stored_aleo_price: u64 = Mapping::get(oracle_price, 0u8);
            assert_eq(current_aleo_price, stored_aleo_price);

            let current_borrowed: u128 = Mapping::get_or_use(pool_total_borrowed, 0u8, 0u128);
            assert(current_borrowed + borrow_u128 <= MAX_TOTAL_BORROWED);
            Mapping::set(pool_total_borrowed, 0u8, current_borrowed + borrow_u128);

            let current_fees: u128 = Mapping::get_or_use(total_fees_collected, 0u8, 0u128);
            Mapping::set(total_fees_collected, 0u8, current_fees + fee_u128);

            let current_loans: u64 = Mapping::get_or_use(loan_count, 0u8, 0u64);
            Mapping::set(loan_count, 0u8, current_loans + 1u64);

            let loan_key: field = BHP256::hash_to_field(loan_id);
            Mapping::set(active_loans, loan_key, true);
        });
    }

    // ═══════════════════════════════════════════════════
    // 7. REPAY CREDITS — USDCx collateral returned
    // ═══════════════════════════════════════════════════

    fn repay_credits_usdcx(
        debt_record: DebtPosition,
        input_credits: credits.aleo::credits,
    ) -> (RepaymentReceipt, Final) {
        assert(debt_record.debt_token == 0u8);
        assert(debt_record.collateral_token == 1u8);

        let debt_amount: u128 = debt_record.debt_amount;
        let collateral_u128: u128 = debt_record.collateral_amount_u128;
        let loan_id: field = debt_record.loan_id;
        let repay_amount: u64 = debt_amount as u64;

        let receipt: RepaymentReceipt = RepaymentReceipt {
            owner: self.signer,
            amount_repaid: debt_amount,
            collateral_returned: 0u64,
            collateral_returned_u128: collateral_u128,
            collateral_token: 1u8,
            loan_id: loan_id,
        };

        let caller: address = self.caller;
        let (change_credits, repay_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_private_to_public(input_credits, self.address, repay_amount);

        let (compliance_rec, usdcx_token, return_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(caller, collateral_u128);

        return (receipt, final {
            repay_future.run();
            return_future.run();

            let current_borrowed: u128 = Mapping::get(pool_total_borrowed, 0u8);
            Mapping::set(pool_total_borrowed, 0u8, current_borrowed - debt_amount);

            let current_loans: u64 = Mapping::get(loan_count, 0u8);
            Mapping::set(loan_count, 0u8, current_loans - 1u64);

            let current_collateral: u128 = Mapping::get(vault_collateral_usdcx, 0u8);
            Mapping::set(vault_collateral_usdcx, 0u8, current_collateral - collateral_u128);

            let loan_key: field = BHP256::hash_to_field(loan_id);
            Mapping::set(active_loans, loan_key, false);
        });
    }

    // ═══════════════════════════════════════════════════
    // 8. REPAY CREDITS — USAD collateral returned
    // ═══════════════════════════════════════════════════

    fn repay_credits_usad(
        debt_record: DebtPosition,
        input_credits: credits.aleo::credits,
    ) -> (RepaymentReceipt, Final) {
        assert(debt_record.debt_token == 0u8);
        assert(debt_record.collateral_token == 2u8);

        let debt_amount: u128 = debt_record.debt_amount;
        let collateral_u128: u128 = debt_record.collateral_amount_u128;
        let loan_id: field = debt_record.loan_id;
        let repay_amount: u64 = debt_amount as u64;

        let receipt: RepaymentReceipt = RepaymentReceipt {
            owner: self.signer,
            amount_repaid: debt_amount,
            collateral_returned: 0u64,
            collateral_returned_u128: collateral_u128,
            collateral_token: 2u8,
            loan_id: loan_id,
        };

        let caller: address = self.caller;
        let (change_credits, repay_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_private_to_public(input_credits, self.address, repay_amount);

        let (compliance_rec, usad_token, return_future): (test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, Final) =
            test_usad_stablecoin.aleo::transfer_public_to_private(caller, collateral_u128);

        return (receipt, final {
            repay_future.run();
            return_future.run();

            let current_borrowed: u128 = Mapping::get(pool_total_borrowed, 0u8);
            Mapping::set(pool_total_borrowed, 0u8, current_borrowed - debt_amount);

            let current_loans: u64 = Mapping::get(loan_count, 0u8);
            Mapping::set(loan_count, 0u8, current_loans - 1u64);

            let current_collateral: u128 = Mapping::get(vault_collateral_usad, 0u8);
            Mapping::set(vault_collateral_usad, 0u8, current_collateral - collateral_u128);

            let loan_key: field = BHP256::hash_to_field(loan_id);
            Mapping::set(active_loans, loan_key, false);
        });
    }

    // ═══════════════════════════════════════════════════
    // 9. LIQUIDATE USDCx — USDCx collateral positions
    // ═══════════════════════════════════════════════════

    fn liquidate_usdcx(
        auth: LiquidationAuth,
        current_oracle_price: u64,
    ) -> (LiquidationReceipt, Final) {
        assert(current_oracle_price <= auth.liquidation_price);
        assert(auth.collateral_token == 1u8);

        let col_u128: u128 = auth.collateral_amount_u128;
        let bonus: u128 = col_u128 * LIQUIDATION_BONUS_BPS / BPS;
        let total_seize: u128 = col_u128 + bonus;
        let debt_amount: u128 = auth.debt_amount;
        let loan_id: field = auth.loan_id;

        let receipt: LiquidationReceipt = LiquidationReceipt {
            owner: self.signer,
            loan_id: loan_id,
            collateral_seized: 0u64,
            collateral_seized_u128: total_seize,
            collateral_token: 1u8,
            debt_covered: debt_amount,
        };

        let caller: address = self.caller;
        let (compliance_rec, seize_token, seize_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(caller, total_seize);

        return (receipt, final {
            seize_future.run();

            let stored_price: u64 = Mapping::get(oracle_price, 1u8);
            assert_eq(current_oracle_price, stored_price);

            let current_collateral: u128 = Mapping::get(vault_collateral_usdcx, 0u8);
            Mapping::set(vault_collateral_usdcx, 0u8, current_collateral - total_seize);

            let current_borrowed: u128 = Mapping::get(pool_total_borrowed, 0u8);
            Mapping::set(pool_total_borrowed, 0u8, current_borrowed - debt_amount);

            let current_loans: u64 = Mapping::get(loan_count, 0u8);
            Mapping::set(loan_count, 0u8, current_loans - 1u64);

            let loan_key: field = BHP256::hash_to_field(loan_id);
            Mapping::set(active_loans, loan_key, false);
        });
    }

    // ═══════════════════════════════════════════════════
    // 10. LIQUIDATE USAD — USAD collateral positions
    // ═══════════════════════════════════════════════════

    fn liquidate_usad(
        auth: LiquidationAuth,
        current_oracle_price: u64,
    ) -> (LiquidationReceipt, Final) {
        assert(current_oracle_price <= auth.liquidation_price);
        assert(auth.collateral_token == 2u8);

        let col_u128: u128 = auth.collateral_amount_u128;
        let bonus: u128 = col_u128 * LIQUIDATION_BONUS_BPS / BPS;
        let total_seize: u128 = col_u128 + bonus;
        let debt_amount: u128 = auth.debt_amount;
        let loan_id: field = auth.loan_id;

        let receipt: LiquidationReceipt = LiquidationReceipt {
            owner: self.signer,
            loan_id: loan_id,
            collateral_seized: 0u64,
            collateral_seized_u128: total_seize,
            collateral_token: 2u8,
            debt_covered: debt_amount,
        };

        let caller: address = self.caller;
        let (compliance_rec, seize_token, seize_future): (test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, Final) =
            test_usad_stablecoin.aleo::transfer_public_to_private(caller, total_seize);

        return (receipt, final {
            seize_future.run();

            let stored_price: u64 = Mapping::get(oracle_price, 2u8);
            assert_eq(current_oracle_price, stored_price);

            let current_collateral: u128 = Mapping::get(vault_collateral_usad, 0u8);
            Mapping::set(vault_collateral_usad, 0u8, current_collateral - total_seize);

            let current_borrowed: u128 = Mapping::get(pool_total_borrowed, 0u8);
            Mapping::set(pool_total_borrowed, 0u8, current_borrowed - debt_amount);

            let current_loans: u64 = Mapping::get(loan_count, 0u8);
            Mapping::set(loan_count, 0u8, current_loans - 1u64);

            let loan_key: field = BHP256::hash_to_field(loan_id);
            Mapping::set(active_loans, loan_key, false);
        });
    }

    // ═══════════════════════════════════════════════════
    // 11. WITHDRAW USDCx COLLATERAL
    // ═══════════════════════════════════════════════════

    fn withdraw_usdcx_collateral(
        receipt: CollateralReceipt,
    ) -> Final {
        assert(receipt.token_type == 1u8);
        let col_amount: u128 = receipt.collateral_amount_u128;
        let caller: address = self.caller;

        let (compliance_rec, usdcx_token, return_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(caller, col_amount);

        return final {
            return_future.run();

            let current_collateral: u128 = Mapping::get(vault_collateral_usdcx, 0u8);
            Mapping::set(vault_collateral_usdcx, 0u8, current_collateral - col_amount);
        };
    }

    // ═══════════════════════════════════════════════════
    // 12. WITHDRAW USAD COLLATERAL
    // ═══════════════════════════════════════════════════

    fn withdraw_usad_collateral(
        receipt: CollateralReceipt,
    ) -> Final {
        assert(receipt.token_type == 2u8);
        let col_amount: u128 = receipt.collateral_amount_u128;
        let caller: address = self.caller;

        let (compliance_rec, usad_token, return_future): (test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, Final) =
            test_usad_stablecoin.aleo::transfer_public_to_private(caller, col_amount);

        return final {
            return_future.run();

            let current_collateral: u128 = Mapping::get(vault_collateral_usad, 0u8);
            Mapping::set(vault_collateral_usad, 0u8, current_collateral - col_amount);
        };
    }
}
