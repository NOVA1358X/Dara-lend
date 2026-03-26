import credits.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_stablecoin.aleo;

program dara_lend_v7.aleo {

    // Local struct matching merkle_tree.aleo/MerkleProof layout
    struct MerkleProof {
        siblings: [field; 16u32],
        leaf_index: u32,
    }

    // ═══════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════

    const SCALE: u128 = 1_000_000u128;
    const LTV_BPS: u128 = 7_000u128;                      // 70% max LTV
    const LIQ_BPS: u128 = 8_000u128;                      // 80% liquidation threshold
    const BPS: u128 = 10_000u128;
    const MIN_COLLATERAL_ALEO: u64 = 100_000u64;          // 0.1 ALEO min
    const MIN_COLLATERAL_STABLE: u128 = 100_000u128;      // 0.1 USDCx/USAD min
    const FEE_BPS: u128 = 50u128;                         // 0.5% origination fee
    const LIQUIDATION_BONUS_BPS: u128 = 500u128;          // 5% liquidation incentive
    const MAX_TOTAL_BORROWED: u128 = 100_000_000_000u128; // 100 000 USDCx/USAD cap
    const MAX_PRICE_DEVIATION_BPS: u64 = 1_500u64;        // reject >15% change per update
    const MIN_UPDATE_INTERVAL: u32 = 5u32;                // min blocks between updates
    const BLOCKS_PER_YEAR: u128 = 2_628_000u128;          // ~12s blocks
    const RESERVE_FACTOR_BPS: u128 = 1_000u128;           // 10% protocol reserve
    const MAX_ORACLE_ASSETS: u8 = 6u8;                    // 0=ALEO,1=USDCx,2=USAD,3=BTC,4=ETH,5=SOL

    // Token type identifiers: 0u8 = ALEO, 1u8 = USDCx, 2u8 = USAD
    // Extended oracle assets: 3u8 = BTC, 4u8 = ETH, 5u8 = SOL

    // ═══════════════════════════════════════════════════
    // RECORDS — All position data encrypted in private records
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
    // MAPPINGS — Only aggregate public data (no user addresses)
    // ═══════════════════════════════════════════════════

    mapping vault_collateral_aleo: u8 => u64;
    mapping vault_collateral_usdcx: u8 => u128;
    mapping vault_collateral_usad: u8 => u128;
    mapping pool_total_borrowed: u8 => u128;       // 0=USDCx, 1=USAD, 2=ALEO debt
    mapping loan_count: u8 => u64;
    mapping active_loans: field => bool;
    mapping oracle_price: u8 => u64;               // 0=ALEO, 1=USDCx, 2=USAD, 3=BTC, 4=ETH, 5=SOL
    mapping price_update_block: u8 => u32;
    mapping price_round: u8 => u64;
    mapping price_history: u8 => u64;
    mapping used_nonces: field => bool;
    mapping protocol_admin: u8 => address;
    mapping total_fees_collected: u8 => u128;
    mapping protocol_paused: u8 => bool;
    mapping privacy_version: u8 => u64;
    mapping rate_base_bps: u8 => u64;
    mapping rate_slope_bps: u8 => u64;
    mapping last_accrual_block: u8 => u32;
    mapping supply_apy_bps: u8 => u64;
    mapping borrow_apy_bps: u8 => u64;

    // ═══════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════

    @custom
    async constructor() {
        Mapping::set(protocol_admin, 0u8, aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8);
        Mapping::set(oracle_price, 0u8, 1_000_000u64);
        Mapping::set(oracle_price, 1u8, 1_000_000u64);
        Mapping::set(oracle_price, 2u8, 1_000_000u64);
        Mapping::set(price_history, 0u8, 1_000_000u64);
        Mapping::set(price_history, 1u8, 1_000_000u64);
        Mapping::set(price_history, 2u8, 1_000_000u64);
        Mapping::set(rate_base_bps, 0u8, 200u64);
        Mapping::set(rate_slope_bps, 0u8, 400u64);
        Mapping::set(privacy_version, 0u8, 3u64);
    }

    // ═══════════════════════════════════════════════════
    // 1. UPDATE ORACLE PRICE — Multi-asset support (0-5)
    // ═══════════════════════════════════════════════════

    async transition update_oracle_price(
        token_id: u8,
        new_price: u64,
        round: u64,
    ) -> Future {
        assert(new_price > 0u64);
        assert(round > 0u64);
        assert(token_id < MAX_ORACLE_ASSETS);
        return finalize_update_oracle_price(self.caller, token_id, new_price, round);
    }

    async function finalize_update_oracle_price(
        caller: address,
        token_id: u8,
        new_price: u64,
        round: u64,
    ) {
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
    }

    // ═══════════════════════════════════════════════════
    // 2. SET RATE PARAMS — Admin configures interest model
    // ═══════════════════════════════════════════════════

    async transition set_rate_params(
        base_rate: u64,
        slope: u64,
    ) -> Future {
        return finalize_set_rate_params(self.caller, base_rate, slope);
    }

    async function finalize_set_rate_params(
        caller: address,
        base_rate: u64,
        slope: u64,
    ) {
        let admin: address = Mapping::get(protocol_admin, 0u8);
        assert_eq(caller, admin);
        Mapping::set(rate_base_bps, 0u8, base_rate);
        Mapping::set(rate_slope_bps, 0u8, slope);
    }

    // ═══════════════════════════════════════════════════
    // 3. EMERGENCY PAUSE
    // ═══════════════════════════════════════════════════

    async transition emergency_pause() -> Future {
        return finalize_emergency_pause(self.caller);
    }

    async function finalize_emergency_pause(caller: address) {
        let admin: address = Mapping::get(protocol_admin, 0u8);
        assert_eq(caller, admin);
        Mapping::set(protocol_paused, 0u8, true);
    }

    // ═══════════════════════════════════════════════════
    // 4. RESUME PROTOCOL
    // ═══════════════════════════════════════════════════

    async transition resume_protocol() -> Future {
        return finalize_resume_protocol(self.caller);
    }

    async function finalize_resume_protocol(caller: address) {
        let admin: address = Mapping::get(protocol_admin, 0u8);
        assert_eq(caller, admin);
        Mapping::set(protocol_paused, 0u8, false);
    }

    // ═══════════════════════════════════════════════════
    // 5. ACCRUE INTEREST — Utilization-based rate model
    // ═══════════════════════════════════════════════════

    async transition accrue_interest() -> Future {
        return finalize_accrue_interest();
    }

    async function finalize_accrue_interest() {
        let last_block: u32 = Mapping::get_or_use(last_accrual_block, 0u8, 0u32);
        let elapsed: u32 = block.height - last_block;
        let should_accrue: bool = elapsed > 0u32 && last_block > 0u32;

        let base_rate: u64 = Mapping::get_or_use(rate_base_bps, 0u8, 200u64);
        let slope: u64 = Mapping::get_or_use(rate_slope_bps, 0u8, 400u64);

        let borrowed: u128 = Mapping::get_or_use(pool_total_borrowed, 0u8, 0u128);
        let aleo_collateral: u64 = Mapping::get_or_use(vault_collateral_aleo, 0u8, 0u64);
        let aleo_price: u64 = Mapping::get_or_use(oracle_price, 0u8, 1_000_000u64);
        let supply_value: u128 = (aleo_collateral as u128) * (aleo_price as u128) / SCALE;

        let util_bps: u128 = supply_value > 0u128 ? borrowed * BPS / supply_value : 0u128;
        let capped_util: u128 = util_bps > BPS ? BPS : util_bps;
        let borrow_rate: u128 = (base_rate as u128) + capped_util * (slope as u128) / BPS;
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
    }

    // ═══════════════════════════════════════════════════
    // 6. SUPPLY ALEO COLLATERAL — Private credits flow
    // ═══════════════════════════════════════════════════

    async transition supply_collateral(
        input_credits: credits.aleo/credits,
        amount: u64,
        nonce: field,
    ) -> (CollateralReceipt, Future) {
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

        let paused: bool = Mapping::get_or_use(protocol_paused, 0u8, false);
        assert(!paused);

        let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
        assert(!nonce_used);
        Mapping::set(used_nonces, nonce_hash, true);

        let current: u64 = Mapping::get_or_use(vault_collateral_aleo, 0u8, 0u64);
        Mapping::set(vault_collateral_aleo, 0u8, current + amount);
    }

    // ═══════════════════════════════════════════════════
    // 7. SUPPLY USDCx COLLATERAL — Private stablecoin flow
    // ═══════════════════════════════════════════════════

    async transition supply_usdcx_collateral(
        input_token: test_usdcx_stablecoin.aleo/Token,
        merkle_proof: [MerkleProof; 2u32],
        amount: u128,
        nonce: field,
    ) -> (CollateralReceipt, Future) {
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

        let (compliance_record, change_token, usdcx_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, Future) =
            test_usdcx_stablecoin.aleo/transfer_private_to_public(self.address, amount, input_token, merkle_proof);

        return (receipt, finalize_supply_usdcx(usdcx_future, nonce_hash, amount));
    }

    async function finalize_supply_usdcx(
        usdcx_future: Future,
        nonce_hash: field,
        amount: u128,
    ) {
        usdcx_future.await();

        let paused: bool = Mapping::get_or_use(protocol_paused, 0u8, false);
        assert(!paused);

        let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
        assert(!nonce_used);
        Mapping::set(used_nonces, nonce_hash, true);

        let current: u128 = Mapping::get_or_use(vault_collateral_usdcx, 0u8, 0u128);
        Mapping::set(vault_collateral_usdcx, 0u8, current + amount);
    }

    // ═══════════════════════════════════════════════════
    // 8. SUPPLY USAD COLLATERAL — Private stablecoin flow
    // ═══════════════════════════════════════════════════

    async transition supply_usad_collateral(
        input_token: test_usad_stablecoin.aleo/Token,
        merkle_proof: [MerkleProof; 2u32],
        amount: u128,
        nonce: field,
    ) -> (CollateralReceipt, Future) {
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

        let (compliance_record, change_token, usad_future): (test_usad_stablecoin.aleo/ComplianceRecord, test_usad_stablecoin.aleo/Token, Future) =
            test_usad_stablecoin.aleo/transfer_private_to_public(self.address, amount, input_token, merkle_proof);

        return (receipt, finalize_supply_usad(usad_future, nonce_hash, amount));
    }

    async function finalize_supply_usad(
        usad_future: Future,
        nonce_hash: field,
        amount: u128,
    ) {
        usad_future.await();

        let paused: bool = Mapping::get_or_use(protocol_paused, 0u8, false);
        assert(!paused);

        let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
        assert(!nonce_used);
        Mapping::set(used_nonces, nonce_hash, true);

        let current: u128 = Mapping::get_or_use(vault_collateral_usad, 0u8, 0u128);
        Mapping::set(vault_collateral_usad, 0u8, current + amount);
    }

    // ═══════════════════════════════════════════════════
    // 9. BORROW USDCx — Against ALEO collateral (private)
    // ═══════════════════════════════════════════════════

    async transition borrow(
        collateral_record: CollateralReceipt,
        borrow_amount: u128,
        current_price: u64,
        orchestrator: address,
    ) -> (DebtPosition, LiquidationAuth, Future) {
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

        let debt: DebtPosition = DebtPosition {
            owner: self.signer,
            collateral_amount: collateral_record.collateral_amount,
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
            collateral_amount: collateral_record.collateral_amount,
            collateral_amount_u128: 0u128,
            collateral_token: 0u8,
            debt_amount: borrow_amount,
            debt_token: 1u8,
            liquidation_price: liquidation_price,
            borrower_hash: borrower_hash,
        };

        let (compliance_record, usdcx_token, borrow_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, Future) =
            test_usdcx_stablecoin.aleo/transfer_public_to_private(self.caller, net_borrow);

        return (debt, liq_auth, finalize_borrow(
            borrow_future, current_price, borrow_amount, fee, loan_id,
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
    }

    // ═══════════════════════════════════════════════════
    // 10. BORROW USAD — Against ALEO collateral (private)
    // ═══════════════════════════════════════════════════

    async transition borrow_usad(
        collateral_record: CollateralReceipt,
        borrow_amount: u128,
        current_price: u64,
        orchestrator: address,
    ) -> (DebtPosition, LiquidationAuth, Future) {
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

        let debt: DebtPosition = DebtPosition {
            owner: self.signer,
            collateral_amount: collateral_record.collateral_amount,
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
            collateral_amount: collateral_record.collateral_amount,
            collateral_amount_u128: 0u128,
            collateral_token: 0u8,
            debt_amount: borrow_amount,
            debt_token: 2u8,
            liquidation_price: liquidation_price,
            borrower_hash: borrower_hash,
        };

        let (compliance_record, usad_token, borrow_future): (test_usad_stablecoin.aleo/ComplianceRecord, test_usad_stablecoin.aleo/Token, Future) =
            test_usad_stablecoin.aleo/transfer_public_to_private(self.caller, net_borrow);

        return (debt, liq_auth, finalize_borrow_usad(
            borrow_future, current_price, borrow_amount, fee, loan_id,
        ));
    }

    async function finalize_borrow_usad(
        borrow_future: Future,
        current_price: u64,
        borrow_amount: u128,
        fee: u128,
        loan_id: field,
    ) {
        borrow_future.await();

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
    }

    // ═══════════════════════════════════════════════════
    // 11. BORROW CREDITS — ALEO against stablecoins
    // ═══════════════════════════════════════════════════

    async transition borrow_credits(
        collateral_record: CollateralReceipt,
        borrow_amount: u64,
        current_col_price: u64,
        current_aleo_price: u64,
        orchestrator: address,
    ) -> (DebtPosition, LiquidationAuth, Future) {
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

        let debt: DebtPosition = DebtPosition {
            owner: self.signer,
            collateral_amount: 0u64,
            collateral_amount_u128: collateral_record.collateral_amount_u128,
            collateral_token: collateral_record.token_type,
            debt_amount: borrow_u128,
            debt_token: 0u8,
            liquidation_price: liquidation_price,
            loan_id: loan_id,
        };

        let liq_auth: LiquidationAuth = LiquidationAuth {
            owner: orchestrator,
            loan_id: loan_id,
            collateral_amount: 0u64,
            collateral_amount_u128: collateral_record.collateral_amount_u128,
            collateral_token: collateral_record.token_type,
            debt_amount: borrow_u128,
            debt_token: 0u8,
            liquidation_price: liquidation_price,
            borrower_hash: borrower_hash,
        };

        let (borrow_credits_out, borrow_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(self.caller, net_borrow);

        return (debt, liq_auth, finalize_borrow_credits(
            borrow_future, collateral_record.token_type,
            current_col_price, current_aleo_price,
            borrow_u128, fee_u128, loan_id,
        ));
    }

    async function finalize_borrow_credits(
        borrow_future: Future,
        collateral_token: u8,
        current_col_price: u64,
        current_aleo_price: u64,
        borrow_amount: u128,
        fee: u128,
        loan_id: field,
    ) {
        borrow_future.await();

        let paused: bool = Mapping::get_or_use(protocol_paused, 0u8, false);
        assert(!paused);

        let stored_col_price: u64 = Mapping::get(oracle_price, collateral_token);
        assert_eq(current_col_price, stored_col_price);
        let stored_aleo_price: u64 = Mapping::get(oracle_price, 0u8);
        assert_eq(current_aleo_price, stored_aleo_price);

        let current_borrowed: u128 = Mapping::get_or_use(pool_total_borrowed, 2u8, 0u128);
        Mapping::set(pool_total_borrowed, 2u8, current_borrowed + borrow_amount);

        let current_fees: u128 = Mapping::get_or_use(total_fees_collected, 0u8, 0u128);
        Mapping::set(total_fees_collected, 0u8, current_fees + fee);

        let current_loans: u64 = Mapping::get_or_use(loan_count, 0u8, 0u64);
        Mapping::set(loan_count, 0u8, current_loans + 1u64);

        let loan_key: field = BHP256::hash_to_field(loan_id);
        Mapping::set(active_loans, loan_key, true);
    }

    // ═══════════════════════════════════════════════════
    // 12. REPAY USDCx DEBT — Return ALEO collateral
    // ═══════════════════════════════════════════════════

    async transition repay(
        debt_record: DebtPosition,
    ) -> (RepaymentReceipt, Future) {
        assert(debt_record.debt_token == 1u8);
        assert(debt_record.collateral_token == 0u8);

        let receipt: RepaymentReceipt = RepaymentReceipt {
            owner: self.signer,
            amount_repaid: debt_record.debt_amount,
            collateral_returned: debt_record.collateral_amount,
            collateral_returned_u128: 0u128,
            collateral_token: 0u8,
            loan_id: debt_record.loan_id,
        };

        let repay_future: Future =
            test_usdcx_stablecoin.aleo/transfer_from_public(
                self.caller, self.address, debt_record.debt_amount);

        let (return_credits, return_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(
                self.caller, debt_record.collateral_amount);

        return (receipt, finalize_repay(
            repay_future, return_future,
            debt_record.debt_amount, debt_record.collateral_amount,
            debt_record.loan_id, 0u8,
        ));
    }

    async function finalize_repay(
        repay_future: Future,
        return_future: Future,
        debt_amount: u128,
        collateral_amount: u64,
        loan_id: field,
        pool_id: u8,
    ) {
        repay_future.await();
        return_future.await();

        let current_borrowed: u128 = Mapping::get(pool_total_borrowed, pool_id);
        Mapping::set(pool_total_borrowed, pool_id, current_borrowed - debt_amount);

        let current_loans: u64 = Mapping::get(loan_count, 0u8);
        Mapping::set(loan_count, 0u8, current_loans - 1u64);

        let current_collateral: u64 = Mapping::get(vault_collateral_aleo, 0u8);
        Mapping::set(vault_collateral_aleo, 0u8, current_collateral - collateral_amount);

        let loan_key: field = BHP256::hash_to_field(loan_id);
        Mapping::set(active_loans, loan_key, false);
    }

    // ═══════════════════════════════════════════════════
    // 13. REPAY USAD DEBT — Return ALEO collateral
    // ═══════════════════════════════════════════════════

    async transition repay_usad(
        debt_record: DebtPosition,
    ) -> (RepaymentReceipt, Future) {
        assert(debt_record.debt_token == 2u8);
        assert(debt_record.collateral_token == 0u8);

        let receipt: RepaymentReceipt = RepaymentReceipt {
            owner: self.signer,
            amount_repaid: debt_record.debt_amount,
            collateral_returned: debt_record.collateral_amount,
            collateral_returned_u128: 0u128,
            collateral_token: 0u8,
            loan_id: debt_record.loan_id,
        };

        let repay_future: Future =
            test_usad_stablecoin.aleo/transfer_from_public(
                self.caller, self.address, debt_record.debt_amount);

        let (return_credits, return_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(
                self.caller, debt_record.collateral_amount);

        return (receipt, finalize_repay_usad(
            repay_future, return_future,
            debt_record.debt_amount, debt_record.collateral_amount,
            debt_record.loan_id,
        ));
    }

    async function finalize_repay_usad(
        repay_future: Future,
        return_future: Future,
        debt_amount: u128,
        collateral_amount: u64,
        loan_id: field,
    ) {
        repay_future.await();
        return_future.await();

        let current_borrowed: u128 = Mapping::get(pool_total_borrowed, 1u8);
        Mapping::set(pool_total_borrowed, 1u8, current_borrowed - debt_amount);

        let current_loans: u64 = Mapping::get(loan_count, 0u8);
        Mapping::set(loan_count, 0u8, current_loans - 1u64);

        let current_collateral: u64 = Mapping::get(vault_collateral_aleo, 0u8);
        Mapping::set(vault_collateral_aleo, 0u8, current_collateral - collateral_amount);

        let loan_key: field = BHP256::hash_to_field(loan_id);
        Mapping::set(active_loans, loan_key, false);
    }

    // ═══════════════════════════════════════════════════
    // 14. REPAY CREDITS — USDCx collateral returned
    // ═══════════════════════════════════════════════════

    async transition repay_credits_usdcx(
        debt_record: DebtPosition,
        input_credits: credits.aleo/credits,
    ) -> (RepaymentReceipt, Future) {
        assert(debt_record.debt_token == 0u8);
        assert(debt_record.collateral_token == 1u8);

        let repay_amount: u64 = debt_record.debt_amount as u64;

        let receipt: RepaymentReceipt = RepaymentReceipt {
            owner: self.signer,
            amount_repaid: debt_record.debt_amount,
            collateral_returned: 0u64,
            collateral_returned_u128: debt_record.collateral_amount_u128,
            collateral_token: 1u8,
            loan_id: debt_record.loan_id,
        };

        let (change_credits, repay_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_private_to_public(input_credits, self.address, repay_amount);

        let (compliance_record, usdcx_token, return_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, Future) =
            test_usdcx_stablecoin.aleo/transfer_public_to_private(self.caller, debt_record.collateral_amount_u128);

        return (receipt, finalize_repay_credits_usdcx(
            repay_future, return_future,
            debt_record.debt_amount, debt_record.collateral_amount_u128,
            debt_record.loan_id,
        ));
    }

    async function finalize_repay_credits_usdcx(
        repay_future: Future,
        return_future: Future,
        debt_amount: u128,
        collateral_amount: u128,
        loan_id: field,
    ) {
        repay_future.await();
        return_future.await();

        let current_borrowed: u128 = Mapping::get(pool_total_borrowed, 2u8);
        Mapping::set(pool_total_borrowed, 2u8, current_borrowed - debt_amount);

        let current_loans: u64 = Mapping::get(loan_count, 0u8);
        Mapping::set(loan_count, 0u8, current_loans - 1u64);

        let current_collateral: u128 = Mapping::get(vault_collateral_usdcx, 0u8);
        Mapping::set(vault_collateral_usdcx, 0u8, current_collateral - collateral_amount);

        let loan_key: field = BHP256::hash_to_field(loan_id);
        Mapping::set(active_loans, loan_key, false);
    }

    // ═══════════════════════════════════════════════════
    // 15. REPAY CREDITS — USAD collateral returned
    // ═══════════════════════════════════════════════════

    async transition repay_credits_usad(
        debt_record: DebtPosition,
        input_credits: credits.aleo/credits,
    ) -> (RepaymentReceipt, Future) {
        assert(debt_record.debt_token == 0u8);
        assert(debt_record.collateral_token == 2u8);

        let repay_amount: u64 = debt_record.debt_amount as u64;

        let receipt: RepaymentReceipt = RepaymentReceipt {
            owner: self.signer,
            amount_repaid: debt_record.debt_amount,
            collateral_returned: 0u64,
            collateral_returned_u128: debt_record.collateral_amount_u128,
            collateral_token: 2u8,
            loan_id: debt_record.loan_id,
        };

        let (change_credits, repay_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_private_to_public(input_credits, self.address, repay_amount);

        let (compliance_record, usad_token, return_future): (test_usad_stablecoin.aleo/ComplianceRecord, test_usad_stablecoin.aleo/Token, Future) =
            test_usad_stablecoin.aleo/transfer_public_to_private(self.caller, debt_record.collateral_amount_u128);

        return (receipt, finalize_repay_credits_usad(
            repay_future, return_future,
            debt_record.debt_amount, debt_record.collateral_amount_u128,
            debt_record.loan_id,
        ));
    }

    async function finalize_repay_credits_usad(
        repay_future: Future,
        return_future: Future,
        debt_amount: u128,
        collateral_amount: u128,
        loan_id: field,
    ) {
        repay_future.await();
        return_future.await();

        let current_borrowed: u128 = Mapping::get(pool_total_borrowed, 2u8);
        Mapping::set(pool_total_borrowed, 2u8, current_borrowed - debt_amount);

        let current_loans: u64 = Mapping::get(loan_count, 0u8);
        Mapping::set(loan_count, 0u8, current_loans - 1u64);

        let current_collateral: u128 = Mapping::get(vault_collateral_usad, 0u8);
        Mapping::set(vault_collateral_usad, 0u8, current_collateral - collateral_amount);

        let loan_key: field = BHP256::hash_to_field(loan_id);
        Mapping::set(active_loans, loan_key, false);
    }

    // ═══════════════════════════════════════════════════
    // 16. LIQUIDATE — ALEO collateral positions
    // ═══════════════════════════════════════════════════

    async transition liquidate(
        auth: LiquidationAuth,
        current_oracle_price: u64,
    ) -> (LiquidationReceipt, Future) {
        assert(current_oracle_price <= auth.liquidation_price);
        assert(auth.collateral_token == 0u8);

        let col_u128: u128 = auth.collateral_amount as u128;
        let bonus: u128 = col_u128 * LIQUIDATION_BONUS_BPS / BPS;
        let total_seize_u128: u128 = col_u128 + bonus;
        let total_seize: u64 = total_seize_u128 as u64;

        let receipt: LiquidationReceipt = LiquidationReceipt {
            owner: self.signer,
            loan_id: auth.loan_id,
            collateral_seized: total_seize,
            collateral_seized_u128: 0u128,
            collateral_token: 0u8,
            debt_covered: auth.debt_amount,
        };

        let (seize_credits, seize_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(self.caller, total_seize);

        return (receipt, finalize_liquidate(
            seize_future, current_oracle_price,
            total_seize, auth.debt_amount, auth.loan_id, auth.debt_token,
        ));
    }

    async function finalize_liquidate(
        seize_future: Future,
        current_oracle_price: u64,
        total_seize: u64,
        debt_amount: u128,
        loan_id: field,
        debt_token: u8,
    ) {
        seize_future.await();

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
    }

    // ═══════════════════════════════════════════════════
    // 17. LIQUIDATE USDCx — USDCx collateral positions
    // ═══════════════════════════════════════════════════

    async transition liquidate_usdcx(
        auth: LiquidationAuth,
        current_oracle_price: u64,
    ) -> (LiquidationReceipt, Future) {
        assert(current_oracle_price <= auth.liquidation_price);
        assert(auth.collateral_token == 1u8);

        let col_u128: u128 = auth.collateral_amount_u128;
        let bonus: u128 = col_u128 * LIQUIDATION_BONUS_BPS / BPS;
        let total_seize: u128 = col_u128 + bonus;

        let receipt: LiquidationReceipt = LiquidationReceipt {
            owner: self.signer,
            loan_id: auth.loan_id,
            collateral_seized: 0u64,
            collateral_seized_u128: total_seize,
            collateral_token: 1u8,
            debt_covered: auth.debt_amount,
        };

        let (compliance_record, seize_token, seize_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, Future) =
            test_usdcx_stablecoin.aleo/transfer_public_to_private(self.caller, total_seize);

        return (receipt, finalize_liquidate_usdcx(
            seize_future, current_oracle_price,
            total_seize, auth.debt_amount, auth.loan_id,
        ));
    }

    async function finalize_liquidate_usdcx(
        seize_future: Future,
        current_oracle_price: u64,
        total_seize: u128,
        debt_amount: u128,
        loan_id: field,
    ) {
        seize_future.await();

        let stored_price: u64 = Mapping::get(oracle_price, 1u8);
        assert_eq(current_oracle_price, stored_price);

        let current_collateral: u128 = Mapping::get(vault_collateral_usdcx, 0u8);
        Mapping::set(vault_collateral_usdcx, 0u8, current_collateral - total_seize);

        let current_borrowed: u128 = Mapping::get(pool_total_borrowed, 2u8);
        Mapping::set(pool_total_borrowed, 2u8, current_borrowed - debt_amount);

        let current_loans: u64 = Mapping::get(loan_count, 0u8);
        Mapping::set(loan_count, 0u8, current_loans - 1u64);

        let loan_key: field = BHP256::hash_to_field(loan_id);
        Mapping::set(active_loans, loan_key, false);
    }

    // ═══════════════════════════════════════════════════
    // 18. LIQUIDATE USAD — USAD collateral positions
    // ═══════════════════════════════════════════════════

    async transition liquidate_usad(
        auth: LiquidationAuth,
        current_oracle_price: u64,
    ) -> (LiquidationReceipt, Future) {
        assert(current_oracle_price <= auth.liquidation_price);
        assert(auth.collateral_token == 2u8);

        let col_u128: u128 = auth.collateral_amount_u128;
        let bonus: u128 = col_u128 * LIQUIDATION_BONUS_BPS / BPS;
        let total_seize: u128 = col_u128 + bonus;

        let receipt: LiquidationReceipt = LiquidationReceipt {
            owner: self.signer,
            loan_id: auth.loan_id,
            collateral_seized: 0u64,
            collateral_seized_u128: total_seize,
            collateral_token: 2u8,
            debt_covered: auth.debt_amount,
        };

        let (compliance_record, seize_token, seize_future): (test_usad_stablecoin.aleo/ComplianceRecord, test_usad_stablecoin.aleo/Token, Future) =
            test_usad_stablecoin.aleo/transfer_public_to_private(self.caller, total_seize);

        return (receipt, finalize_liquidate_usad(
            seize_future, current_oracle_price,
            total_seize, auth.debt_amount, auth.loan_id,
        ));
    }

    async function finalize_liquidate_usad(
        seize_future: Future,
        current_oracle_price: u64,
        total_seize: u128,
        debt_amount: u128,
        loan_id: field,
    ) {
        seize_future.await();

        let stored_price: u64 = Mapping::get(oracle_price, 2u8);
        assert_eq(current_oracle_price, stored_price);

        let current_collateral: u128 = Mapping::get(vault_collateral_usad, 0u8);
        Mapping::set(vault_collateral_usad, 0u8, current_collateral - total_seize);

        let current_borrowed: u128 = Mapping::get(pool_total_borrowed, 2u8);
        Mapping::set(pool_total_borrowed, 2u8, current_borrowed - debt_amount);

        let current_loans: u64 = Mapping::get(loan_count, 0u8);
        Mapping::set(loan_count, 0u8, current_loans - 1u64);

        let loan_key: field = BHP256::hash_to_field(loan_id);
        Mapping::set(active_loans, loan_key, false);
    }

    // ═══════════════════════════════════════════════════
    // 19. WITHDRAW ALEO COLLATERAL
    // ═══════════════════════════════════════════════════

    async transition withdraw_collateral(
        receipt: CollateralReceipt,
    ) -> Future {
        assert(receipt.token_type == 0u8);

        let (return_credits, return_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(
                self.caller, receipt.collateral_amount);

        return finalize_withdraw_collateral(return_future, receipt.collateral_amount);
    }

    async function finalize_withdraw_collateral(
        withdraw_future: Future,
        collateral_amount: u64,
    ) {
        withdraw_future.await();

        let current_collateral: u64 = Mapping::get(vault_collateral_aleo, 0u8);
        Mapping::set(vault_collateral_aleo, 0u8, current_collateral - collateral_amount);
    }

    // ═══════════════════════════════════════════════════
    // 20. WITHDRAW USDCx COLLATERAL
    // ═══════════════════════════════════════════════════

    async transition withdraw_usdcx_collateral(
        receipt: CollateralReceipt,
    ) -> Future {
        assert(receipt.token_type == 1u8);

        let (compliance_record, usdcx_token, return_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, Future) =
            test_usdcx_stablecoin.aleo/transfer_public_to_private(
                self.caller, receipt.collateral_amount_u128);

        return finalize_withdraw_usdcx(return_future, receipt.collateral_amount_u128);
    }

    async function finalize_withdraw_usdcx(
        withdraw_future: Future,
        collateral_amount: u128,
    ) {
        withdraw_future.await();

        let current_collateral: u128 = Mapping::get(vault_collateral_usdcx, 0u8);
        Mapping::set(vault_collateral_usdcx, 0u8, current_collateral - collateral_amount);
    }

    // ═══════════════════════════════════════════════════
    // 21. WITHDRAW USAD COLLATERAL
    // ═══════════════════════════════════════════════════

    async transition withdraw_usad_collateral(
        receipt: CollateralReceipt,
    ) -> Future {
        assert(receipt.token_type == 2u8);

        let (compliance_record, usad_token, return_future): (test_usad_stablecoin.aleo/ComplianceRecord, test_usad_stablecoin.aleo/Token, Future) =
            test_usad_stablecoin.aleo/transfer_public_to_private(
                self.caller, receipt.collateral_amount_u128);

        return finalize_withdraw_usad(return_future, receipt.collateral_amount_u128);
    }

    async function finalize_withdraw_usad(
        withdraw_future: Future,
        collateral_amount: u128,
    ) {
        withdraw_future.await();

        let current_collateral: u128 = Mapping::get(vault_collateral_usad, 0u8);
        Mapping::set(vault_collateral_usad, 0u8, current_collateral - collateral_amount);
    }
}
