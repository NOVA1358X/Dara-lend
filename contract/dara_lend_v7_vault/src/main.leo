import credits.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_stablecoin.aleo;

program dara_lend_v7_vault.aleo {

    // Local struct matching merkle_tree.aleo/MerkleProof layout
    struct MerkleProof {
        siblings: [field; 16u32],
        leaf_index: u32,
    }

    // ═══════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════

    const SCALE: u128 = 1_000_000u128;
    const MIN_POOL_DEPOSIT: u128 = 100_000u128;       // 0.1 token min deposit
    const MIN_TRANSFER_AMOUNT: u128 = 10_000u128;     // 0.01 token min transfer
    const WITHDRAWAL_FEE_BPS: u128 = 10u128;          // 0.1% early withdrawal fee
    const BPS: u128 = 10_000u128;

    // Token type identifiers: 0u8 = USDCx pool, 1u8 = USAD pool

    // ═══════════════════════════════════════════════════
    // RECORDS — Private yield pool shares & transfer receipts
    // ═══════════════════════════════════════════════════

    record PoolShare {
        owner: address,
        token_type: u8,        // 0=USDCx, 1=USAD
        share_amount: u128,    // shares representing pool ownership
        deposit_block: u32,
        nonce_hash: field,
    }

    record PrivateTransferReceipt {
        owner: address,
        amount: u128,
        token_type: u8,       // 0=USDCx, 1=USAD
        nonce_hash: field,
    }

    // ═══════════════════════════════════════════════════
    // MAPPINGS — Pool state and analytics
    // ═══════════════════════════════════════════════════

    mapping supply_pool_total: u8 => u128;         // total underlying deposits per token
    mapping supply_pool_shares: u8 => u128;        // total shares outstanding per token
    mapping pool_yield_accumulated: u8 => u128;    // yield distributed per token
    mapping vault_admin: u8 => address;
    mapping vault_paused: u8 => bool;
    mapping used_nonces: field => bool;
    mapping transfer_count: u8 => u64;             // total private transfers
    mapping total_volume: u8 => u128;              // total transfer volume per token
    mapping pool_deposit_count: u8 => u64;         // total pool deposits
    mapping pool_tvl_usdcx: u8 => u128;            // TVL tracking for analytics
    mapping pool_tvl_usad: u8 => u128;             // TVL tracking for analytics

    // ═══════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════

    @custom
    async constructor() {
        Mapping::set(vault_admin, 0u8, aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8);
        Mapping::set(vault_paused, 0u8, false);
        Mapping::set(supply_pool_total, 0u8, 0u128);
        Mapping::set(supply_pool_total, 1u8, 0u128);
        Mapping::set(supply_pool_shares, 0u8, 0u128);
        Mapping::set(supply_pool_shares, 1u8, 0u128);
    }

    // ═══════════════════════════════════════════════════
    // 1. PROVIDE USDCx CAPITAL — Deposit USDCx to yield pool
    // ═══════════════════════════════════════════════════

    async transition provide_usdcx_capital(
        input_token: test_usdcx_stablecoin.aleo/Token,
        merkle_proof: [MerkleProof; 2u32],
        amount: u128,
        nonce: field,
    ) -> (PoolShare, Future) {
        assert(amount >= MIN_POOL_DEPOSIT);

        let signer_field: field = BHP256::hash_to_field(self.signer);
        let nonce_hash: field = BHP256::hash_to_field(nonce + signer_field);

        let share: PoolShare = PoolShare {
            owner: self.signer,
            token_type: 0u8,
            share_amount: amount,  // placeholder — finalize computes actual shares
            deposit_block: 0u32,
            nonce_hash: nonce_hash,
        };

        let (compliance_record, change_token, deposit_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, Future) =
            test_usdcx_stablecoin.aleo/transfer_private_to_public(self.address, amount, input_token, merkle_proof);

        return (share, finalize_provide_usdcx(deposit_future, nonce_hash, amount));
    }

    async function finalize_provide_usdcx(
        deposit_future: Future,
        nonce_hash: field,
        amount: u128,
    ) {
        deposit_future.await();

        let paused: bool = Mapping::get_or_use(vault_paused, 0u8, false);
        assert(!paused);

        let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
        assert(!nonce_used);
        Mapping::set(used_nonces, nonce_hash, true);

        let total_deposits: u128 = Mapping::get_or_use(supply_pool_total, 0u8, 0u128);
        let total_shares: u128 = Mapping::get_or_use(supply_pool_shares, 0u8, 0u128);

        // Calculate shares: if pool empty, 1:1 ratio; otherwise proportional
        let new_shares: u128 = total_shares == 0u128 ? amount : amount * total_shares / total_deposits;

        Mapping::set(supply_pool_total, 0u8, total_deposits + amount);
        Mapping::set(supply_pool_shares, 0u8, total_shares + new_shares);
        Mapping::set(pool_tvl_usdcx, 0u8, total_deposits + amount);

        let count: u64 = Mapping::get_or_use(pool_deposit_count, 0u8, 0u64);
        Mapping::set(pool_deposit_count, 0u8, count + 1u64);
    }

    // ═══════════════════════════════════════════════════
    // 2. PROVIDE USAD CAPITAL — Deposit USAD to yield pool
    // ═══════════════════════════════════════════════════

    async transition provide_usad_capital(
        input_token: test_usad_stablecoin.aleo/Token,
        merkle_proof: [MerkleProof; 2u32],
        amount: u128,
        nonce: field,
    ) -> (PoolShare, Future) {
        assert(amount >= MIN_POOL_DEPOSIT);

        let signer_field: field = BHP256::hash_to_field(self.signer);
        let nonce_hash: field = BHP256::hash_to_field(nonce + signer_field);

        let share: PoolShare = PoolShare {
            owner: self.signer,
            token_type: 1u8,
            share_amount: amount,
            deposit_block: 0u32,
            nonce_hash: nonce_hash,
        };

        let (compliance_record, change_token, deposit_future): (test_usad_stablecoin.aleo/ComplianceRecord, test_usad_stablecoin.aleo/Token, Future) =
            test_usad_stablecoin.aleo/transfer_private_to_public(self.address, amount, input_token, merkle_proof);

        return (share, finalize_provide_usad(deposit_future, nonce_hash, amount));
    }

    async function finalize_provide_usad(
        deposit_future: Future,
        nonce_hash: field,
        amount: u128,
    ) {
        deposit_future.await();

        let paused: bool = Mapping::get_or_use(vault_paused, 0u8, false);
        assert(!paused);

        let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
        assert(!nonce_used);
        Mapping::set(used_nonces, nonce_hash, true);

        let total_deposits: u128 = Mapping::get_or_use(supply_pool_total, 1u8, 0u128);
        let total_shares: u128 = Mapping::get_or_use(supply_pool_shares, 1u8, 0u128);

        let new_shares: u128 = total_shares == 0u128 ? amount : amount * total_shares / total_deposits;

        Mapping::set(supply_pool_total, 1u8, total_deposits + amount);
        Mapping::set(supply_pool_shares, 1u8, total_shares + new_shares);
        Mapping::set(pool_tvl_usad, 0u8, total_deposits + amount);

        let count: u64 = Mapping::get_or_use(pool_deposit_count, 1u8, 0u64);
        Mapping::set(pool_deposit_count, 1u8, count + 1u64);
    }

    // ═══════════════════════════════════════════════════
    // 3. REDEEM USDCx CAPITAL — Withdraw USDCx + yield
    // ═══════════════════════════════════════════════════

    async transition redeem_usdcx_capital(
        share_record: PoolShare,
    ) -> Future {
        assert(share_record.token_type == 0u8);
        assert(share_record.share_amount > 0u128);

        // Withdrawal amount is computed in finalize (based on current pool ratio)
        // Send proportional amount back to user as private USDCx
        let (compliance_record, usdcx_token, redeem_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, Future) =
            test_usdcx_stablecoin.aleo/transfer_public_to_private(self.caller, share_record.share_amount);

        return finalize_redeem_usdcx(redeem_future, share_record.share_amount);
    }

    async function finalize_redeem_usdcx(
        redeem_future: Future,
        share_amount: u128,
    ) {
        redeem_future.await();

        let total_deposits: u128 = Mapping::get(supply_pool_total, 0u8);
        let total_shares: u128 = Mapping::get(supply_pool_shares, 0u8);

        // Calculate underlying value: shares * total_deposits / total_shares
        let underlying: u128 = share_amount * total_deposits / total_shares;
        let fee: u128 = underlying * WITHDRAWAL_FEE_BPS / BPS;
        let net_withdrawal: u128 = underlying - fee;

        Mapping::set(supply_pool_total, 0u8, total_deposits - net_withdrawal);
        Mapping::set(supply_pool_shares, 0u8, total_shares - share_amount);
        Mapping::set(pool_tvl_usdcx, 0u8, total_deposits - net_withdrawal);
    }

    // ═══════════════════════════════════════════════════
    // 4. REDEEM USAD CAPITAL — Withdraw USAD + yield
    // ═══════════════════════════════════════════════════

    async transition redeem_usad_capital(
        share_record: PoolShare,
    ) -> Future {
        assert(share_record.token_type == 1u8);
        assert(share_record.share_amount > 0u128);

        let (compliance_record, usad_token, redeem_future): (test_usad_stablecoin.aleo/ComplianceRecord, test_usad_stablecoin.aleo/Token, Future) =
            test_usad_stablecoin.aleo/transfer_public_to_private(self.caller, share_record.share_amount);

        return finalize_redeem_usad(redeem_future, share_record.share_amount);
    }

    async function finalize_redeem_usad(
        redeem_future: Future,
        share_amount: u128,
    ) {
        redeem_future.await();

        let total_deposits: u128 = Mapping::get(supply_pool_total, 1u8);
        let total_shares: u128 = Mapping::get(supply_pool_shares, 1u8);

        let underlying: u128 = share_amount * total_deposits / total_shares;
        let fee: u128 = underlying * WITHDRAWAL_FEE_BPS / BPS;
        let net_withdrawal: u128 = underlying - fee;

        Mapping::set(supply_pool_total, 1u8, total_deposits - net_withdrawal);
        Mapping::set(supply_pool_shares, 1u8, total_shares - share_amount);
        Mapping::set(pool_tvl_usad, 0u8, total_deposits - net_withdrawal);
    }

    // ═══════════════════════════════════════════════════
    // 5. DISTRIBUTE YIELD — Admin adds yield to pool
    // ═══════════════════════════════════════════════════

    async transition distribute_yield(
        token_type: u8,
        amount: u128,
    ) -> Future {
        assert(token_type <= 1u8);
        assert(amount > 0u128);
        return finalize_distribute_yield(self.caller, token_type, amount);
    }

    async function finalize_distribute_yield(
        caller: address,
        token_type: u8,
        amount: u128,
    ) {
        let admin: address = Mapping::get(vault_admin, 0u8);
        assert_eq(caller, admin);

        // Increase pool total without increasing shares → yield for depositors
        let total: u128 = Mapping::get(supply_pool_total, token_type);
        Mapping::set(supply_pool_total, token_type, total + amount);

        let accumulated: u128 = Mapping::get_or_use(pool_yield_accumulated, token_type, 0u128);
        Mapping::set(pool_yield_accumulated, token_type, accumulated + amount);
    }

    // ═══════════════════════════════════════════════════
    // 6. PRIVATE TRANSFER USDCx — Privacy relay
    // ═══════════════════════════════════════════════════

    async transition private_transfer_usdcx(
        input_token: test_usdcx_stablecoin.aleo/Token,
        merkle_proof: [MerkleProof; 2u32],
        recipient: address,
        amount: u128,
        nonce: field,
    ) -> (PrivateTransferReceipt, Future) {
        assert(amount >= MIN_TRANSFER_AMOUNT);

        let signer_field: field = BHP256::hash_to_field(self.signer);
        let nonce_hash: field = BHP256::hash_to_field(nonce + signer_field);

        let receipt: PrivateTransferReceipt = PrivateTransferReceipt {
            owner: self.signer,
            amount: amount,
            token_type: 0u8,
            nonce_hash: nonce_hash,
        };

        // Step 1: sender deposits tokens to protocol (public)
        let (compliance_in, change_token, deposit_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, Future) =
            test_usdcx_stablecoin.aleo/transfer_private_to_public(self.address, amount, input_token, merkle_proof);

        // Step 2: protocol sends tokens to recipient (private)
        let (compliance_out, recipient_token, withdraw_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, Future) =
            test_usdcx_stablecoin.aleo/transfer_public_to_private(recipient, amount);

        return (receipt, finalize_private_transfer_usdcx(
            deposit_future, withdraw_future, nonce_hash, amount,
        ));
    }

    async function finalize_private_transfer_usdcx(
        deposit_future: Future,
        withdraw_future: Future,
        nonce_hash: field,
        amount: u128,
    ) {
        deposit_future.await();
        withdraw_future.await();

        let paused: bool = Mapping::get_or_use(vault_paused, 0u8, false);
        assert(!paused);

        let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
        assert(!nonce_used);
        Mapping::set(used_nonces, nonce_hash, true);

        let count: u64 = Mapping::get_or_use(transfer_count, 0u8, 0u64);
        Mapping::set(transfer_count, 0u8, count + 1u64);

        let volume: u128 = Mapping::get_or_use(total_volume, 0u8, 0u128);
        Mapping::set(total_volume, 0u8, volume + amount);
    }

    // ═══════════════════════════════════════════════════
    // 7. PRIVATE TRANSFER USAD — Privacy relay
    // ═══════════════════════════════════════════════════

    async transition private_transfer_usad(
        input_token: test_usad_stablecoin.aleo/Token,
        merkle_proof: [MerkleProof; 2u32],
        recipient: address,
        amount: u128,
        nonce: field,
    ) -> (PrivateTransferReceipt, Future) {
        assert(amount >= MIN_TRANSFER_AMOUNT);

        let signer_field: field = BHP256::hash_to_field(self.signer);
        let nonce_hash: field = BHP256::hash_to_field(nonce + signer_field);

        let receipt: PrivateTransferReceipt = PrivateTransferReceipt {
            owner: self.signer,
            amount: amount,
            token_type: 1u8,
            nonce_hash: nonce_hash,
        };

        let (compliance_in, change_token, deposit_future): (test_usad_stablecoin.aleo/ComplianceRecord, test_usad_stablecoin.aleo/Token, Future) =
            test_usad_stablecoin.aleo/transfer_private_to_public(self.address, amount, input_token, merkle_proof);

        let (compliance_out, recipient_token, withdraw_future): (test_usad_stablecoin.aleo/ComplianceRecord, test_usad_stablecoin.aleo/Token, Future) =
            test_usad_stablecoin.aleo/transfer_public_to_private(recipient, amount);

        return (receipt, finalize_private_transfer_usad(
            deposit_future, withdraw_future, nonce_hash, amount,
        ));
    }

    async function finalize_private_transfer_usad(
        deposit_future: Future,
        withdraw_future: Future,
        nonce_hash: field,
        amount: u128,
    ) {
        deposit_future.await();
        withdraw_future.await();

        let paused: bool = Mapping::get_or_use(vault_paused, 0u8, false);
        assert(!paused);

        let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
        assert(!nonce_used);
        Mapping::set(used_nonces, nonce_hash, true);

        let count: u64 = Mapping::get_or_use(transfer_count, 1u8, 0u64);
        Mapping::set(transfer_count, 1u8, count + 1u64);

        let volume: u128 = Mapping::get_or_use(total_volume, 1u8, 0u128);
        Mapping::set(total_volume, 1u8, volume + amount);
    }

    // ═══════════════════════════════════════════════════
    // 8. SET VAULT ADMIN — Transfer admin control
    // ═══════════════════════════════════════════════════

    async transition set_vault_admin(
        new_admin: address,
    ) -> Future {
        return finalize_set_vault_admin(self.caller, new_admin);
    }

    async function finalize_set_vault_admin(
        caller: address,
        new_admin: address,
    ) {
        let admin: address = Mapping::get(vault_admin, 0u8);
        assert_eq(caller, admin);
        Mapping::set(vault_admin, 0u8, new_admin);
    }

    // ═══════════════════════════════════════════════════
    // 9. PAUSE VAULT — Emergency stop
    // ═══════════════════════════════════════════════════

    async transition pause_vault() -> Future {
        return finalize_pause_vault(self.caller);
    }

    async function finalize_pause_vault(caller: address) {
        let admin: address = Mapping::get(vault_admin, 0u8);
        assert_eq(caller, admin);
        Mapping::set(vault_paused, 0u8, true);
    }

    // ═══════════════════════════════════════════════════
    // 10. RESUME VAULT
    // ═══════════════════════════════════════════════════

    async transition resume_vault() -> Future {
        return finalize_resume_vault(self.caller);
    }

    async function finalize_resume_vault(caller: address) {
        let admin: address = Mapping::get(vault_admin, 0u8);
        assert_eq(caller, admin);
        Mapping::set(vault_paused, 0u8, false);
    }
}
