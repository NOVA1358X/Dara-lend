import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { GOV_PROGRAM_ID, ALEO_TESTNET_API, GOV_MAPPINGS, GOV_TRANSITIONS, PRECISION } from '@/utils/constants';

interface GovernanceProps {
  wallet: {
    requestTransaction?: (transaction: any) => Promise<{ transactionId: string } | undefined>;
    connected: boolean;
    address?: string | null;
  };
}

interface Proposal {
  id: string;
  proposer: string;
  type: number;
  paramKey: number;
  paramValue: number;
  startBlock: number;
  endBlock: number;
  timelockEnd: number;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  executed: boolean;
}

const PROPOSAL_TYPES = ['Rate Change', 'LTV Change', 'Liquidation Threshold', 'Pause/Resume', 'Admin Transfer'];
const RATE_PARAM_LABELS = ['Base Rate', 'Slope 1', 'Slope 2', 'Optimal Utilization'];

async function fetchMapping(mapping: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(`${ALEO_TESTNET_API}/program/${GOV_PROGRAM_ID}/mapping/${mapping}/${key}`);
    if (!res.ok) return null;
    const text = await res.text();
    return text.replace(/"/g, '').trim() || null;
  } catch {
    return null;
  }
}

function parseU64(raw: string | null): number {
  if (!raw) return 0;
  return parseInt(raw.replace(/u64|\.public|\.private/g, '').trim(), 10) || 0;
}

