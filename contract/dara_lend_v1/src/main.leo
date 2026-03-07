import credits.aleo;
import test_usdcx_stablecoin.aleo;

program dara_lend_v1.aleo {

    // ═══════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════

    const SCALE: u128 = 1_000_000u128;
    const LTV_BPS: u128 = 7_000u128;
    const LIQ_BPS: u128 = 8_000u128;
    const BPS: u128 = 10_000u128;
    const MIN_COLLATERAL: u64 = 100_000u64;

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
        borrower: address,
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
    mapping used_nonces: field => bool;
    mapping protocol_admin: u8 => address;
    mapping active_loans: field => bool;

    // ═══════════════════════════════════════════════════
    // CONSTRUCTOR (runs at deployment)
    // ═══════════════════════════════════════════════════

    @custom
    async constructor() {
        Mapping::set(protocol_admin, 0u8, aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8);
        Mapping::set(oracle_price, 0u8, 1_000_000u64);
        Mapping::set(vault_total_collateral, 0u8, 0u64);
        Mapping::set(total_borrowed, 0u8, 0u128);
        Mapping::set(loan_count, 0u8, 0u64);
    }

    // ═══════════════════════════════════════════════════
    // 1. UPDATE ORACLE PRICE
    // ═══════════════════════════════════════════════════

    async transition update_oracle_price(
        new_price: u64,
    ) -> Future {
        assert(new_price > 0u64);
        return finalize_update_oracle_price(self.caller, new_price);
    }

    async function finalize_update_oracle_price(
        caller: address,
        new_price: u64,
    ) {
        let admin: address = Mapping::get(protocol_admin, 0u8);
        assert_eq(caller, admin);
        Mapping::set(oracle_price, 0u8, new_price);
    }

    // ═══════════════════════════════════════════════════
    // 3. SUPPLY COLLATERAL (credits.aleo)
    // ═══════════════════════════════════════════════════

    async transition supply_collateral(
        amount: u64,
        nonce: field,
    ) -> (CollateralReceipt, Future) {
        assert(amount >= MIN_COLLATERAL);

        let nonce_hash: field = BHP256::hash_to_field(nonce);

        let receipt: CollateralReceipt = CollateralReceipt {
            owner: self.signer,
            collateral_amount: amount,
            deposit_block: 0u32,
            nonce_hash: nonce_hash,
        };

        let credit_future: Future =
            credits.aleo/transfer_public_as_signer(self.address, amount);

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
    // 4. BORROW (receive USDCx against credit collateral)
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

        let liq_price_u128: u128 = borrow_amount * SCALE * BPS / (col_u128 * LIQ_BPS);
        let liquidation_price: u64 = liq_price_u128 as u64;

        let loan_id: field = BHP256::hash_to_field(collateral_record.nonce_hash);

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
            borrower: self.signer,
        };

        let borrow_future: Future =
            test_usdcx_stablecoin.aleo/transfer_public(self.caller, borrow_amount);

        return (debt, liq_auth, finalize_borrow(
            borrow_future,
            current_price,
            borrow_amount,
            loan_id,
        ));
    }

    async function finalize_borrow(
        borrow_future: Future,
        current_price: u64,
        borrow_amount: u128,
        loan_id: field,
    ) {
        borrow_future.await();

        let stored_price: u64 = Mapping::get(oracle_price, 0u8);
        assert_eq(current_price, stored_price);

        let current_borrowed: u128 = Mapping::get_or_use(total_borrowed, 0u8, 0u128);
        Mapping::set(total_borrowed, 0u8, current_borrowed + borrow_amount);

        let current_loans: u64 = Mapping::get_or_use(loan_count, 0u8, 0u64);
        Mapping::set(loan_count, 0u8, current_loans + 1u64);

        let loan_key: field = BHP256::hash_to_field(loan_id);
        Mapping::set(active_loans, loan_key, true);
    }

    // ═══════════════════════════════════════════════════
    // 5. REPAY (send USDCx back, receive credits collateral)
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

        let repay_future: Future =
            test_usdcx_stablecoin.aleo/transfer_from_public(
                self.caller, self.address, debt_record.debt_amount);

        let return_future: Future =
            credits.aleo/transfer_public(
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
    // 6. LIQUIDATE
    // ═══════════════════════════════════════════════════

    async transition liquidate(
        auth: LiquidationAuth,
        current_oracle_price: u64,
    ) -> (LiquidationReceipt, Future) {
        assert(current_oracle_price <= auth.liquidation_price);

        let receipt: LiquidationReceipt = LiquidationReceipt {
            owner: self.signer,
            loan_id: auth.loan_id,
            collateral_seized: auth.collateral_amount,
            debt_covered: auth.debt_amount,
        };

        let seize_future: Future =
            credits.aleo/transfer_public(
                self.caller, auth.collateral_amount);

        return (receipt, finalize_liquidate(
            seize_future,
            current_oracle_price,
            auth.collateral_amount,
            auth.debt_amount,
            auth.loan_id,
        ));
    }

    async function finalize_liquidate(
        seize_future: Future,
        current_oracle_price: u64,
        collateral_amount: u64,
        debt_amount: u128,
        loan_id: field,
    ) {
        seize_future.await();

        let stored_price: u64 = Mapping::get(oracle_price, 0u8);
        assert_eq(current_oracle_price, stored_price);

        let current_collateral: u64 = Mapping::get(vault_total_collateral, 0u8);
        Mapping::set(vault_total_collateral, 0u8, current_collateral - collateral_amount);

        let current_borrowed: u128 = Mapping::get(total_borrowed, 0u8);
        Mapping::set(total_borrowed, 0u8, current_borrowed - debt_amount);

        let current_loans: u64 = Mapping::get(loan_count, 0u8);
        Mapping::set(loan_count, 0u8, current_loans - 1u64);

        let loan_key: field = BHP256::hash_to_field(loan_id);
        Mapping::set(active_loans, loan_key, false);
    }

    // ═══════════════════════════════════════════════════
    // 7. WITHDRAW COLLATERAL
    // ═══════════════════════════════════════════════════

    async transition withdraw_collateral(
        receipt: CollateralReceipt,
    ) -> Future {
        let return_future: Future =
            credits.aleo/transfer_public(
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
