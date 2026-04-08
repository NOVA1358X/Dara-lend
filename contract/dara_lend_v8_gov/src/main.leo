import credits.aleo;

program dara_lend_v8_gov.aleo {

    // ═══════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════

    const MIN_PROPOSAL_POWER: u64 = 100u64;
    const VOTING_PERIOD_BLOCKS: u32 = 200u32;
    const TIMELOCK_BLOCKS: u32 = 100u32;
    const QUORUM_BPS: u64 = 2_000u64;
    const BPS: u64 = 10_000u64;

    // ═══════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════

    struct ProposalData {
        proposer: address,
        proposal_type: u8,      // 0=rate_change, 1=ltv_change, 2=liq_threshold, 3=pause, 4=admin_transfer
        param_key: u8,          // which parameter (0=base, 1=slope1, 2=slope2, 3=optimal)
        param_value: u64,       // new value
        description_hash: field, // BHP256 hash of off-chain description
        start_block: u32,
        end_block: u32,
        timelock_end: u32,
    }

    struct VoteCount {
        votes_for: u64,
        votes_against: u64,
        votes_abstain: u64,
    }

    // Stores approved execution results for the main contract to read
    struct ExecutionResult {
        proposal_type: u8,
        param_key: u8,
        param_value: u64,
        executed: bool,
    }

    // ═══════════════════════════════════════════════════
    // RECORDS — Private voting via ZK records
    // ═══════════════════════════════════════════════════

    record GovernanceToken {
        owner: address,
        voting_power: u64,
    }

    record ProposalReceipt {
        owner: address,
        proposal_id: field,
        vote: u8,              // 0=against, 1=for, 2=abstain
        amount: u64,
    }

    record DelegationReceipt {
        owner: address,
        delegate_to: address,
        amount: u64,
    }

    // ═══════════════════════════════════════════════════
    // MAPPINGS
    // ═══════════════════════════════════════════════════

    mapping gov_admin: u8 => address;
    mapping governance_token_supply: u8 => u64;
    mapping proposals: field => ProposalData;
    mapping proposal_votes: field => VoteCount;
    mapping proposal_executed: field => bool;
    mapping proposal_count: u8 => u64;
    mapping voting_power: address => u64;
    mapping gov_paused: u8 => bool;

    // Execution results — main contract reads these via cross-program mapping queries
    mapping execution_results: field => ExecutionResult;
    mapping execution_count: u8 => u64;

    // Connected lending protocol address (for reference / admin validation)
    mapping lending_protocol: u8 => address;

    // ═══════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════

    @custom
    constructor() {
        Mapping::set(gov_admin, 0u8, aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8);
        Mapping::set(governance_token_supply, 0u8, 0u64);
        Mapping::set(proposal_count, 0u8, 0u64);
        Mapping::set(gov_paused, 0u8, false);
        Mapping::set(execution_count, 0u8, 0u64);
    }

    // ═══════════════════════════════════════════════════
    // 1. SET LENDING PROTOCOL — Connect to main contract
    // ═══════════════════════════════════════════════════

    fn set_lending_protocol(
        protocol_address: address,
    ) -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(gov_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(lending_protocol, 0u8, protocol_address);
        };
    }

    // ═══════════════════════════════════════════════════
    // 2. MINT GOVERNANCE TOKENS — Admin distributes voting power
    // ═══════════════════════════════════════════════════

    fn mint_governance_tokens(
        recipient: address,
        amount: u64,
    ) -> (GovernanceToken, Final) {
        assert(amount > 0u64);
        let caller: address = self.caller;

        let token: GovernanceToken = GovernanceToken {
            owner: recipient,
            voting_power: amount,
        };

        return (token, final {
            let admin: address = Mapping::get(gov_admin, 0u8);
            assert_eq(caller, admin);

            let supply: u64 = Mapping::get_or_use(governance_token_supply, 0u8, 0u64);
            Mapping::set(governance_token_supply, 0u8, supply + amount);

            let power: u64 = Mapping::get_or_use(voting_power, recipient, 0u64);
            Mapping::set(voting_power, recipient, power + amount);
        });
    }

    // ═══════════════════════════════════════════════════
    // 3. BURN GOVERNANCE TOKENS — Return voting power
    // ═══════════════════════════════════════════════════

    fn burn_governance_tokens(
        token: GovernanceToken,
    ) -> Final {
        let amount: u64 = token.voting_power;
        let owner_addr: address = token.owner;
        return final {
            let supply: u64 = Mapping::get_or_use(governance_token_supply, 0u8, 0u64);
            Mapping::set(governance_token_supply, 0u8, supply - amount);

            let power: u64 = Mapping::get_or_use(voting_power, owner_addr, 0u64);
            Mapping::set(voting_power, owner_addr, power - amount);
        };
    }

    // ═══════════════════════════════════════════════════
    // 4. CREATE PROPOSAL — Propose parameter changes
    // ═══════════════════════════════════════════════════

    fn create_proposal(
        proposal_type: u8,
        param_key: u8,
        param_value: u64,
        description_hash: field,
    ) -> Final {
        assert(proposal_type <= 4u8);
        let caller: address = self.caller;
        return final {
            let paused: bool = Mapping::get_or_use(gov_paused, 0u8, false);
            assert(!paused);

            let power: u64 = Mapping::get_or_use(voting_power, caller, 0u64);
            assert(power >= MIN_PROPOSAL_POWER);

            let count: u64 = Mapping::get_or_use(proposal_count, 0u8, 0u64);
            let proposal_id: field = BHP256::hash_to_field(count);

            let proposal: ProposalData = ProposalData {
                proposer: caller,
                proposal_type: proposal_type,
                param_key: param_key,
                param_value: param_value,
                description_hash: description_hash,
                start_block: block.height,
                end_block: block.height + VOTING_PERIOD_BLOCKS,
                timelock_end: block.height + VOTING_PERIOD_BLOCKS + TIMELOCK_BLOCKS,
            };

            Mapping::set(proposals, proposal_id, proposal);
            Mapping::set(proposal_votes, proposal_id, VoteCount {
                votes_for: 0u64,
                votes_against: 0u64,
                votes_abstain: 0u64,
            });
            Mapping::set(proposal_executed, proposal_id, false);
            Mapping::set(proposal_count, 0u8, count + 1u64);
        };
    }

    // ═══════════════════════════════════════════════════
    // 5. VOTE — Private vote via ZK record
    // ═══════════════════════════════════════════════════

    fn vote(
        proposal_id: field,
        support: u8,
        amount: u64,
    ) -> (ProposalReceipt, Final) {
        assert(support <= 2u8);
        assert(amount > 0u64);
        let caller: address = self.caller;

        let receipt: ProposalReceipt = ProposalReceipt {
            owner: self.signer,
            proposal_id: proposal_id,
            vote: support,
            amount: amount,
        };

        return (receipt, final {
            let paused: bool = Mapping::get_or_use(gov_paused, 0u8, false);
            assert(!paused);

            let proposal: ProposalData = Mapping::get(proposals, proposal_id);
            assert(block.height >= proposal.start_block);
            assert(block.height <= proposal.end_block);

            let power: u64 = Mapping::get_or_use(voting_power, caller, 0u64);
            assert(power >= amount);

            let current_votes: VoteCount = Mapping::get(proposal_votes, proposal_id);

            let new_for: u64 = support == 1u8 ? current_votes.votes_for + amount : current_votes.votes_for;
            let new_against: u64 = support == 0u8 ? current_votes.votes_against + amount : current_votes.votes_against;
            let new_abstain: u64 = support == 2u8 ? current_votes.votes_abstain + amount : current_votes.votes_abstain;

            Mapping::set(proposal_votes, proposal_id, VoteCount {
                votes_for: new_for,
                votes_against: new_against,
                votes_abstain: new_abstain,
            });
        });
    }

    // ═══════════════════════════════════════════════════
    // 6. EXECUTE PROPOSAL — Permissionless after timelock + quorum
    //    Stores execution result for main contract to read
    // ═══════════════════════════════════════════════════

    fn execute_proposal(
        proposal_id: field,
    ) -> Final {
        return final {
            let proposal: ProposalData = Mapping::get(proposals, proposal_id);
            assert(block.height >= proposal.timelock_end);

            let executed: bool = Mapping::get_or_use(proposal_executed, proposal_id, false);
            assert(!executed);

            let votes: VoteCount = Mapping::get(proposal_votes, proposal_id);
            let total_votes: u64 = votes.votes_for + votes.votes_against + votes.votes_abstain;
            let supply: u64 = Mapping::get_or_use(governance_token_supply, 0u8, 1u64);
            let quorum_met: bool = total_votes * BPS / supply >= QUORUM_BPS;
            assert(quorum_met);
            assert(votes.votes_for > votes.votes_against);

            // Store execution result so main contract admin can apply it
            let result: ExecutionResult = ExecutionResult {
                proposal_type: proposal.proposal_type,
                param_key: proposal.param_key,
                param_value: proposal.param_value,
                executed: true,
            };
            Mapping::set(execution_results, proposal_id, result);

            let exec_count: u64 = Mapping::get_or_use(execution_count, 0u8, 0u64);
            Mapping::set(execution_count, 0u8, exec_count + 1u64);

            Mapping::set(proposal_executed, proposal_id, true);
        };
    }

    // ═══════════════════════════════════════════════════
    // 7. DELEGATE VOTES — Transfer voting power
    // ═══════════════════════════════════════════════════

    fn delegate_votes(
        delegate_to: address,
        amount: u64,
    ) -> (DelegationReceipt, Final) {
        assert(amount > 0u64);
        let caller: address = self.caller;

        let receipt: DelegationReceipt = DelegationReceipt {
            owner: self.signer,
            delegate_to: delegate_to,
            amount: amount,
        };

        return (receipt, final {
            let caller_power: u64 = Mapping::get_or_use(voting_power, caller, 0u64);
            assert(caller_power >= amount);

            Mapping::set(voting_power, caller, caller_power - amount);

            let delegate_power: u64 = Mapping::get_or_use(voting_power, delegate_to, 0u64);
            Mapping::set(voting_power, delegate_to, delegate_power + amount);
        });
    }

    // ═══════════════════════════════════════════════════
    // 8. UNDELEGATE VOTES — Reclaim delegated power
    // ═══════════════════════════════════════════════════

    fn undelegate_votes(
        delegation: DelegationReceipt,
    ) -> Final {
        let amount: u64 = delegation.amount;
        let from_delegate: address = delegation.delegate_to;
        let owner_addr: address = delegation.owner;
        return final {
            let delegate_power: u64 = Mapping::get_or_use(voting_power, from_delegate, 0u64);
            assert(delegate_power >= amount);
            Mapping::set(voting_power, from_delegate, delegate_power - amount);

            let owner_power: u64 = Mapping::get_or_use(voting_power, owner_addr, 0u64);
            Mapping::set(voting_power, owner_addr, owner_power + amount);
        };
    }

    // ═══════════════════════════════════════════════════
    // 9. SET GOV ADMIN — Transfer governance admin
    // ═══════════════════════════════════════════════════

    fn set_gov_admin(
        new_admin: address,
    ) -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(gov_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(gov_admin, 0u8, new_admin);
        };
    }

    // ═══════════════════════════════════════════════════
    // 10. PAUSE / RESUME GOVERNANCE
    // ═══════════════════════════════════════════════════

    fn pause_governance() -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(gov_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(gov_paused, 0u8, true);
        };
    }

    fn resume_governance() -> Final {
        let caller: address = self.caller;
        return final {
            let admin: address = Mapping::get(gov_admin, 0u8);
            assert_eq(caller, admin);
            Mapping::set(gov_paused, 0u8, false);
        };
    }
}
