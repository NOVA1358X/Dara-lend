import credits.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_stablecoin.aleo;

program dara_lend_v8_vault.aleo {

    // ═══════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════

    const SCALE: u128 = 1_000_000u128;
    const MIN_POOL_DEPOSIT: u128 = 100_000u128;
    const MIN_TRANSFER_AMOUNT: u128 = 10_000u128;
    const WITHDRAWAL_FEE_BPS: u128 = 10u128;
    const BPS: u128 = 10_000u128;

    // ═══════════════════════════════════════════════════
    // RECORDS
    // ═══════════════════════════════════════════════════

    record PoolShare {
        owner: address,
        token_type: u8,
        share_amount: u128,
        deposit_block: u32,
        nonce_hash: field,
    }

    record PrivateTransferReceipt {
        owner: address,
        amount: u128,
        token_type: u8,
        nonce_hash: field,
    }

    // ═══════════════════════════════════════════════════
    // MAPPINGS
    // ═══════════════════════════════════════════════════

    mapping supply_pool_total: u8 => u128;
    mapping supply_pool_shares: u8 => u128;
    mapping pool_yield_accumulated: u8 => u128;
    mapping vault_admin: u8 => address;
    mapping vault_paused: u8 => bool;
    mapping used_nonces: field => bool;
    mapping transfer_count: u8 => u64;
    mapping total_volume: u8 => u128;
    mapping pool_deposit_count: u8 => u64;
    mapping pool_tvl_usdcx: u8 => u128;
    mapping pool_tvl_usad: u8 => u128;

    // ═══════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════

    @custom
    constructor() {
        Mapping::set(vault_admin, 0u8, aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8);
        Mapping::set(vault_paused, 0u8, false);
        Mapping::set(supply_pool_total, 0u8, 0u128);
        Mapping::set(supply_pool_total, 1u8, 0u128);
        Mapping::set(supply_pool_shares, 0u8, 0u128);
        Mapping::set(supply_pool_shares, 1u8, 0u128);
    }

    // ═══════════════════════════════════════════════════
    // 1. PROVIDE USDCx CAPITAL
    // ═══════════════════════════════════════════════════

    fn provide_usdcx_capital(
        input_token: test_usdcx_stablecoin.aleo::Token,
        merkle_proof: [test_usdcx_stablecoin.aleo::MerkleProof; 2u32],
        amount: u128,
        nonce: field,
    ) -> (PoolShare, Final) {
        assert(amount >= MIN_POOL_DEPOSIT);

        let signer_field: field = BHP256::hash_to_field(self.signer);
        let nonce_hash: field = BHP256::hash_to_field(nonce + signer_field);

        let share: PoolShare = PoolShare {
            owner: self.signer,
            token_type: 0u8,
            share_amount: amount,
            deposit_block: 0u32,
            nonce_hash: nonce_hash,
        };

        let (compliance_rec, change_tok, deposit_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_private_to_public(self.address, amount, input_token, merkle_proof);

        return (share, final {
            deposit_future.run();

            let paused: bool = Mapping::get_or_use(vault_paused, 0u8, false);
            assert(!paused);

            let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
            assert(!nonce_used);
            Mapping::set(used_nonces, nonce_hash, true);

            let total_deposits: u128 = Mapping::get_or_use(supply_pool_total, 0u8, 0u128);
            let total_shares: u128 = Mapping::get_or_use(supply_pool_shares, 0u8, 0u128);

            let new_shares: u128 = total_shares == 0u128 ? amount : amount * total_shares / total_deposits;

            Mapping::set(supply_pool_total, 0u8, total_deposits + amount);
            Mapping::set(supply_pool_shares, 0u8, total_shares + new_shares);
            Mapping::set(pool_tvl_usdcx, 0u8, total_deposits + amount);

            let count: u64 = Mapping::get_or_use(pool_deposit_count, 0u8, 0u64);
            Mapping::set(pool_deposit_count, 0u8, count + 1u64);
        });
    }

    // ═══════════════════════════════════════════════════
    // 2. PROVIDE USAD CAPITAL
    // ═══════════════════════════════════════════════════

    fn provide_usad_capital(
        input_token: test_usad_stablecoin.aleo::Token,
        merkle_proof: [test_usad_stablecoin.aleo::MerkleProof; 2u32],
        amount: u128,
        nonce: field,
    ) -> (PoolShare, Final) {
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

        let (compliance_rec, change_tok, deposit_future): (test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, Final) =
            test_usad_stablecoin.aleo::transfer_private_to_public(self.address, amount, input_token, merkle_proof);

        return (share, final {
            deposit_future.run();

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
        });
    }

    // ═══════════════════════════════════════════════════
    // 3. REDEEM USDCx CAPITAL
    // ═══════════════════════════════════════════════════

    fn redeem_usdcx_capital(
        share_record: PoolShare,
    ) -> Final {
        assert(share_record.token_type == 0u8);
        assert(share_record.share_amount > 0u128);

        let share_amount: u128 = share_record.share_amount;

        let (compliance_rec, redeemed_tok, redeem_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(self.caller, share_amount);

        return final {
            redeem_future.run();

            let total_deposits: u128 = Mapping::get(supply_pool_total, 0u8);
            let total_shares: u128 = Mapping::get(supply_pool_shares, 0u8);

            let underlying: u128 = share_amount * total_deposits / total_shares;
            let fee: u128 = underlying * WITHDRAWAL_FEE_BPS / BPS;
            let net_withdrawal: u128 = underlying - fee;

            Mapping::set(supply_pool_total, 0u8, total_deposits - net_withdrawal);
            Mapping::set(supply_pool_shares, 0u8, total_shares - share_amount);
            Mapping::set(pool_tvl_usdcx, 0u8, total_deposits - net_withdrawal);
        };
    }

    // ═══════════════════════════════════════════════════
    // 4. REDEEM USAD CAPITAL
    // ═══════════════════════════════════════════════════

    fn redeem_usad_capital(
        share_record: PoolShare,
    ) -> Final {
        assert(share_record.token_type == 1u8);
        assert(share_record.share_amount > 0u128);

        let share_amount: u128 = share_record.share_amount;

        let (compliance_rec, redeemed_tok, redeem_future): (test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, Final) =
            test_usad_stablecoin.aleo::transfer_public_to_private(self.caller, share_amount);

        return final {
            redeem_future.run();

            let total_deposits: u128 = Mapping::get(supply_pool_total, 1u8);
            let total_shares: u128 = Mapping::get(supply_pool_shares, 1u8);

            let underlying: u128 = share_amount * total_deposits / total_shares;
            let fee: u128 = underlying * WITHDRAWAL_FEE_BPS / BPS;
            let net_withdrawal: u128 = underlying - fee;

            Mapping::set(supply_pool_total, 1u8, total_deposits - net_withdrawal);
            Mapping::set(supply_pool_shares, 1u8, total_shares - share_amount);
            Mapping::set(pool_tvl_usad, 0u8, total_deposits - net_withdrawal);
        };
    }

    // ═══════════════════════════════════════════════════
    // 5. DISTRIBUTE YIELD
    // ═══════════════════════════════════════════════════

    fn distribute_yield(
        token_type: u8,
        amount: u128,
    ) -> Final {
        assert(token_type <= 1u8);
        assert(amount > 0u128);
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(vault_admin, 0u8);
            assert_eq(caller, admin);

            let total: u128 = Mapping::get(supply_pool_total, token_type);
            Mapping::set(supply_pool_total, token_type, total + amount);

            let accumulated: u128 = Mapping::get_or_use(pool_yield_accumulated, token_type, 0u128);
            Mapping::set(pool_yield_accumulated, token_type, accumulated + amount);
        };
    }

    // ═══════════════════════════════════════════════════
    // 6. PRIVATE TRANSFER USDCx
    // ═══════════════════════════════════════════════════

    fn private_transfer_usdcx(
        input_token: test_usdcx_stablecoin.aleo::Token,
        merkle_proof: [test_usdcx_stablecoin.aleo::MerkleProof; 2u32],
        recipient: address,
        amount: u128,
        nonce: field,
    ) -> (PrivateTransferReceipt, Final) {
        assert(amount >= MIN_TRANSFER_AMOUNT);

        let signer_field: field = BHP256::hash_to_field(self.signer);
        let nonce_hash: field = BHP256::hash_to_field(nonce + signer_field);

        let receipt: PrivateTransferReceipt = PrivateTransferReceipt {
            owner: self.signer,
            amount: amount,
            token_type: 0u8,
            nonce_hash: nonce_hash,
        };

        let (compliance_in, change_tok, deposit_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_private_to_public(self.address, amount, input_token, merkle_proof);

        let (compliance_out, recipient_tok, withdraw_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(recipient, amount);

        return (receipt, final {
            deposit_future.run();
            withdraw_future.run();

            let paused: bool = Mapping::get_or_use(vault_paused, 0u8, false);
            assert(!paused);

            let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
            assert(!nonce_used);
            Mapping::set(used_nonces, nonce_hash, true);

            let count: u64 = Mapping::get_or_use(transfer_count, 0u8, 0u64);
            Mapping::set(transfer_count, 0u8, count + 1u64);

            let volume: u128 = Mapping::get_or_use(total_volume, 0u8, 0u128);
            Mapping::set(total_volume, 0u8, volume + amount);
        });
    }

    // ═══════════════════════════════════════════════════
    // 7. PRIVATE TRANSFER USAD
    // ═══════════════════════════════════════════════════

    fn private_transfer_usad(
        input_token: test_usad_stablecoin.aleo::Token,
        merkle_proof: [test_usad_stablecoin.aleo::MerkleProof; 2u32],
        recipient: address,
        amount: u128,
        nonce: field,
    ) -> (PrivateTransferReceipt, Final) {
        assert(amount >= MIN_TRANSFER_AMOUNT);

        let signer_field: field = BHP256::hash_to_field(self.signer);
        let nonce_hash: field = BHP256::hash_to_field(nonce + signer_field);

        let receipt: PrivateTransferReceipt = PrivateTransferReceipt {
            owner: self.signer,
            amount: amount,
            token_type: 1u8,
            nonce_hash: nonce_hash,
        };

        let (compliance_in, change_tok, deposit_future): (test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, Final) =
            test_usad_stablecoin.aleo::transfer_private_to_public(self.address, amount, input_token, merkle_proof);

        let (compliance_out, recipient_tok, withdraw_future): (test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, Final) =
            test_usad_stablecoin.aleo::transfer_public_to_private(recipient, amount);

        return (receipt, final {
            deposit_future.run();
            withdraw_future.run();

            let paused: bool = Mapping::get_or_use(vault_paused, 0u8, false);
            assert(!paused);

            let nonce_used: bool = Mapping::get_or_use(used_nonces, nonce_hash, false);
            assert(!nonce_used);
            Mapping::set(used_nonces, nonce_hash, true);

            let count: u64 = Mapping::get_or_use(transfer_count, 1u8, 0u64);
            Mapping::set(transfer_count, 1u8, count + 1u64);

            let volume: u128 = Mapping::get_or_use(total_volume, 1u8, 0u128);
            Mapping::set(total_volume, 1u8, volume + amount);
        });
    }

    // ═══════════════════════════════════════════════════
    // 8. SET VAULT ADMIN
    // ═══════════════════════════════════════════════════

    fn set_vault_admin(
        new_admin: address,
    ) -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(vault_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(vault_admin, 0u8, new_admin);
        };
    }

    // ═══════════════════════════════════════════════════
    // 9. PAUSE VAULT
    // ═══════════════════════════════════════════════════

    fn pause_vault() -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(vault_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(vault_paused, 0u8, true);
        };
    }

    // ═══════════════════════════════════════════════════
    // 10. RESUME VAULT
    // ═══════════════════════════════════════════════════

    fn resume_vault() -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(vault_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(vault_paused, 0u8, false);
        };
    }
}
