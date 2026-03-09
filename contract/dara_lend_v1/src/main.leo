import credits.aleo;
import test_usdcx_stablecoin.aleo;

program dara_lend_v4.aleo {

    // ═══════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════

    const SCALE: u128 = 1_000_000u128;
    const LTV_BPS: u128 = 7_000u128;
    const LIQ_BPS: u128 = 8_000u128;
    const BPS: u128 = 10_000u128;
    const MIN_COLLATERAL: u64 = 100_000u64;
    const FEE_BPS: u128 = 50u128;                         // 0.5% origination fee
    const LIQUIDATION_BONUS_BPS: u128 = 500u128;          // 5% liquidation incentive
    const MAX_TOTAL_BORROWED: u128 = 100_000_000_000u128; // 100 000 USDCx cap
    const MAX_PRICE_AGE: u32 = 100u32;                    // ~5 min staleness window
    const MAX_PRICE_DEVIATION_BPS: u64 = 1_500u64;        // reject >15% change per update
    const MIN_UPDATE_INTERVAL: u32 = 5u32;                // min blocks between updates

    // ═══════════════════════════════════════════════════
    // RECORDS
    // ═══════════════════════════════════════════════════

    record CollateralReceipt {
        owner: address,
        collateral_amount: u64,
        deposit_block: u32,
        nonce_hash: field,
    }

    record DebtPosition {
        owner: address,
        collateral_amount: u64,
        debt_amount: u128,
        liquidation_price: u64,
        loan_id: field,
    }

    record LiquidationAuth {
        owner: address,
        loan_id: field,
        collateral_amount: u64,
        debt_amount: u128,
        liquidation_price: u64,
        borrower_hash: field,
    }

    record RepaymentReceipt {
        owner: address,
        amount_repaid: u128,
        collateral_returned: u64,
        loan_id: field,
    }

    record LiquidationReceipt {
        owner: address,
        loan_id: field,
        collateral_seized: u64,
        debt_covered: u128,
    }

    // ═══════════════════════════════════════════════════
    // MAPPINGS
    // ═══════════════════════════════════════════════════

    mapping vault_total_collateral: u8 => u64;
    mapping total_borrowed: u8 => u128;
    mapping loan_count: u8 => u64;
    mapping oracle_price: u8 => u64;
    mapping price_update_block: u8 => u32;
    mapping used_nonces: field => bool;
    mapping protocol_admin: u8 => address;
    mapping active_loans: field => bool;
    mapping total_fees_collected: u8 => u128;
    mapping price_round: u8 => u64;
    mapping price_history: u8 => u64;

    // ═══════════════════════════════════════════════════
    // CONSTRUCTOR (runs at deployment)
    // ═══════════════════════════════════════════════════

    @custom
    async constructor() {
        Mapping::set(protocol_admin, 0u8, aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8);
        Mapping::set(oracle_price, 0u8, 1_000_000u64);
        Mapping::set(price_update_block, 0u8, 0u32);
        Mapping::set(vault_total_collateral, 0u8, 0u64);
        Mapping::set(total_borrowed, 0u8, 0u128);
        Mapping::set(loan_count, 0u8, 0u64);
        Mapping::set(total_fees_collected, 0u8, 0u128);
        Mapping::set(price_round, 0u8, 0u64);
        Mapping::set(price_history, 0u8, 1_000_000u64);
    }

    // ═══════════════════════════════════════════════════
    // 1. UPDATE ORACLE PRICE
    //    Round-based replay protection, deviation cap,
    //    and minimum interval between updates
    // ═══════════════════════════════════════════════════

    async transition update_oracle_price(
        new_price: u64,
        round: u64,
    ) -> Future {
        assert(new_price > 0u64);
        assert(round > 0u64);
        return finalize_update_oracle_price(self.caller, new_price, round);
    }

    async function finalize_update_oracle_price(
        caller: address,
        new_price: u64,
        round: u64,
    ) {
        // 1. Admin check
        let admin: address = Mapping::get(protocol_admin, 0u8);
        assert_eq(caller, admin);

        // 2. Round must be strictly increasing (replay protection)
        let current_round: u64 = Mapping::get_or_use(price_round, 0u8, 0u64);
        assert(round > current_round);

        // 3. Minimum interval between updates
        let last_update: u32 = Mapping::get_or_use(price_update_block, 0u8, 0u32);
        let elapsed: u32 = block.height - last_update;
        // Skip interval check on first update (last_update == 0)
        let interval_ok: bool = last_update == 0u32 || elapsed >= MIN_UPDATE_INTERVAL;
        assert(interval_ok);

        // 4. Deviation cap — reject if price changed >15% from previous
        let old_price: u64 = Mapping::get_or_use(price_history, 0u8, new_price);
        // Safe subtraction: cap values to avoid underflow
        let higher: u64 = new_price >= old_price ? new_price : old_price;
        let lower: u64 = new_price < old_price ? new_price : old_price;
        let diff: u64 = higher - lower;
        // diff * 10000 / old_price <= MAX_PRICE_DEVIATION_BPS
        // Skip deviation check on first real update (old_price == initial default)
        let deviation_bps: u64 = old_price > 0u64 ? diff * 10_000u64 / old_price : 0u64;
        // Allow first update (current_round == 0) to skip deviation check
        let deviation_ok: bool = current_round == 0u64 || deviation_bps <= MAX_PRICE_DEVIATION_BPS;
        assert(deviation_ok);

        // 5. Update all mappings
        Mapping::set(oracle_price, 0u8, new_price);
        Mapping::set(price_update_block, 0u8, block.height);
        Mapping::set(price_round, 0u8, round);
        Mapping::set(price_history, 0u8, new_price);
    }

    // ═══════════════════════════════════════════════════
    // 2. SUPPLY COLLATERAL — Private credits flow
    // Observer sees credits arriving at protocol but
    // CANNOT identify the depositor (private record consumed)
    // ═══════════════════════════════════════════════════

    async transition supply_collateral(
        input_credits: credits.aleo/credits,
        amount: u64,
        nonce: field,
    ) -> (CollateralReceipt, Future) {
        assert(amount >= MIN_COLLATERAL);

        // Bind nonce to caller address to prevent grief attacks
        let signer_field: field = BHP256::hash_to_field(self.signer);
        let nonce_hash: field = BHP256::hash_to_field(nonce + signer_field);

        let receipt: CollateralReceipt = CollateralReceipt {
            owner: self.signer,
            collateral_amount: amount,
            deposit_block: 0u32,
            nonce_hash: nonce_hash,
        };

        // Private: consumes user's private credits record, deposits to protocol's public balance
        // Change record automatically returned to the user
        let (change_credits, credit_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_private_to_public(input_credits, self.address, amount);

        return (receipt, finalize_supply_collateral(credit_future, nonce_hash, amount));
    }

    async function finalize_supply_collateral(
        credit_future: Future,
        nonce_hash: field,
        amount: u64,
    ) {
        credit_future.await();

        let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
        assert(!nonce_used);
        Mapping::set(used_nonces, nonce_hash, true);

        let current: u64 = Mapping::get_or_use(vault_total_collateral, 0u8, 0u64);
        Mapping::set(vault_total_collateral, 0u8, current + amount);
    }

    // ═══════════════════════════════════════════════════
    // 3. BORROW — Private USDCx disbursement
    // Borrower receives USDCx as a private Token record
    // Observer sees USDCx leaving protocol but CANNOT
    // identify who received it
    // ═══════════════════════════════════════════════════

    async transition borrow(
        collateral_record: CollateralReceipt,
        borrow_amount: u128,
        current_price: u64,
        orchestrator: address,
    ) -> (DebtPosition, LiquidationAuth, Future) {
        assert(borrow_amount > 0u128);

        let col_u128: u128 = collateral_record.collateral_amount as u128;
        let price_u128: u128 = current_price as u128;
        let col_value: u128 = col_u128 * price_u128 / SCALE;
        let max_borrow: u128 = col_value * LTV_BPS / BPS;
        assert(borrow_amount <= max_borrow);

        // Apply 0.5% origination fee — user receives less, owes full amount
        let fee: u128 = borrow_amount * FEE_BPS / BPS;
        let net_borrow: u128 = borrow_amount - fee;

        let liq_price_u128: u128 = borrow_amount * SCALE * BPS / (col_u128 * LIQ_BPS);
        let liquidation_price: u64 = liq_price_u128 as u64;

        let loan_id: field = BHP256::hash_to_field(collateral_record.nonce_hash);

        // Hash borrower address to protect privacy in LiquidationAuth
        let borrower_hash: field = BHP256::hash_to_field(self.signer);

        let debt: DebtPosition = DebtPosition {
            owner: self.signer,
            collateral_amount: collateral_record.collateral_amount,
            debt_amount: borrow_amount,
            liquidation_price: liquidation_price,
            loan_id: loan_id,
        };

        let liq_auth: LiquidationAuth = LiquidationAuth {
            owner: orchestrator,
            loan_id: loan_id,
            collateral_amount: collateral_record.collateral_amount,
            debt_amount: borrow_amount,
            liquidation_price: liquidation_price,
            borrower_hash: borrower_hash,
        };

        // Private: sends USDCx as encrypted private Token record to borrower
        // The recipient address is private — observers cannot identify the borrower
        let (compliance_record, usdcx_token, borrow_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, Future) =
            test_usdcx_stablecoin.aleo/transfer_public_to_private(self.caller, net_borrow);

        return (debt, liq_auth, finalize_borrow(
            borrow_future,
            current_price,
            borrow_amount,
            fee,
            loan_id,
        ));
    }

    async function finalize_borrow(
        borrow_future: Future,
        current_price: u64,
        borrow_amount: u128,
        fee: u128,
        loan_id: field,
    ) {
        borrow_future.await();

        // Validate oracle price matches and is fresh
        let stored_price: u64 = Mapping::get(oracle_price, 0u8);
        assert_eq(current_price, stored_price);

        let last_update: u32 = Mapping::get_or_use(price_update_block, 0u8, 0u32);
        let price_age: u32 = block.height - last_update;
        assert(price_age <= MAX_PRICE_AGE);

        // Enforce max debt circuit breaker
        let current_borrowed: u128 = Mapping::get_or_use(total_borrowed, 0u8, 0u128);
        assert(current_borrowed + borrow_amount <= MAX_TOTAL_BORROWED);
        Mapping::set(total_borrowed, 0u8, current_borrowed + borrow_amount);

        // Track origination fees
        let current_fees: u128 = Mapping::get_or_use(total_fees_collected, 0u8, 0u128);
        Mapping::set(total_fees_collected, 0u8, current_fees + fee);

        let current_loans: u64 = Mapping::get_or_use(loan_count, 0u8, 0u64);
        Mapping::set(loan_count, 0u8, current_loans + 1u64);

        let loan_key: field = BHP256::hash_to_field(loan_id);
        Mapping::set(active_loans, loan_key, true);
    }

    // ═══════════════════════════════════════════════════
    // 4. REPAY — Private credits return
    // USDCx repayment uses approval pattern (transfer_from_public)
    // Collateral returned as private credits record —
    // observer CANNOT identify who received the collateral
    // ═══════════════════════════════════════════════════

    async transition repay(
        debt_record: DebtPosition,
    ) -> (RepaymentReceipt, Future) {

        let receipt: RepaymentReceipt = RepaymentReceipt {
            owner: self.signer,
            amount_repaid: debt_record.debt_amount,
            collateral_returned: debt_record.collateral_amount,
            loan_id: debt_record.loan_id,
        };

        // USDCx repayment via approval pattern
        let repay_future: Future =
            test_usdcx_stablecoin.aleo/transfer_from_public(
                self.caller, self.address, debt_record.debt_amount);

        // Private: return collateral as encrypted private credits record
        // The recipient address is private — observers cannot identify the borrower
        let (return_credits, return_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(
                self.caller, debt_record.collateral_amount);

        return (receipt, finalize_repay(
            repay_future,
            return_future,
            debt_record.debt_amount,
            debt_record.collateral_amount,
            debt_record.loan_id,
        ));
    }

    async function finalize_repay(
        repay_future: Future,
        return_future: Future,
        debt_amount: u128,
        collateral_amount: u64,
        loan_id: field,
    ) {
        repay_future.await();
        return_future.await();

        let current_borrowed: u128 = Mapping::get(total_borrowed, 0u8);
        Mapping::set(total_borrowed, 0u8, current_borrowed - debt_amount);

        let current_loans: u64 = Mapping::get(loan_count, 0u8);
        Mapping::set(loan_count, 0u8, current_loans - 1u64);

        let current_collateral: u64 = Mapping::get(vault_total_collateral, 0u8);
        Mapping::set(vault_total_collateral, 0u8, current_collateral - collateral_amount);

        let loan_key: field = BHP256::hash_to_field(loan_id);
        Mapping::set(active_loans, loan_key, false);
    }

    // ═══════════════════════════════════════════════════
    // 5. LIQUIDATE — Private collateral seizure
    // Liquidator receives seized collateral as private
    // credits record — their identity stays hidden
    // ═══════════════════════════════════════════════════

    async transition liquidate(
        auth: LiquidationAuth,
        current_oracle_price: u64,
    ) -> (LiquidationReceipt, Future) {
        assert(current_oracle_price <= auth.liquidation_price);

        // Calculate 5% liquidation bonus for the liquidator
        let col_u128: u128 = auth.collateral_amount as u128;
        let bonus_amount_u128: u128 = col_u128 * LIQUIDATION_BONUS_BPS / BPS;
        let total_seize_u128: u128 = col_u128 + bonus_amount_u128;
        let total_seize: u64 = total_seize_u128 as u64;

        let receipt: LiquidationReceipt = LiquidationReceipt {
            owner: self.signer,
            loan_id: auth.loan_id,
            collateral_seized: total_seize,
            debt_covered: auth.debt_amount,
        };

        // Private: liquidator receives seized collateral as encrypted private record
        let (seize_credits, seize_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(
                self.caller, total_seize);

        return (receipt, finalize_liquidate(
            seize_future,
            current_oracle_price,
            total_seize,
            auth.debt_amount,
            auth.loan_id,
        ));
    }

    async function finalize_liquidate(
        seize_future: Future,
        current_oracle_price: u64,
        total_seize: u64,
        debt_amount: u128,
        loan_id: field,
    ) {
        seize_future.await();

        // Validate oracle price matches and is fresh
        let stored_price: u64 = Mapping::get(oracle_price, 0u8);
        assert_eq(current_oracle_price, stored_price);

        let last_update: u32 = Mapping::get_or_use(price_update_block, 0u8, 0u32);
        let price_age: u32 = block.height - last_update;
        assert(price_age <= MAX_PRICE_AGE);

        let current_collateral: u64 = Mapping::get(vault_total_collateral, 0u8);
        Mapping::set(vault_total_collateral, 0u8, current_collateral - total_seize);

        let current_borrowed: u128 = Mapping::get(total_borrowed, 0u8);
        Mapping::set(total_borrowed, 0u8, current_borrowed - debt_amount);

        let current_loans: u64 = Mapping::get(loan_count, 0u8);
        Mapping::set(loan_count, 0u8, current_loans - 1u64);

        let loan_key: field = BHP256::hash_to_field(loan_id);
        Mapping::set(active_loans, loan_key, false);
    }

    // ═══════════════════════════════════════════════════
    // 6. WITHDRAW COLLATERAL — Private credits return
    // Withdrawer receives collateral as private record
    // ═══════════════════════════════════════════════════

    async transition withdraw_collateral(
        receipt: CollateralReceipt,
    ) -> Future {
        // Private: return collateral as encrypted private credits record
        let (return_credits, return_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(
                self.caller, receipt.collateral_amount);

        return finalize_withdraw_collateral(
            return_future,
            receipt.collateral_amount,
        );
    }

    async function finalize_withdraw_collateral(
        withdraw_future: Future,
        collateral_amount: u64,
    ) {
        withdraw_future.await();

        let current_collateral: u64 = Mapping::get(vault_total_collateral, 0u8);
        Mapping::set(vault_total_collateral, 0u8, current_collateral - collateral_amount);
    }
}
