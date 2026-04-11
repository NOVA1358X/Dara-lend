import test_eth_v1.aleo;
import test_usdcx_stablecoin.aleo;

program dara_dp_eth_v2.aleo {

    // CONSTANTS
    const SCALE: u128 = 1_000_000u128;
    const BPS_DENOM: u128 = 10_000u128;
    const MIN_ORDER_SIZE: u128 = 100_000u128;
    const MIN_ORDER_TOKEN: u64 = 100_000u64;
    const MAX_PRICE: u64 = 100_000_000u64;
    const DEFAULT_FEE_BPS: u64 = 5u64;
    const DEFAULT_TWAP_WINDOW: u32 = 3600u32;
    const DEFAULT_TWAP_DEVIATION: u64 = 500u64;
    const DEFAULT_MIN_BATCH: u32 = 100u32;
    const MAX_DEVIATION_BPS: u64 = 1500u64;

    // RECORDS
    record OrderCommitment {
        owner: address,
        order_id: field,
        direction: u8,
        size: u128,
        limit_price: u64,
        expiry_block: u32,
        batch_id: u64,
    }

    record OrderAuth {
        owner: address,
        trader: address,
        order_id: field,
        direction: u8,
        size: u128,
        limit_price: u64,
        expiry_block: u32,
    }

    record FillReceipt {
        owner: address,
        order_id: field,
        direction: u8,
        filled_size: u128,
        clearing_price: u64,
        fee_paid: u128,
        batch_id: u64,
    }

    record ResidualOrder {
        owner: address,
        order_id: field,
        parent_order_id: field,
        direction: u8,
        remaining_size: u128,
        limit_price: u64,
        expiry_block: u32,
    }

    record ResidualAuth {
        owner: address,
        trader: address,
        order_id: field,
        direction: u8,
        remaining_size: u128,
        limit_price: u64,
        expiry_block: u32,
    }

    // MAPPINGS
    mapping operators: u8 => address;
    mapping pool_paused: u8 => bool;
    mapping order_consumed: field => bool;
    mapping fee_vault: u8 => u128;
    mapping fee_bps: u8 => u64;
    mapping total_trades: u8 => u64;
    mapping total_volume: u8 => u128;
    mapping oracle_price: u8 => u64;
    mapping oracle_round: u8 => u64;
    mapping twap_cum_price: u8 => u128;
    mapping twap_cum_count: u8 => u64;
    mapping twap_last_reset: u8 => u32;
    mapping twap_window_blocks: u8 => u32;
    mapping twap_max_deviation_bps: u8 => u64;
    mapping current_batch: u8 => u64;
    mapping batch_approved: u64 => bool;
    mapping batch_proposed_price: u64 => u64;
    mapping batch_proposer: u64 => address;
    mapping batch_approval_count: u64 => u8;
    mapping operator_approved_batch: field => bool;
    mapping batch_start_block: u64 => u32;
    mapping min_batch_blocks: u8 => u32;

    // CONSTRUCTOR
    @custom
    constructor() {
        Mapping::set(operators, 0u8, aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8);
        Mapping::set(operators, 1u8, aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8);
        Mapping::set(operators, 2u8, aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8);
        Mapping::set(operators, 3u8, aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8);
        Mapping::set(pool_paused, 0u8, false);
        Mapping::set(fee_bps, 0u8, DEFAULT_FEE_BPS);
        Mapping::set(fee_vault, 0u8, 0u128);
        Mapping::set(total_trades, 0u8, 0u64);
        Mapping::set(total_volume, 0u8, 0u128);
        Mapping::set(oracle_price, 0u8, 0u64);
        Mapping::set(oracle_round, 0u8, 0u64);
        Mapping::set(twap_cum_price, 0u8, 0u128);
        Mapping::set(twap_cum_count, 0u8, 0u64);
        Mapping::set(twap_last_reset, 0u8, 0u32);
        Mapping::set(twap_window_blocks, 0u8, DEFAULT_TWAP_WINDOW);
        Mapping::set(twap_max_deviation_bps, 0u8, DEFAULT_TWAP_DEVIATION);
        Mapping::set(current_batch, 0u8, 1u64);
        Mapping::set(batch_start_block, 1u64, 0u32);
        Mapping::set(min_batch_blocks, 0u8, DEFAULT_MIN_BATCH);
    }

    // 1. SET OPERATORS
    fn set_operators(op0: address, op1: address, op2: address) -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(operators, 0u8);
            assert_eq(caller, admin);
            Mapping::set(operators, 1u8, op0);
            Mapping::set(operators, 2u8, op1);
            Mapping::set(operators, 3u8, op2);
        };
    }

    // 2. UPDATE ORACLE PRICE
    fn update_oracle_price(new_price: u64, round: u64) -> Final {
        assert(new_price > 0u64);
        assert(new_price <= MAX_PRICE);
        let caller: address = self.caller;

        return final {
            let op0: address = Mapping::get(operators, 1u8);
            let op1: address = Mapping::get(operators, 2u8);
            let op2: address = Mapping::get(operators, 3u8);
            let is_op: bool = (caller == op0) || (caller == op1) || (caller == op2);
            assert(is_op);

            let paused: bool = Mapping::get_or_use(pool_paused, 0u8, false);
            assert(!paused);

            let current_round: u64 = Mapping::get_or_use(oracle_round, 0u8, 0u64);
            assert(round > current_round);
            Mapping::set(oracle_round, 0u8, round);

            let last_price: u64 = Mapping::get_or_use(oracle_price, 0u8, 0u64);
            if (last_price > 0u64) {
                // Safe absolute difference: compute higher/lower first, then ONE subtraction.
                // Leo eagerly evaluates both ternary branches, so `a > b ? a-b : b-a`
                // causes underflow on the unused branch. This pattern avoids that.
                let higher: u64 = new_price >= last_price ? new_price : last_price;
                let lower: u64 = new_price < last_price ? new_price : last_price;
                let diff: u64 = higher - lower;
                let max_move: u64 = last_price * MAX_DEVIATION_BPS / 10_000u64;
                assert(diff <= max_move);
            }
            Mapping::set(oracle_price, 0u8, new_price);

            let window: u32 = Mapping::get_or_use(twap_window_blocks, 0u8, DEFAULT_TWAP_WINDOW);
            let last_reset: u32 = Mapping::get_or_use(twap_last_reset, 0u8, 0u32);
            let elapsed: u32 = block.height - last_reset;

            if (elapsed >= window) {
                Mapping::set(twap_cum_price, 0u8, new_price as u128);
                Mapping::set(twap_cum_count, 0u8, 1u64);
                Mapping::set(twap_last_reset, 0u8, block.height);
            } else {
                let cum: u128 = Mapping::get_or_use(twap_cum_price, 0u8, 0u128);
                Mapping::set(twap_cum_price, 0u8, cum + (new_price as u128));
                let cnt: u64 = Mapping::get_or_use(twap_cum_count, 0u8, 0u64);
                Mapping::set(twap_cum_count, 0u8, cnt + 1u64);
            }
        };
    }

    // 3. SUBMIT BUY ORDER (locks USDCx)
    fn submit_buy_order(
        input_token: test_usdcx_stablecoin.aleo::Token,
        merkle_proof: [test_usdcx_stablecoin.aleo::MerkleProof; 2u32],
        size: u128,
        limit_price: u64,
        expiry_block: u32,
        operator_addr: address,
        nonce: field,
    ) -> (OrderCommitment, OrderAuth, Final) {
        assert(size >= MIN_ORDER_SIZE);
        assert(limit_price > 0u64);
        assert(limit_price <= MAX_PRICE);

        let lock_amount: u128 = size * (limit_price as u128) / SCALE;
        assert(lock_amount > 0u128);

        let signer_field: field = BHP256::hash_to_field(self.signer);
        let order_id: field = BHP256::hash_to_field(nonce + signer_field);

        let commitment: OrderCommitment = OrderCommitment {
            owner: self.signer,
            order_id: order_id,
            direction: 0u8,
            size: size,
            limit_price: limit_price,
            expiry_block: expiry_block,
            batch_id: 0u64,
        };

        let auth: OrderAuth = OrderAuth {
            owner: operator_addr,
            trader: self.signer,
            order_id: order_id,
            direction: 0u8,
            size: size,
            limit_price: limit_price,
            expiry_block: expiry_block,
        };

        let (compliance_rec, change_tok, deposit_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_private_to_public(self.address, lock_amount, input_token, merkle_proof);

        return (commitment, auth, final {
            deposit_future.run();

            let paused: bool = Mapping::get_or_use(pool_paused, 0u8, false);
            assert(!paused);

            let consumed: bool = Mapping::get_or_use(order_consumed, order_id, false);
            assert(!consumed);

            assert(expiry_block > block.height);

            let trades: u64 = Mapping::get_or_use(total_trades, 0u8, 0u64);
            Mapping::set(total_trades, 0u8, trades + 1u64);
            let vol: u128 = Mapping::get_or_use(total_volume, 0u8, 0u128);
            Mapping::set(total_volume, 0u8, vol + size);
        });
    }

    // 4. SUBMIT SELL ORDER (locks ETH)
    fn submit_sell_order(
        input_token: test_eth_v1.aleo::Token,
        amount: u64,
        limit_price: u64,
        expiry_block: u32,
        operator_addr: address,
        nonce: field,
    ) -> (OrderCommitment, OrderAuth, Final) {
        assert(amount >= MIN_ORDER_TOKEN);
        assert(limit_price > 0u64);
        assert(limit_price <= MAX_PRICE);

        let size: u128 = amount as u128;

        let signer_field: field = BHP256::hash_to_field(self.signer);
        let order_id: field = BHP256::hash_to_field(nonce + signer_field);

        let commitment: OrderCommitment = OrderCommitment {
            owner: self.signer,
            order_id: order_id,
            direction: 1u8,
            size: size,
            limit_price: limit_price,
            expiry_block: expiry_block,
            batch_id: 0u64,
        };

        let auth: OrderAuth = OrderAuth {
            owner: operator_addr,
            trader: self.signer,
            order_id: order_id,
            direction: 1u8,
            size: size,
            limit_price: limit_price,
            expiry_block: expiry_block,
        };

        let (change_token, token_future): (test_eth_v1.aleo::Token, Final) =
            test_eth_v1.aleo::transfer_private_to_public(input_token, self.address, amount);

        return (commitment, auth, final {
            token_future.run();

            let paused: bool = Mapping::get_or_use(pool_paused, 0u8, false);
            assert(!paused);

            let consumed: bool = Mapping::get_or_use(order_consumed, order_id, false);
            assert(!consumed);

            assert(expiry_block > block.height);

            let trades: u64 = Mapping::get_or_use(total_trades, 0u8, 0u64);
            Mapping::set(total_trades, 0u8, trades + 1u64);
            let vol: u128 = Mapping::get_or_use(total_volume, 0u8, 0u128);
            Mapping::set(total_volume, 0u8, vol + size);
        });
    }

    // 5. PROPOSE SETTLEMENT
    fn propose_settlement(batch_id: u64, proposed_price: u64) -> Final {
        assert(proposed_price > 0u64);
        assert(proposed_price <= MAX_PRICE);
        let caller: address = self.caller;

        return final {
            let paused: bool = Mapping::get_or_use(pool_paused, 0u8, false);
            assert(!paused);

            let op0: address = Mapping::get(operators, 1u8);
            let op1: address = Mapping::get(operators, 2u8);
            let op2: address = Mapping::get(operators, 3u8);
            let is_op: bool = (caller == op0) || (caller == op1) || (caller == op2);
            assert(is_op);

            let current: u64 = Mapping::get_or_use(current_batch, 0u8, 1u64);
            assert_eq(batch_id, current);

            let already_approved: bool = Mapping::get_or_use(batch_approved, batch_id, false);
            assert(!already_approved);

            let start_blk: u32 = Mapping::get_or_use(batch_start_block, batch_id, 0u32);
            let min_blks: u32 = Mapping::get_or_use(min_batch_blocks, 0u8, DEFAULT_MIN_BATCH);
            assert(block.height >= start_blk + min_blks);

            let cum_price: u128 = Mapping::get_or_use(twap_cum_price, 0u8, 0u128);
            let cum_count: u64 = Mapping::get_or_use(twap_cum_count, 0u8, 0u64);

            if (cum_count > 0u64) {
                let twap: u128 = cum_price / (cum_count as u128);
                let max_dev: u64 = Mapping::get_or_use(twap_max_deviation_bps, 0u8, DEFAULT_TWAP_DEVIATION);
                let proposed_128: u128 = proposed_price as u128;
                // Safe absolute difference (see update_oracle_price comment)
                let higher_128: u128 = proposed_128 >= twap ? proposed_128 : twap;
                let lower_128: u128 = proposed_128 < twap ? proposed_128 : twap;
                let diff: u128 = higher_128 - lower_128;
                let max_allowed: u128 = twap * (max_dev as u128) / 10_000u128;
                assert(diff <= max_allowed);
            }

            Mapping::set(batch_proposed_price, batch_id, proposed_price);
            Mapping::set(batch_proposer, batch_id, caller);
            Mapping::set(batch_approval_count, batch_id, 1u8);

            let batch_field: field = BHP256::hash_to_field(batch_id);
            let caller_field: field = BHP256::hash_to_field(caller);
            let approval_hash: field = BHP256::hash_to_field(batch_field + caller_field);
            Mapping::set(operator_approved_batch, approval_hash, true);
        };
    }

    // 6. APPROVE SETTLEMENT
    fn approve_settlement(batch_id: u64, proposed_price: u64) -> Final {
        let caller: address = self.caller;

        return final {
            let paused: bool = Mapping::get_or_use(pool_paused, 0u8, false);
            assert(!paused);

            let op0: address = Mapping::get(operators, 1u8);
            let op1: address = Mapping::get(operators, 2u8);
            let op2: address = Mapping::get(operators, 3u8);
            let is_op: bool = (caller == op0) || (caller == op1) || (caller == op2);
            assert(is_op);

            let current: u64 = Mapping::get_or_use(current_batch, 0u8, 1u64);
            assert_eq(batch_id, current);

            let already_approved: bool = Mapping::get_or_use(batch_approved, batch_id, false);
            assert(!already_approved);

            let stored_price: u64 = Mapping::get(batch_proposed_price, batch_id);
            assert_eq(proposed_price, stored_price);

            let batch_field: field = BHP256::hash_to_field(batch_id);
            let caller_field: field = BHP256::hash_to_field(caller);
            let approval_hash: field = BHP256::hash_to_field(batch_field + caller_field);
            let already_signed: bool = Mapping::get_or_use(operator_approved_batch, approval_hash, false);
            assert(!already_signed);
            Mapping::set(operator_approved_batch, approval_hash, true);

            let count: u8 = Mapping::get_or_use(batch_approval_count, batch_id, 0u8);
            let new_count: u8 = count + 1u8;
            Mapping::set(batch_approval_count, batch_id, new_count);

            if (new_count >= 2u8) {
                Mapping::set(batch_approved, batch_id, true);
            }
        };
    }

    // 7. EXECUTE MATCH (ETH to buyer, USDCx to seller)
    fn execute_match(
        buy_auth: OrderAuth,
        sell_auth: OrderAuth,
        clearing_price: u64,
        batch_id: u64,
        buy_trader: address,
        sell_trader: address,
    ) -> (FillReceipt, FillReceipt, Final) {
        assert(buy_auth.direction == 0u8);
        assert(sell_auth.direction == 1u8);
        assert(clearing_price > 0u64);
        assert(clearing_price <= MAX_PRICE);
        assert(clearing_price <= buy_auth.limit_price);
        assert(clearing_price >= sell_auth.limit_price);

        let fill_size: u128 = buy_auth.size <= sell_auth.size ? buy_auth.size : sell_auth.size;
        assert(fill_size > 0u128);

        let gross_usdcx: u128 = fill_size * (clearing_price as u128) / SCALE;
        assert(gross_usdcx > 0u128);

        let fee_estimate: u128 = gross_usdcx * (DEFAULT_FEE_BPS as u128) / BPS_DENOM;
        let net_to_seller: u128 = gross_usdcx - fee_estimate;
        let token_to_buyer: u64 = fill_size as u64;

        let buy_order_id: field = buy_auth.order_id;
        let sell_order_id: field = sell_auth.order_id;

        let buy_receipt: FillReceipt = FillReceipt {
            owner: buy_trader,
            order_id: buy_order_id,
            direction: 0u8,
            filled_size: fill_size,
            clearing_price: clearing_price,
            fee_paid: fee_estimate,
            batch_id: batch_id,
        };

        let sell_receipt: FillReceipt = FillReceipt {
            owner: sell_trader,
            order_id: sell_order_id,
            direction: 1u8,
            filled_size: fill_size,
            clearing_price: clearing_price,
            fee_paid: 0u128,
            batch_id: batch_id,
        };

        let (compliance_rec, usdcx_tok, usdcx_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(sell_trader, net_to_seller);

        let (return_token, token_future): (test_eth_v1.aleo::Token, Final) =
            test_eth_v1.aleo::transfer_public_to_private(buy_trader, token_to_buyer);

        return (buy_receipt, sell_receipt, final {
            usdcx_future.run();
            token_future.run();

            let paused: bool = Mapping::get_or_use(pool_paused, 0u8, false);
            assert(!paused);

            let approved: bool = Mapping::get_or_use(batch_approved, batch_id, false);
            assert(approved);

            let buy_consumed: bool = Mapping::get_or_use(order_consumed, buy_order_id, false);
            assert(!buy_consumed);
            let sell_consumed: bool = Mapping::get_or_use(order_consumed, sell_order_id, false);
            assert(!sell_consumed);

            Mapping::set(order_consumed, buy_order_id, true);
            Mapping::set(order_consumed, sell_order_id, true);

            let current_fee_vault: u128 = Mapping::get_or_use(fee_vault, 0u8, 0u128);
            let actual_fee_bps: u64 = Mapping::get_or_use(fee_bps, 0u8, DEFAULT_FEE_BPS);
            let actual_fee: u128 = gross_usdcx * (actual_fee_bps as u128) / BPS_DENOM;
            Mapping::set(fee_vault, 0u8, current_fee_vault + actual_fee);
        });
    }

    // 8. EXECUTE PARTIAL FILL
    fn execute_partial_fill(
        buy_auth: OrderAuth,
        sell_auth: OrderAuth,
        clearing_price: u64,
        fill_size: u128,
        batch_id: u64,
        buy_trader: address,
        sell_trader: address,
        residual_nonce: field,
    ) -> (FillReceipt, FillReceipt, ResidualOrder, ResidualAuth, Final) {
        assert(buy_auth.direction == 0u8);
        assert(sell_auth.direction == 1u8);
        assert(clearing_price > 0u64);
        assert(clearing_price <= MAX_PRICE);
        assert(clearing_price <= buy_auth.limit_price);
        assert(clearing_price >= sell_auth.limit_price);
        assert(fill_size > 0u128);
        assert(fill_size < buy_auth.size || fill_size < sell_auth.size);

        let buy_remaining: u128 = buy_auth.size - fill_size;
        let sell_remaining: u128 = sell_auth.size - fill_size;
        assert(buy_remaining == 0u128 || sell_remaining == 0u128);

        let gross_usdcx: u128 = fill_size * (clearing_price as u128) / SCALE;
        let fee_estimate: u128 = gross_usdcx * (DEFAULT_FEE_BPS as u128) / BPS_DENOM;
        let net_to_seller: u128 = gross_usdcx - fee_estimate;
        let token_to_buyer: u64 = fill_size as u64;

        let buy_order_id: field = buy_auth.order_id;
        let sell_order_id: field = sell_auth.order_id;
        let buy_limit: u64 = buy_auth.limit_price;
        let sell_limit: u64 = sell_auth.limit_price;
        let buy_expiry: u32 = buy_auth.expiry_block;
        let sell_expiry: u32 = sell_auth.expiry_block;
        let op_addr: address = buy_auth.owner;

        let residual_id: field = BHP256::hash_to_field(residual_nonce + BHP256::hash_to_field(clearing_price as field));

        let residual_owner: address = buy_remaining > 0u128 ? buy_trader : sell_trader;
        let residual_direction: u8 = buy_remaining > 0u128 ? 0u8 : 1u8;
        let residual_size: u128 = buy_remaining > 0u128 ? buy_remaining : sell_remaining;
        let residual_limit: u64 = buy_remaining > 0u128 ? buy_limit : sell_limit;
        let residual_expiry: u32 = buy_remaining > 0u128 ? buy_expiry : sell_expiry;
        let parent_id: field = buy_remaining > 0u128 ? buy_order_id : sell_order_id;

        let buy_receipt: FillReceipt = FillReceipt {
            owner: buy_trader,
            order_id: buy_order_id,
            direction: 0u8,
            filled_size: fill_size,
            clearing_price: clearing_price,
            fee_paid: fee_estimate,
            batch_id: batch_id,
        };

        let sell_receipt: FillReceipt = FillReceipt {
            owner: sell_trader,
            order_id: sell_order_id,
            direction: 1u8,
            filled_size: fill_size,
            clearing_price: clearing_price,
            fee_paid: 0u128,
            batch_id: batch_id,
        };

        let residual: ResidualOrder = ResidualOrder {
            owner: residual_owner,
            order_id: residual_id,
            parent_order_id: parent_id,
            direction: residual_direction,
            remaining_size: residual_size,
            limit_price: residual_limit,
            expiry_block: residual_expiry,
        };

        let residual_auth: ResidualAuth = ResidualAuth {
            owner: op_addr,
            trader: residual_owner,
            order_id: residual_id,
            direction: residual_direction,
            remaining_size: residual_size,
            limit_price: residual_limit,
            expiry_block: residual_expiry,
        };

        let (compliance_rec, usdcx_tok, usdcx_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(sell_trader, net_to_seller);

        let (return_token, token_future): (test_eth_v1.aleo::Token, Final) =
            test_eth_v1.aleo::transfer_public_to_private(buy_trader, token_to_buyer);

        return (buy_receipt, sell_receipt, residual, residual_auth, final {
            usdcx_future.run();
            token_future.run();

            let paused: bool = Mapping::get_or_use(pool_paused, 0u8, false);
            assert(!paused);

            let approved: bool = Mapping::get_or_use(batch_approved, batch_id, false);
            assert(approved);

            let buy_consumed: bool = Mapping::get_or_use(order_consumed, buy_order_id, false);
            assert(!buy_consumed);
            let sell_consumed: bool = Mapping::get_or_use(order_consumed, sell_order_id, false);
            assert(!sell_consumed);
            Mapping::set(order_consumed, buy_order_id, true);
            Mapping::set(order_consumed, sell_order_id, true);

            let current_fee_vault: u128 = Mapping::get_or_use(fee_vault, 0u8, 0u128);
            let actual_fee_bps: u64 = Mapping::get_or_use(fee_bps, 0u8, DEFAULT_FEE_BPS);
            let actual_fee: u128 = gross_usdcx * (actual_fee_bps as u128) / BPS_DENOM;
            Mapping::set(fee_vault, 0u8, current_fee_vault + actual_fee);
        });
    }

    // 9. RESUBMIT RESIDUAL
    fn resubmit_residual(
        residual: ResidualOrder,
        residual_auth_rec: ResidualAuth,
        operator_addr: address,
    ) -> (OrderCommitment, OrderAuth) {
        let commitment: OrderCommitment = OrderCommitment {
            owner: self.signer,
            order_id: residual.order_id,
            direction: residual.direction,
            size: residual.remaining_size,
            limit_price: residual.limit_price,
            expiry_block: residual.expiry_block,
            batch_id: 0u64,
        };

        let auth: OrderAuth = OrderAuth {
            owner: operator_addr,
            trader: self.signer,
            order_id: residual.order_id,
            direction: residual.direction,
            size: residual.remaining_size,
            limit_price: residual.limit_price,
            expiry_block: residual.expiry_block,
        };

        return (commitment, auth);
    }

    // 10. CANCEL BUY ORDER (refunds USDCx)
    fn cancel_buy_order(commitment: OrderCommitment) -> Final {
        assert(commitment.direction == 0u8);
        let refund_amount: u128 = commitment.size * (commitment.limit_price as u128) / SCALE;
        let order_id: field = commitment.order_id;
        let caller: address = self.caller;

        let (compliance_rec, usdcx_tok, refund_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(caller, refund_amount);

        return final {
            refund_future.run();

            let paused: bool = Mapping::get_or_use(pool_paused, 0u8, false);
            assert(!paused);

            let consumed: bool = Mapping::get_or_use(order_consumed, order_id, false);
            assert(!consumed);
            Mapping::set(order_consumed, order_id, true);
        };
    }

    // 11. CANCEL SELL ORDER (refunds ETH)
    fn cancel_sell_order(commitment: OrderCommitment) -> Final {
        assert(commitment.direction == 1u8);
        let refund_token: u64 = commitment.size as u64;
        let order_id: field = commitment.order_id;
        let caller: address = self.caller;

        let (return_token, refund_future): (test_eth_v1.aleo::Token, Final) =
            test_eth_v1.aleo::transfer_public_to_private(caller, refund_token);

        return final {
            refund_future.run();

            let consumed: bool = Mapping::get_or_use(order_consumed, order_id, false);
            assert(!consumed);
            Mapping::set(order_consumed, order_id, true);
        };
    }

    // 12. ADVANCE BATCH
    fn advance_batch(batch_id: u64) -> Final {
        let caller: address = self.caller;
        return final {
            let op0: address = Mapping::get(operators, 1u8);
            let op1: address = Mapping::get(operators, 2u8);
            let op2: address = Mapping::get(operators, 3u8);
            let is_op: bool = (caller == op0) || (caller == op1) || (caller == op2);
            assert(is_op);

            let current: u64 = Mapping::get_or_use(current_batch, 0u8, 1u64);
            assert_eq(batch_id, current);

            let next: u64 = batch_id + 1u64;
            Mapping::set(current_batch, 0u8, next);
            Mapping::set(batch_start_block, next, block.height);
        };
    }

    // 13. WITHDRAW FEES (USDCx)
    fn withdraw_fees(amount: u128) -> Final {
        assert(amount > 0u128);
        let caller: address = self.caller;

        let (compliance_rec, usdcx_tok, withdraw_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, Final) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(caller, amount);

        return final {
            withdraw_future.run();

            let admin: address = Mapping::get(operators, 0u8);
            assert_eq(caller, admin);

            let vault: u128 = Mapping::get_or_use(fee_vault, 0u8, 0u128);
            assert(amount <= vault);
            Mapping::set(fee_vault, 0u8, vault - amount);
        };
    }

    // 14. SET FEE BPS
    fn set_fee_bps(new_fee_bps: u64) -> Final {
        assert(new_fee_bps >= 1u64);
        assert(new_fee_bps <= 100u64);
        let caller: address = self.caller;

        return final {
            let admin: address = Mapping::get(operators, 0u8);
            assert_eq(caller, admin);
            Mapping::set(fee_bps, 0u8, new_fee_bps);
        };
    }

    // 15. PAUSE DARK POOL
    fn pause_darkpool() -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(operators, 0u8);
            assert_eq(caller, admin);
            Mapping::set(pool_paused, 0u8, true);
        };
    }

    // 16. RESUME DARK POOL
    fn resume_darkpool() -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(operators, 0u8);
            assert_eq(caller, admin);
            Mapping::set(pool_paused, 0u8, false);
        };
    }

}