export function GovernancePanel({ wallet }: GovernanceProps) {
  const [proposalCount, setProposalCount] = useState(0);
  const [votingPower, setVotingPower] = useState(0);
  const [tokenSupply, setTokenSupply] = useState(0);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  // New proposal form
  const [proposalType, setProposalType] = useState(0);
  const [paramKey, setParamKey] = useState(0);
  const [paramValue, setParamValue] = useState('');
  const [voteAmount, setVoteAmount] = useState('');

  // Delegation form
  const [delegateTo, setDelegateTo] = useState('');
  const [delegateAmount, setDelegateAmount] = useState('');

  const fetchGovernanceData = useCallback(async () => {
    setLoading(true);
    try {
      const [countRaw, supplyRaw, powerRaw] = await Promise.all([
        fetchMapping(GOV_MAPPINGS.PROPOSAL_COUNT, '0u8'),
        fetchMapping(GOV_MAPPINGS.GOVERNANCE_TOKEN_SUPPLY, '0u8'),
        wallet.address ? fetchMapping(GOV_MAPPINGS.VOTING_POWER, wallet.address) : Promise.resolve(null),
      ]);

      const count = parseU64(countRaw);
      setProposalCount(count);
      setTokenSupply(parseU64(supplyRaw));
      setVotingPower(parseU64(powerRaw));

      // Fetch recent proposals (last 10)
      const proposalPromises = [];
      const start = Math.max(0, count - 10);
      for (let i = start; i < count; i++) {
        proposalPromises.push(fetchProposal(i));
      }
      const fetched = (await Promise.all(proposalPromises)).filter(Boolean) as Proposal[];
      setProposals(fetched.reverse());
    } catch (err) {
      console.error('Failed to fetch governance data:', err);
    }
    setLoading(false);
  }, [wallet.address]);

  async function fetchProposal(index: number): Promise<Proposal | null> {
    // proposal_id = BHP256::hash_to_field(count) — we approximate by fetching by index field
    // In practice, the proposal_id is deterministic from the count
    const idField = `${index}field`;
    try {
      const [proposalRaw, votesRaw, executedRaw] = await Promise.all([
        fetchMapping(GOV_MAPPINGS.PROPOSALS, idField),
        fetchMapping(GOV_MAPPINGS.PROPOSAL_VOTES, idField),
        fetchMapping(GOV_MAPPINGS.PROPOSAL_EXECUTED, idField),
      ]);

      if (!proposalRaw) return null;

      // Parse struct fields from on-chain format
      const getField = (data: string, name: string): string => {
        const match = data.match(new RegExp(`${name}:\\s*([^,}]+)`));
        return match ? match[1].trim() : '0';
      };

      const pType = parseInt(getField(proposalRaw, 'proposal_type').replace('u8', ''), 10);
      const pKey = parseInt(getField(proposalRaw, 'param_key').replace('u8', ''), 10);
      const pValue = parseInt(getField(proposalRaw, 'param_value').replace('u64', ''), 10);
      const startBlock = parseInt(getField(proposalRaw, 'start_block').replace('u32', ''), 10);
      const endBlock = parseInt(getField(proposalRaw, 'end_block').replace('u32', ''), 10);
      const timelockEnd = parseInt(getField(proposalRaw, 'timelock_end').replace('u32', ''), 10);

      let votesFor = 0, votesAgainst = 0, votesAbstain = 0;
      if (votesRaw) {
        votesFor = parseInt(getField(votesRaw, 'votes_for').replace('u64', ''), 10);
        votesAgainst = parseInt(getField(votesRaw, 'votes_against').replace('u64', ''), 10);
        votesAbstain = parseInt(getField(votesRaw, 'votes_abstain').replace('u64', ''), 10);
      }

      const executed = executedRaw?.includes('true') ?? false;

      return {
        id: idField,
        proposer: getField(proposalRaw, 'proposer'),
        type: pType,
        paramKey: pKey,
        paramValue: pValue,
        startBlock,
        endBlock,
        timelockEnd,
        votesFor,
        votesAgainst,
        votesAbstain,
        executed,
      };
    } catch {
      return null;
    }
  }

  useEffect(() => {
    fetchGovernanceData();
    const interval = setInterval(fetchGovernanceData, 60_000);
    return () => clearInterval(interval);
  }, [fetchGovernanceData]);

  const handleCreateProposal = async () => {
    if (!wallet.requestTransaction || !wallet.connected) {
      toast.error('Connect wallet first');
      return;
    }
    const value = parseInt(paramValue, 10);
    if (isNaN(value) || value <= 0) {
      toast.error('Enter a valid parameter value');
      return;
    }

    try {
      const descHash = '0field'; // Placeholder — real apps hash off-chain description
      const tx = {
        program: GOV_PROGRAM_ID,
        function: GOV_TRANSITIONS.CREATE_PROPOSAL,
        inputs: [`${proposalType}u8`, `${paramKey}u8`, `${value}u64`, descHash],
        fee: 500_000,
        privateFee: false,
      };
      const result = await wallet.requestTransaction(tx);
      if (result?.transactionId) {
        toast.success(`Proposal created: ${result.transactionId.slice(0, 12)}...`);
        setParamValue('');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create proposal');
    }
  };

  const handleVote = async (proposalId: string, support: number) => {
    if (!wallet.requestTransaction || !wallet.connected) {
      toast.error('Connect wallet first');
      return;
    }
    const amount = parseInt(voteAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter vote amount');
      return;
    }

    try {
      const tx = {
        program: GOV_PROGRAM_ID,
        function: GOV_TRANSITIONS.VOTE,
        inputs: [proposalId, `${support}u8`, `${amount}u64`],
        fee: 500_000,
        privateFee: false,
      };
      const result = await wallet.requestTransaction(tx);
      if (result?.transactionId) {
        toast.success(`Vote cast: ${result.transactionId.slice(0, 12)}...`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to vote');
    }
  };

  const handleExecute = async (proposalId: string) => {
    if (!wallet.requestTransaction) return;
    try {
      const tx = {
        program: GOV_PROGRAM_ID,
        function: GOV_TRANSITIONS.EXECUTE_PROPOSAL,
        inputs: [proposalId],
        fee: 500_000,
        privateFee: false,
      };
      const result = await wallet.requestTransaction(tx);
      if (result?.transactionId) {
        toast.success(`Executed: ${result.transactionId.slice(0, 12)}...`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Execution failed');
    }
  };

  const handleDelegate = async () => {
    if (!wallet.requestTransaction || !wallet.connected) {
      toast.error('Connect wallet first');
      return;
    }
    const amount = parseInt(delegateAmount, 10);
    if (isNaN(amount) || amount <= 0 || !delegateTo) {
      toast.error('Enter delegate address and amount');
      return;
    }
    try {
      const tx = {
        program: GOV_PROGRAM_ID,
        function: GOV_TRANSITIONS.DELEGATE_VOTES,
        inputs: [delegateTo, `${amount}u64`],
        fee: 500_000,
        privateFee: false,
      };
      const result = await wallet.requestTransaction(tx);
      if (result?.transactionId) {
        toast.success(`Delegated: ${result.transactionId.slice(0, 12)}...`);
        setDelegateTo('');
        setDelegateAmount('');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Delegation failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-xl p-4 border border-white/10"
        >
          <p className="text-xs text-gray-400 uppercase tracking-wider">Your Voting Power</p>
          <p className="text-2xl font-bold text-white mt-1">{votingPower.toLocaleString()}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white/5 rounded-xl p-4 border border-white/10"
        >
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Token Supply</p>
          <p className="text-2xl font-bold text-white mt-1">{tokenSupply.toLocaleString()}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 rounded-xl p-4 border border-white/10"
        >
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Proposals</p>
          <p className="text-2xl font-bold text-white mt-1">{proposalCount}</p>
        </motion.div>
      </div>

      {/* Create Proposal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white/5 rounded-xl p-6 border border-white/10"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Create Proposal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Proposal Type</label>
            <select
              value={proposalType}
              onChange={e => setProposalType(parseInt(e.target.value, 10))}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            >
              {PROPOSAL_TYPES.map((t, i) => (
                <option key={i} value={i}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              {proposalType === 0 ? 'Rate Parameter' : 'Parameter Key'}
            </label>
            <select
              value={paramKey}
              onChange={e => setParamKey(parseInt(e.target.value, 10))}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            >
              {proposalType === 0
                ? RATE_PARAM_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)
                : [0, 1, 2, 3].map(i => <option key={i} value={i}>Key {i}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">New Value (BPS)</label>
            <input
              type="number"
              value={paramValue}
              onChange={e => setParamValue(e.target.value)}
              placeholder="e.g. 400 for 4%"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCreateProposal}
              disabled={!wallet.connected || votingPower < 100}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Submit Proposal
            </button>
          </div>
        </div>
        {votingPower < 100 && (
          <p className="text-xs text-yellow-400 mt-2">Min 100 voting power required to create proposals</p>
        )}
      </motion.div>

      {/* Delegate Votes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white/5 rounded-xl p-6 border border-white/10"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Delegate Votes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="text-xs text-gray-400 block mb-1">Delegate To</label>
            <input
              type="text"
              value={delegateTo}
              onChange={e => setDelegateTo(e.target.value)}
              placeholder="aleo1..."
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Amount</label>
            <input
              type="number"
              value={delegateAmount}
              onChange={e => setDelegateAmount(e.target.value)}
              placeholder="100"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleDelegate}
              disabled={!wallet.connected}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Delegate
            </button>
          </div>
        </div>
      </motion.div>

      {/* Proposals List */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Active Proposals {loading && <span className="text-xs text-gray-500 ml-2">Loading...</span>}
        </h3>
        {proposals.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-8 border border-white/10 text-center">
            <p className="text-gray-400">No proposals yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map(p => {
              const totalVotes = p.votesFor + p.votesAgainst + p.votesAbstain;
              const forPct = totalVotes > 0 ? (p.votesFor / totalVotes) * 100 : 0;

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                        {PROPOSAL_TYPES[p.type] || `Type ${p.type}`}
                      </span>
                      {p.executed && (
                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">Executed</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">Blocks {p.startBlock} — {p.endBlock}</span>
                  </div>

                  <p className="text-sm text-gray-300 mb-3">
                    {p.type === 0
                      ? `Set ${RATE_PARAM_LABELS[p.paramKey] || `Key ${p.paramKey}`} to ${p.paramValue} BPS (${(p.paramValue / 100).toFixed(2)}%)`
                      : `Param ${p.paramKey} → ${p.paramValue}`}
                  </p>

                  {/* Vote bar */}
                  <div className="h-2 bg-gray-800 rounded-full mb-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                      style={{ width: `${forPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mb-3">
                    <span>For: {p.votesFor}</span>
                    <span>Against: {p.votesAgainst}</span>
                    <span>Abstain: {p.votesAbstain}</span>
                  </div>

                  {/* Actions */}
                  {!p.executed && (
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={voteAmount}
                        onChange={e => setVoteAmount(e.target.value)}
                        placeholder="Amount"
                        className="w-24 bg-black/40 border border-white/10 rounded px-2 py-1 text-white text-xs"
                      />
                      <button
                        onClick={() => handleVote(p.id, 1)}
                        className="bg-green-600/80 hover:bg-green-600 text-white rounded px-3 py-1 text-xs"
                      >
                        For
                      </button>
                      <button
                        onClick={() => handleVote(p.id, 0)}
                        className="bg-red-600/80 hover:bg-red-600 text-white rounded px-3 py-1 text-xs"
                      >
                        Against
                      </button>
                      <button
                        onClick={() => handleVote(p.id, 2)}
                        className="bg-gray-600/80 hover:bg-gray-600 text-white rounded px-3 py-1 text-xs"
                      >
                        Abstain
                      </button>
                      <button
                        onClick={() => handleExecute(p.id)}
                        className="ml-auto bg-yellow-600/80 hover:bg-yellow-600 text-white rounded px-3 py-1 text-xs"
                      >
                        Execute
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
