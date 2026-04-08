import credits.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_stablecoin.aleo;

program dara_lend_v8.aleo {

    // ═══════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════

    const SCALE: u128 = 1_000_000u128;
    const LTV_BPS: u128 = 7_000u128;
    const LIQ_BPS: u128 = 8_000u128;
    const BPS: u128 = 10_000u128;
    const MIN_COLLATERAL_ALEO: u64 = 100_000u64;
    const FEE_BPS: u128 = 50u128;
    const LIQUIDATION_BONUS_BPS: u128 = 500u128;
    const MAX_TOTAL_BORROWED: u128 = 100_000_000_000u128;
    const MAX_PRICE_DEVIATION_BPS: u64 = 1_500u64;
    const MIN_UPDATE_INTERVAL: u32 = 5u32;
    const BLOCKS_PER_YEAR: u128 = 2_628_000u128;
    const RESERVE_FACTOR_BPS: u128 = 1_000u128;
    const MAX_ORACLE_ASSETS: u8 = 6u8;
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

    mapping vault_collateral_aleo: u8 => u64;
    mapping pool_total_borrowed: u8 => u128;
    mapping loan_count: u8 => u64;
    mapping active_loans: field => bool;
    mapping oracle_price: u8 => u64;
    mapping price_update_block: u8 => u32;
    mapping price_round: u8 => u64;
    mapping price_history: u8 => u64;
    mapping used_nonces: field => bool;
    mapping protocol_admin: u8 => address;
    mapping total_fees_collected: u8 => u128;
    mapping protocol_paused: u8 => bool;
    mapping privacy_version: u8 => u64;
    mapping rate_base_bps: u8 => u64;
    mapping rate_slope1_bps: u8 => u64;
    mapping rate_slope2_bps: u8 => u64;
    mapping rate_optimal_util: u8 => u64;
    mapping last_accrual_block: u8 => u32;
    mapping supply_apy_bps: u8 => u64;
    mapping borrow_apy_bps: u8 => u64;

    // ═══════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════

    @custom
    constructor() {
        Mapping::set(protocol_admin, 0u8, aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8);
        Mapping::set(oracle_price, 0u8, 1_000_000u64);
        Mapping::set(oracle_price, 1u8, 1_000_000u64);
        Mapping::set(oracle_price, 2u8, 1_000_000u64);
        Mapping::set(price_history, 0u8, 1_000_000u64);
        Mapping::set(price_history, 1u8, 1_000_000u64);
        Mapping::set(price_history, 2u8, 1_000_000u64);
        Mapping::set(rate_base_bps, 0u8, 200u64);
        Mapping::set(rate_slope1_bps, 0u8, 400u64);
        Mapping::set(rate_slope2_bps, 0u8, 7_500u64);
        Mapping::set(rate_optimal_util, 0u8, 8_000u64);
        Mapping::set(privacy_version, 0u8, 4u64);
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
            let admin: address = Mapping::get(protocol_admin, 0u8);
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
    // 2. SET RATE PARAMS — Kink interest model
    // ═══════════════════════════════════════════════════

    fn set_rate_params(
        base_rate: u64,
        slope1: u64,
        slope2: u64,
        optimal_util: u64,
    ) -> Final {
        assert(optimal_util > 0u64);
        assert(optimal_util <= 10_000u64);
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(protocol_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(rate_base_bps, 0u8, base_rate);
            Mapping::set(rate_slope1_bps, 0u8, slope1);
            Mapping::set(rate_slope2_bps, 0u8, slope2);
            Mapping::set(rate_optimal_util, 0u8, optimal_util);
        };
    }

    // ═══════════════════════════════════════════════════
    // 3. EMERGENCY PAUSE
    // ═══════════════════════════════════════════════════

    fn emergency_pause() -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(protocol_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(protocol_paused, 0u8, true);
        };
    }

    // ═══════════════════════════════════════════════════
    // 4. RESUME PROTOCOL
    // ═══════════════════════════════════════════════════

    fn resume_protocol() -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(protocol_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(protocol_paused, 0u8, false);
        };
    }

    // ═══════════════════════════════════════════════════
    // 5. ACCRUE INTEREST — Two-slope kink rate model
    // ═══════════════════════════════════════════════════

    fn accrue_interest() -> Final {
        return final {
            let last_block: u32 = Mapping::get_or_use(last_accrual_block, 0u8, 0u32);
            let elapsed: u32 = block.height - last_block;
            let should_accrue: bool = elapsed > 0u32 && last_block > 0u32;

            let base_rate: u64 = Mapping::get_or_use(rate_base_bps, 0u8, 200u64);
            let slope1: u64 = Mapping::get_or_use(rate_slope1_bps, 0u8, 400u64);
            let slope2: u64 = Mapping::get_or_use(rate_slope2_bps, 0u8, 7_500u64);
            let optimal_util: u64 = Mapping::get_or_use(rate_optimal_util, 0u8, 8_000u64);

            let borrowed: u128 = Mapping::get_or_use(pool_total_borrowed, 0u8, 0u128);
            let aleo_collateral: u64 = Mapping::get_or_use(vault_collateral_aleo, 0u8, 0u64);
            let aleo_price: u64 = Mapping::get_or_use(oracle_price, 0u8, 1_000_000u64);
            let supply_value: u128 = (aleo_collateral as u128) * (aleo_price as u128) / SCALE;

            let util_bps: u128 = supply_value > 0u128 ? borrowed * BPS / supply_value : 0u128;
            let capped_util: u128 = util_bps > BPS ? BPS : util_bps;

            let optimal_u128: u128 = optimal_util as u128;
            let slope1_u128: u128 = slope1 as u128;
            let slope2_u128: u128 = slope2 as u128;
            let base_u128: u128 = base_rate as u128;

            let below_kink_rate: u128 = base_u128 + capped_util * slope1_u128 / optimal_u128;
            let excess_util: u128 = capped_util > optimal_u128 ? capped_util - optimal_u128 : 0u128;
            let remaining_bps: u128 = BPS - optimal_u128;
            let above_kink_extra: u128 = remaining_bps > 0u128 ? excess_util * slope2_u128 / remaining_bps : 0u128;
            let borrow_rate: u128 = capped_util <= optimal_u128 ? below_kink_rate : base_u128 + slope1_u128 + above_kink_extra;

            let supply_rate: u128 = borrow_rate * capped_util * (BPS - RESERVE_FACTOR_BPS) / BPS / BPS;

            let elapsed_u128: u128 = elapsed as u128;
            let interest: u128 = should_accrue ? borrowed * borrow_rate * elapsed_u128 / (BPS * BLOCKS_PER_YEAR) : 0u128;
            Mapping::set(pool_total_borrowed, 0u8, borrowed + interest);

            let reserve_interest: u128 = interest * RESERVE_FACTOR_BPS / BPS;
            let current_fees: u128 = Mapping::get_or_use(total_fees_collected, 0u8, 0u128);
            Mapping::set(total_fees_collected, 0u8, current_fees + reserve_interest);

            Mapping::set(borrow_apy_bps, 0u8, borrow_rate as u64);
            Mapping::set(supply_apy_bps, 0u8, supply_rate as u64);
            Mapping::set(last_accrual_block, 0u8, block.height);
        };
    }

    // ═══════════════════════════════════════════════════
    // 6. SUPPLY ALEO COLLATERAL
    // ═══════════════════════════════════════════════════

    fn supply_collateral(
        input_credits: credits.aleo::credits,
        amount: u64,
        nonce: field,
    ) -> (CollateralReceipt, Final) {
        assert(amount >= MIN_COLLATERAL_ALEO);

        let signer_field: field = BHP256::hash_to_field(self.signer);
        let nonce_hash: field = BHP256::hash_to_field(nonce + signer_field);

        let receipt: CollateralReceipt = CollateralReceipt {
            owner: self.signer,
            collateral_amount: amount,
            collateral_amount_u128: 0u128,
            token_type: 0u8,
            deposit_block: 0u32,
            nonce_hash: nonce_hash,
        };

        let (change_credits, credit_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_private_to_public(input_credits, self.address, amount);

        return (receipt, final {
            credit_future.run();

            let paused: bool = Mapping::get_or_use(protocol_paused, 0u8, false);
            assert(!paused);

            let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
            assert(!nonce_used);
            Mapping::set(used_nonces, nonce_hash, true);

            let current: u64 = Mapping::get_or_use(vault_collateral_aleo, 0u8, 0u64);
            Mapping::set(vault_collateral_aleo, 0u8, current + amount);
        });
    }


    // ═══════════════════════════════════════════════════
    // 9. BORROW USDCx — Against ALEO collateral
    // ═══════════════════════════════════════════════════

    fn borrow(
        collateral_record: CollateralReceipt,
        borrow_amount: u128,
        current_price: u64,
        orchestrator: address,
    ) -> (DebtPosition, LiquidationAuth, Final) {
        assert(borrow_amount > 0u128);
        assert(collateral_record.token_type == 0u8);

        let col_u128: u128 = collateral_record.collateral_amount as u128;
        let price_u128: u128 = current_price as u128;
        let col_value: u128 = col_u128 * price_u128 / SCALE;
        let max_borrow: u128 = col_value * LTV_BPS / BPS;
        assert(borrow_amount <= max_borrow);

        let fee: u128 = borrow_amount * FEE_BPS / BPS;
        let net_borrow: u128 = borrow_amount - fee;

        let liq_price_u128: u128 = borrow_amount * SCALE * BPS / (col_u128 * LIQ_BPS);
        let liquidation_price: u64 = liq_price_u128 as u64;

        let loan_id: field = BHP256::hash_to_field(collateral_record.nonce_hash);
        let borrower_hash: field = BHP256::hash_to_field(self.signer);
        let col_amount: u64 = collateral_record.collateral_amount;

        let debt: DebtPosition = DebtPosition {
            owner: self.signer,
            collateral_amount: col_amount,
            collateral_amount_u128: 0u128,
            collateral_token: 0u8,
            debt_amount: borrow_amount,
            debt_token: 1u8,
            liquidation_price: liquidation_price,
            loan_id: loan_id,
        };

        let liq_auth: LiquidationAuth = LiquidationAuth {
            owner: orchestrator,
            loan_id: loan_id,
            collateral_amount: col_amount,
            collateral_amount_u128: 0u128,
            collateral_token: 0u8,
            debt_amount: borrow_amount,
            debt_token: 1u8,
            liquidation_price: liquidation_price,
            borrower_hash: borrower_hash,
        };

        let caller: address = self.caller;
        let (compliance_rec, usdcx_token, borrow_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(caller, net_borrow);

        return (debt, liq_auth, final {
            borrow_future.run();

            let paused: bool = Mapping::get_or_use(protocol_paused, 0u8, false);
            assert(!paused);

            let stored_price: u64 = Mapping::get(oracle_price, 0u8);
            assert_eq(current_price, stored_price);

            let current_borrowed: u128 = Mapping::get_or_use(pool_total_borrowed, 0u8, 0u128);
            assert(current_borrowed + borrow_amount <= MAX_TOTAL_BORROWED);
            Mapping::set(pool_total_borrowed, 0u8, current_borrowed + borrow_amount);

            let current_fees: u128 = Mapping::get_or_use(total_fees_collected, 0u8, 0u128);
            Mapping::set(total_fees_collected, 0u8, current_fees + fee);

            let current_loans: u64 = Mapping::get_or_use(loan_count, 0u8, 0u64);
            Mapping::set(loan_count, 0u8, current_loans + 1u64);

            let loan_key: field = BHP256::hash_to_field(loan_id);
            Mapping::set(active_loans, loan_key, true);
        });
    }

    // ═══════════════════════════════════════════════════
    // 10. BORROW USAD — Against ALEO collateral
    // ═══════════════════════════════════════════════════

    fn borrow_usad(
        collateral_record: CollateralReceipt,
        borrow_amount: u128,
        current_price: u64,
        orchestrator: address,
    ) -> (DebtPosition, LiquidationAuth, Final) {
        assert(borrow_amount > 0u128);
        assert(collateral_record.token_type == 0u8);

        let col_u128: u128 = collateral_record.collateral_amount as u128;
        let price_u128: u128 = current_price as u128;
        let col_value: u128 = col_u128 * price_u128 / SCALE;
        let max_borrow: u128 = col_value * LTV_BPS / BPS;
        assert(borrow_amount <= max_borrow);

        let fee: u128 = borrow_amount * FEE_BPS / BPS;
        let net_borrow: u128 = borrow_amount - fee;

        let liq_price_u128: u128 = borrow_amount * SCALE * BPS / (col_u128 * LIQ_BPS);
        let liquidation_price: u64 = liq_price_u128 as u64;

        let loan_id: field = BHP256::hash_to_field(collateral_record.nonce_hash);
        let borrower_hash: field = BHP256::hash_to_field(self.signer);
        let col_amount: u64 = collateral_record.collateral_amount;

        let debt: DebtPosition = DebtPosition {
            owner: self.signer,
            collateral_amount: col_amount,
            collateral_amount_u128: 0u128,
            collateral_token: 0u8,
            debt_amount: borrow_amount,
            debt_token: 2u8,
            liquidation_price: liquidation_price,
            loan_id: loan_id,
        };

        let liq_auth: LiquidationAuth = LiquidationAuth {
            owner: orchestrator,
            loan_id: loan_id,
            collateral_amount: col_amount,
            collateral_amount_u128: 0u128,
            collateral_token: 0u8,
            debt_amount: borrow_amount,
            debt_token: 2u8,
            liquidation_price: liquidation_price,
            borrower_hash: borrower_hash,
        };

        let caller: address = self.caller;
        let (compliance_rec, usad_token, borrow_future): (test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, Final) =
            test_usad_stablecoin.aleo::transfer_public_to_private(caller, net_borrow);

        return (debt, liq_auth, final {
            borrow_future.run();

            let paused: bool = Mapping::get_or_use(protocol_paused, 0u8, false);
            assert(!paused);

            let stored_price: u64 = Mapping::get(oracle_price, 0u8);
            assert_eq(current_price, stored_price);

            let current_borrowed: u128 = Mapping::get_or_use(pool_total_borrowed, 1u8, 0u128);
            assert(current_borrowed + borrow_amount <= MAX_TOTAL_BORROWED);
            Mapping::set(pool_total_borrowed, 1u8, current_borrowed + borrow_amount);

            let current_fees: u128 = Mapping::get_or_use(total_fees_collected, 0u8, 0u128);
            Mapping::set(total_fees_collected, 0u8, current_fees + fee);

            let current_loans: u64 = Mapping::get_or_use(loan_count, 0u8, 0u64);
            Mapping::set(loan_count, 0u8, current_loans + 1u64);

            let loan_key: field = BHP256::hash_to_field(loan_id);
            Mapping::set(active_loans, loan_key, true);
        });
    }


    // ═══════════════════════════════════════════════════
    // 12. REPAY USDCx DEBT — Return ALEO collateral
    // ═══════════════════════════════════════════════════

    fn repay(
        debt_record: DebtPosition,
    ) -> (RepaymentReceipt, Final) {
        assert(debt_record.debt_token == 1u8);
        assert(debt_record.collateral_token == 0u8);

        let debt_amount: u128 = debt_record.debt_amount;
        let collateral_amount: u64 = debt_record.collateral_amount;
        let loan_id: field = debt_record.loan_id;

        let receipt: RepaymentReceipt = RepaymentReceipt {
            owner: self.signer,
            amount_repaid: debt_amount,
            collateral_returned: collateral_amount,
            collateral_returned_u128: 0u128,
            collateral_token: 0u8,
            loan_id: loan_id,
        };

        let caller: address = self.caller;
        let contract_addr: address = self.address;
        let repay_future: Final =
            test_usdcx_stablecoin.aleo::transfer_from_public(
                caller, contract_addr, debt_amount);

        let (return_credits, return_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_public_to_private(caller, collateral_amount);

        return (receipt, final {
            repay_future.run();
            return_future.run();

            let current_borrowed: u128 = Mapping::get(pool_total_borrowed, 0u8);
            Mapping::set(pool_total_borrowed, 0u8, current_borrowed - debt_amount);

            let current_loans: u64 = Mapping::get(loan_count, 0u8);
            Mapping::set(loan_count, 0u8, current_loans - 1u64);

            let current_collateral: u64 = Mapping::get(vault_collateral_aleo, 0u8);
            Mapping::set(vault_collateral_aleo, 0u8, current_collateral - collateral_amount);

            let loan_key: field = BHP256::hash_to_field(loan_id);
            Mapping::set(active_loans, loan_key, false);
        });
    }

    // ═══════════════════════════════════════════════════
    // 13. REPAY USAD DEBT — Return ALEO collateral
    // ═══════════════════════════════════════════════════

    fn repay_usad(
        debt_record: DebtPosition,
    ) -> (RepaymentReceipt, Final) {
        assert(debt_record.debt_token == 2u8);
        assert(debt_record.collateral_token == 0u8);

        let debt_amount: u128 = debt_record.debt_amount;
        let collateral_amount: u64 = debt_record.collateral_amount;
        let loan_id: field = debt_record.loan_id;

        let receipt: RepaymentReceipt = RepaymentReceipt {
            owner: self.signer,
            amount_repaid: debt_amount,
            collateral_returned: collateral_amount,
            collateral_returned_u128: 0u128,
            collateral_token: 0u8,
            loan_id: loan_id,
        };

        let caller: address = self.caller;
        let contract_addr: address = self.address;
        let repay_future: Final =
            test_usad_stablecoin.aleo::transfer_from_public(
                caller, contract_addr, debt_amount);

        let (return_credits, return_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_public_to_private(caller, collateral_amount);

        return (receipt, final {
            repay_future.run();
            return_future.run();

            let current_borrowed: u128 = Mapping::get(pool_total_borrowed, 1u8);
            Mapping::set(pool_total_borrowed, 1u8, current_borrowed - debt_amount);

            let current_loans: u64 = Mapping::get(loan_count, 0u8);
            Mapping::set(loan_count, 0u8, current_loans - 1u64);

            let current_collateral: u64 = Mapping::get(vault_collateral_aleo, 0u8);
            Mapping::set(vault_collateral_aleo, 0u8, current_collateral - collateral_amount);

            let loan_key: field = BHP256::hash_to_field(loan_id);
            Mapping::set(active_loans, loan_key, false);
        });
    }


    // ═══════════════════════════════════════════════════
    // 16. LIQUIDATE — ALEO collateral positions
    // ═══════════════════════════════════════════════════

    fn liquidate(
        auth: LiquidationAuth,
        current_oracle_price: u64,
    ) -> (LiquidationReceipt, Final) {
        assert(current_oracle_price <= auth.liquidation_price);
        assert(auth.collateral_token == 0u8);

        let col_u128: u128 = auth.collateral_amount as u128;
        let bonus: u128 = col_u128 * LIQUIDATION_BONUS_BPS / BPS;
        let total_seize_u128: u128 = col_u128 + bonus;
        let total_seize: u64 = total_seize_u128 as u64;
        let debt_amount: u128 = auth.debt_amount;
        let loan_id: field = auth.loan_id;
        let debt_token: u8 = auth.debt_token;

        let receipt: LiquidationReceipt = LiquidationReceipt {
            owner: self.signer,
            loan_id: loan_id,
            collateral_seized: total_seize,
            collateral_seized_u128: 0u128,
            collateral_token: 0u8,
            debt_covered: debt_amount,
        };

        let caller: address = self.caller;
        let (seize_credits, seize_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_public_to_private(caller, total_seize);

        return (receipt, final {
            seize_future.run();

            let stored_price: u64 = Mapping::get(oracle_price, 0u8);
            assert_eq(current_oracle_price, stored_price);

            let current_collateral: u64 = Mapping::get(vault_collateral_aleo, 0u8);
            Mapping::set(vault_collateral_aleo, 0u8, current_collateral - total_seize);

            let pool_key: u8 = debt_token == 1u8 ? 0u8 : 1u8;
            let current_borrowed: u128 = Mapping::get(pool_total_borrowed, pool_key);
            Mapping::set(pool_total_borrowed, pool_key, current_borrowed - debt_amount);

            let current_loans: u64 = Mapping::get(loan_count, 0u8);
            Mapping::set(loan_count, 0u8, current_loans - 1u64);

            let loan_key: field = BHP256::hash_to_field(loan_id);
            Mapping::set(active_loans, loan_key, false);
        });
    }


    // ═══════════════════════════════════════════════════
    // 19. WITHDRAW ALEO COLLATERAL
    // ═══════════════════════════════════════════════════

    fn withdraw_collateral(
        receipt: CollateralReceipt,
    ) -> Final {
        assert(receipt.token_type == 0u8);
        let col_amount: u64 = receipt.collateral_amount;
        let caller: address = self.caller;

        let (return_credits, return_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_public_to_private(caller, col_amount);

        return final {
            return_future.run();

            let current_collateral: u64 = Mapping::get(vault_collateral_aleo, 0u8);
            Mapping::set(vault_collateral_aleo, 0u8, current_collateral - col_amount);
        };
    }


}
