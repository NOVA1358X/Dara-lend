import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { TransactionFlow } from '@/components/shared/TransactionFlow';
import { useAppStore } from '@/stores/appStore';
import {
  GOV_PROGRAM_ID,
  ALEO_TESTNET_API,
  GOV_MAPPINGS,
  GOV_TRANSITIONS,
  ADMIN_ADDRESS,
  BACKEND_API,
  PROPOSAL_ID_TABLE,
} from '@/utils/constants';

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
const LTV_LABELS = ['LTV Ratio'];
const LIQ_LABELS = ['Liquidation Threshold'];

// Block-to-time helpers (~10 seconds per block on Aleo testnet)
const SECONDS_PER_BLOCK = 10;

const DURATION_OPTIONS = [
  { label: '1 Day', blocks: 8_640 },
  { label: '3 Days', blocks: 25_920 },
  { label: '1 Week', blocks: 60_480 },
  { label: '2 Weeks', blocks: 120_960 },
  { label: '1 Month', blocks: 259_200 },
] as const;

function blocksToDate(blockHeight: number, currentBlock: number): Date {
  const blockDiff = blockHeight - currentBlock;
  const secondsDiff = blockDiff * SECONDS_PER_BLOCK;
  return new Date(Date.now() + secondsDiff * 1000);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatTimeRemaining(targetBlock: number, currentBlock: number): string {
  if (currentBlock >= targetBlock) return 'Ended';
  const seconds = (targetBlock - currentBlock) * SECONDS_PER_BLOCK;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

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

function getParamLabels(proposalType: number) {
  switch (proposalType) {
    case 0: return RATE_PARAM_LABELS;
    case 1: return LTV_LABELS;
    case 2: return LIQ_LABELS;
    default: return ['Key 0', 'Key 1', 'Key 2', 'Key 3'];
  }
}

function formatProposalDescription(p: Proposal): string {
  switch (p.type) {
    case 0: {
      const label = RATE_PARAM_LABELS[p.paramKey] || `Rate Key ${p.paramKey}`;
      return `Set ${label} to ${p.paramValue} BPS (${(p.paramValue / 100).toFixed(2)}%)`;
    }
    case 1: return `Set LTV Ratio to ${(p.paramValue / 10000).toFixed(1)}%`;
    case 2: return `Set Liquidation Threshold to ${(p.paramValue / 10000).toFixed(1)}%`;
    case 3: return p.paramValue === 1 ? 'Pause Protocol' : 'Resume Protocol';
    case 4: return `Transfer Admin to new address (key ${p.paramKey})`;
    default: return `Param ${p.paramKey} → ${p.paramValue}`;
  }
}

export function GovernancePanel({ wallet }: GovernanceProps) {
  const { transactionStep, transactionId, transactionPending, setTransactionPending, setTransactionStep, setTransactionId, resetTransaction } = useAppStore();
  const [proposalCount, setProposalCount] = useState(0);
  const [votingPower, setVotingPower] = useState(0);
  const [tokenSupply, setTokenSupply] = useState(0);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [txPending, setTxPending] = useState(false);
  const [claimPending, setClaimPending] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'propose' | 'delegate'>('overview');
  const [currentBlock, setCurrentBlock] = useState(0);

  // New proposal form
  const [proposalType, setProposalType] = useState(0);
  const [paramKey, setParamKey] = useState(0);
  const [paramValue, setParamValue] = useState('');
  const [votingDuration, setVotingDuration] = useState<number>(DURATION_OPTIONS[1].blocks); // Default: 3 days

  // Delegation form
  const [delegateTo, setDelegateTo] = useState('');
  const [delegateAmount, setDelegateAmount] = useState('');

  // Admin mint form
  const [mintRecipient, setMintRecipient] = useState('');
  const [mintAmount, setMintAmount] = useState('');

  const isAdmin = wallet.address === ADMIN_ADDRESS;
  const [activeAction, setActiveAction] = useState<'admin' | 'overview' | 'propose' | 'delegate' | null>(null);

  const fetchGovernanceData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch current block height
      try {
        const blockRes = await fetch(`${ALEO_TESTNET_API}/block/latest`);
        if (blockRes.ok) {
          const blockData = await blockRes.json();
          setCurrentBlock(blockData?.header?.metadata?.height ?? 0);
        }
      } catch { /* non-critical */ }

      const [countRaw, supplyRaw, powerRaw] = await Promise.all([
        fetchMapping(GOV_MAPPINGS.PROPOSAL_COUNT, '0u8'),
        fetchMapping(GOV_MAPPINGS.GOVERNANCE_TOKEN_SUPPLY, '0u8'),
        wallet.address ? fetchMapping(GOV_MAPPINGS.VOTING_POWER, wallet.address) : Promise.resolve(null),
      ]);

      const count = parseU64(countRaw);
      setProposalCount(count);
      setTokenSupply(parseU64(supplyRaw));
      setVotingPower(parseU64(powerRaw));

      // Fetch recent proposals (last 10) using PRECOMPUTED proposal IDs
      // Proposal IDs = BHP256::hash_to_field(index_u64) — computed via Leo CLI
      const proposalPromises = [];
      const start = Math.max(0, count - 10);
      for (let i = start; i < count; i++) {
        const realId = PROPOSAL_ID_TABLE[i];
        if (realId) proposalPromises.push(fetchProposal(i, realId));
      }
      const fetched = (await Promise.all(proposalPromises)).filter(Boolean) as Proposal[];
      setProposals(fetched.reverse());
    } catch (err) {
      console.error('Failed to fetch governance data:', err);
    }
    setLoading(false);
  }, [wallet.address]);

  async function fetchProposal(index: number, realId: string): Promise<Proposal | null> {
    try {
      const [proposalRaw, votesRaw, executedRaw] = await Promise.all([
        fetchMapping(GOV_MAPPINGS.PROPOSALS, realId),
        fetchMapping(GOV_MAPPINGS.PROPOSAL_VOTES, realId),
        fetchMapping(GOV_MAPPINGS.PROPOSAL_EXECUTED, realId),
      ]);

      if (!proposalRaw) return null;

      const getField = (data: string, name: string): string => {
        const match = data.match(new RegExp(`${name}:\\s*([^,}\\n\\r]+)`));
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
        id: realId,
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
    const interval = setInterval(fetchGovernanceData, 30_000);
    return () => clearInterval(interval);
  }, [fetchGovernanceData]);

  // ═══════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════

  const handleClaimTokens = async () => {
    if (!wallet.connected || !wallet.address) {
      toast.error('Connect wallet first');
      return;
    }

    try {
      setClaimPending(true);
      const res = await fetch(`${BACKEND_API}/governance/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: wallet.address }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Claim failed');
        return;
      }

      toast.success(data.message || 'Tokens claimed!');
      setTimeout(fetchGovernanceData, 3000);
    } catch (err: any) {
      toast.error(err?.message || 'Network error — is backend running?');
    } finally {
      setClaimPending(false);
    }
  };

  const handleMintTokens = async () => {
    if (!wallet.requestTransaction || !wallet.connected) {
      toast.error('Connect wallet first');
      return;
    }
    const amount = parseInt(mintAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    const recipient = mintRecipient.trim() || wallet.address;
    if (!recipient) {
      toast.error('Enter a recipient address');
      return;
    }

    try {
      setActiveAction('admin');
      setTxPending(true);
      setTransactionPending(true);
      setTransactionStep('encrypting');
      const tx = {
        program: GOV_PROGRAM_ID,
        function: GOV_TRANSITIONS.MINT_GOVERNANCE_TOKENS,
        inputs: [recipient, `${amount}u64`],
        fee: 500_000,
        privateFee: false,
      };
      setTransactionStep('proving');
      const result = await wallet.requestTransaction(tx);
      if (result?.transactionId) {
        setTransactionId(result.transactionId);
        setTransactionStep('broadcasting');
        toast.success(`Minted ${amount} GOV tokens: ${result.transactionId.slice(0, 16)}...`);
        setMintAmount('');
        setMintRecipient('');
        setTransactionStep('confirmed');
        setTimeout(fetchGovernanceData, 3000);
      }
    } catch (err: any) {
      setTransactionStep('failed');
      toast.error(err?.message || 'Mint failed');
    } finally {
      setTxPending(false);
      setTransactionPending(false);
    }
  };

  const handleCreateProposal = async () => {
    if (!wallet.requestTransaction || !wallet.connected) {
      toast.error('Connect wallet first');
      return;
    }
    if (votingPower < 100) {
      toast.error('Need at least 100 voting power. Claim GOV tokens first.');
      return;
    }
    const value = parseInt(paramValue, 10);
    if (isNaN(value) || value <= 0) {
      toast.error('Enter a valid parameter value');
      return;
    }

    try {
      setActiveAction('propose');
      setTxPending(true);
      setTransactionPending(true);
      setTransactionStep('encrypting');
      const descHash = '0field';
      const tx = {
        program: GOV_PROGRAM_ID,
        function: GOV_TRANSITIONS.CREATE_PROPOSAL,
        inputs: [`${proposalType}u8`, `${paramKey}u8`, `${value}u64`, descHash, `${votingDuration}u32`],
        fee: 500_000,
        privateFee: false,
      };
      setTransactionStep('proving');
      const result = await wallet.requestTransaction(tx);
      if (result?.transactionId) {
        setTransactionId(result.transactionId);
        setTransactionStep('broadcasting');
        toast.success(`Proposal created: ${result.transactionId.slice(0, 16)}...`);
        setParamValue('');
        setActiveTab('overview');
        setTransactionStep('confirmed');
        setTimeout(fetchGovernanceData, 3000);
      }
    } catch (err: any) {
      setTransactionStep('failed');
      toast.error(err?.message || 'Creating proposal failed');
    } finally {
      setTxPending(false);
      setTransactionPending(false);
    }
  };

  const handleVote = async (proposalId: string, support: number) => {
    if (!wallet.requestTransaction || !wallet.connected) {
      toast.error('Connect wallet first');
      return;
    }
    if (votingPower <= 0) {
      toast.error('No voting power. Claim GOV tokens first.');
      return;
    }

    const amount = Math.min(votingPower, 100);

    try {
      setActiveAction('overview');
      setTxPending(true);
      setTransactionPending(true);
      setTransactionStep('encrypting');

      // Step 1: Private vote — NO finalize, shows as PRIVATE in wallet
      const tx = {
        program: GOV_PROGRAM_ID,
        function: GOV_TRANSITIONS.VOTE,
        inputs: [proposalId, `${support}u8`, `${amount}u64`],
        fee: 500_000,
        privateFee: false,
      };
      setTransactionStep('proving');
      const result = await wallet.requestTransaction(tx);
      if (!result?.transactionId) {
        toast('Vote transaction sent — check wallet activity for confirmation');
        return;
      }

      setTransactionId(result.transactionId);
      setTransactionStep('broadcasting');
      const supportLabel = support === 1 ? 'For' : support === 0 ? 'Against' : 'Abstain';
      toast.success(`Private vote ${supportLabel} submitted! TX: ${result.transactionId.slice(0, 16)}...`);
      setTransactionStep('confirmed');

      // Step 2: Send tally request to backend (admin tallies on-chain without revealing voter)
      try {
        const tallyRes = await fetch(`${BACKEND_API}/governance/tally`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposal_id: proposalId, support, amount }),
        });
        if (tallyRes.ok) {
          toast.success('Vote tally submitted — on-chain count will update in ~30s');
        } else {
          const err = await tallyRes.json().catch(() => ({ error: 'Unknown' }));
          console.error('[gov] Tally error:', err);
          toast.error(`Tally failed: ${err.error || tallyRes.status}. Vote is still private — admin will sync later.`);
        }
      } catch (e) {
        console.error('[gov] Tally network error:', e);
        toast('Private vote recorded! Backend may be offline — tally will sync when backend is up.');
      }

      setTimeout(fetchGovernanceData, 3000);
    } catch (err: any) {
      setTransactionStep('failed');
      toast.error(err?.message || 'Voting failed');
    } finally {
      setTxPending(false);
      setTransactionPending(false);
    }
  };

  const handleExecute = async (proposalId: string) => {
    if (!wallet.requestTransaction) {
      toast.error('Connect wallet first');
      return;
    }
    try {
      setActiveAction('overview');
      setTxPending(true);
      setTransactionPending(true);
      setTransactionStep('encrypting');
      const tx = {
        program: GOV_PROGRAM_ID,
        function: GOV_TRANSITIONS.EXECUTE_PROPOSAL,
        inputs: [proposalId],
        fee: 500_000,
        privateFee: false,
      };
      setTransactionStep('proving');
      const result = await wallet.requestTransaction(tx);
      if (result?.transactionId) {
        setTransactionId(result.transactionId);
        setTransactionStep('broadcasting');
        toast.success(`Proposal executed: ${result.transactionId.slice(0, 16)}...`);
        setTransactionStep('confirmed');
        setTimeout(fetchGovernanceData, 3000);
      }
    } catch (err: any) {
      setTransactionStep('failed');
      toast.error(err?.message || 'Execution failed');
    } finally {
      setTxPending(false);
      setTransactionPending(false);
    }
  };

  const handleDelegate = async () => {
    if (!wallet.requestTransaction || !wallet.connected) {
      toast.error('Connect wallet first');
      return;
    }
    const amount = parseInt(delegateAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!delegateTo.trim().startsWith('aleo1')) {
      toast.error('Enter a valid Aleo address');
      return;
    }
    if (amount > votingPower) {
      toast.error(`Insufficient voting power (have ${votingPower})`);
      return;
    }
    try {
      setActiveAction('delegate');
      setTxPending(true);
      setTransactionPending(true);
      setTransactionStep('encrypting');
      const tx = {
        program: GOV_PROGRAM_ID,
        function: GOV_TRANSITIONS.DELEGATE_VOTES,
        inputs: [delegateTo.trim(), `${amount}u64`],
        fee: 500_000,
        privateFee: false,
      };
      setTransactionStep('proving');
      const result = await wallet.requestTransaction(tx);
      if (result?.transactionId) {
        setTransactionId(result.transactionId);
        setTransactionStep('broadcasting');
        toast.success(`Delegated ${amount} votes: ${result.transactionId.slice(0, 16)}...`);
        setDelegateTo('');
        setDelegateAmount('');
        setActiveTab('overview');
        setTransactionStep('confirmed');
        setTimeout(fetchGovernanceData, 3000);
      }
    } catch (err: any) {
      setTransactionStep('failed');
      toast.error(err?.message || 'Delegation failed');
    } finally {
      setTxPending(false);
      setTransactionPending(false);
    }
  };

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={fetchGovernanceData}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-white transition-colors font-medium uppercase tracking-wider"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-xl p-4 border border-white/10"
        >
          <p className="text-xs text-gray-400 uppercase tracking-wider">Your Voting Power</p>
          <p className="text-2xl font-bold text-white mt-1">
            {votingPower.toLocaleString()}
            {votingPower === 0 && wallet.connected && (
              <span className="text-xs text-yellow-400 ml-2 font-normal">Claim below</span>
            )}
          </p>
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white/5 rounded-xl p-4 border border-white/10"
        >
          <p className="text-xs text-gray-400 uppercase tracking-wider">Quorum</p>
          <p className="text-2xl font-bold text-white mt-1">
            {tokenSupply > 0 ? `${Math.ceil(tokenSupply * 0.2).toLocaleString()} votes` : '\u2014'}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">20% of supply required</p>
        </motion.div>
      </div>

      {/* Claim GOV Tokens — visible to ALL connected users */}
      {wallet.connected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 rounded-xl p-5 border border-purple-500/20"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-2xl">{'\uD83D\uDDF3\uFE0F'}</span> Get Governance Tokens
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Claim <span className="text-purple-300 font-medium">1,000 GOV</span> tokens to participate in governance.
                Tokens give you voting power to create proposals and vote on protocol changes.
              </p>
              {votingPower > 0 && (
                <p className="text-xs text-green-400 mt-1">
                  You have {votingPower.toLocaleString()} voting power &mdash; you can create proposals and vote!
                </p>
              )}
            </div>
            <button
              onClick={handleClaimTokens}
              disabled={claimPending || !wallet.connected}
              className="shrink-0 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-all shadow-lg shadow-purple-900/30"
            >
              {claimPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Claiming...
                </span>
              ) : votingPower > 0 ? 'Claim More GOV' : 'Claim 1,000 GOV'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Admin Panel */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-yellow-500/5 rounded-xl p-5 border border-yellow-500/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded font-medium">Admin</span>
            <h3 className="text-sm font-semibold text-white">Direct Mint (via wallet)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={mintRecipient}
              onChange={e => setMintRecipient(e.target.value)}
              placeholder={`${wallet.address?.slice(0, 12)}... (self)`}
              className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono"
            />
            <input
              type="number"
              value={mintAmount}
              onChange={e => setMintAmount(e.target.value)}
              placeholder="Amount (e.g. 10000)"
              className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
            <button
              onClick={handleMintTokens}
              disabled={txPending || !wallet.connected}
              className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {txPending ? 'Minting...' : 'Mint Tokens'}
            </button>
          </div>
          {transactionPending && activeAction === 'admin' && (
            <div className="mt-4">
              <TransactionFlow currentStep={transactionStep} txId={transactionId} />
            </div>
          )}
          {transactionStep === 'confirmed' && activeAction === 'admin' && (
            <div className="flex justify-center mt-3">
              <button
                onClick={() => { resetTransaction(); setActiveAction(null); }}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
        {(['overview', 'propose', 'delegate'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab === 'overview' ? 'Proposals' : tab === 'propose' ? 'New Proposal' : 'Delegate'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ═══════════════════ PROPOSALS TAB ═══════════════════ */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Active Proposals {loading && <span className="text-xs text-gray-500 ml-2">Loading...</span>}
              </h3>
              <button
                onClick={fetchGovernanceData}
                disabled={loading}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Refresh
              </button>
            </div>

            {proposals.length === 0 ? (
              <div className="bg-white/5 rounded-xl p-10 border border-white/10 text-center">
                <p className="text-gray-400 mb-2">No proposals yet</p>
                <p className="text-xs text-gray-500">
                  {votingPower >= 100
                    ? 'You have enough voting power \u2014 create the first proposal!'
                    : 'Claim GOV tokens above, then create a proposal.'}
                </p>
                {votingPower >= 100 && (
                  <button
                    onClick={() => setActiveTab('propose')}
                    className="mt-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                  >
                    Create First Proposal
                  </button>
                )}
              </div>
            ) : (
              proposals.map(p => {
                const totalVotes = p.votesFor + p.votesAgainst + p.votesAbstain;
                const forPct = totalVotes > 0 ? (p.votesFor / totalVotes) * 100 : 0;
                const againstPct = totalVotes > 0 ? (p.votesAgainst / totalVotes) * 100 : 0;
                const quorumNeeded = Math.ceil(tokenSupply * 0.2);
                const quorumPct = tokenSupply > 0 ? Math.min(100, (totalVotes / quorumNeeded) * 100) : 0;

                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 rounded-xl p-5 border border-white/10"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-medium">
                          {PROPOSAL_TYPES[p.type] || `Type ${p.type}`}
                        </span>
                        {p.executed && (
                          <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">Executed</span>
                        )}
                        {!p.executed && currentBlock > 0 && currentBlock < p.endBlock && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">
                            {formatTimeRemaining(p.endBlock, currentBlock)}
                          </span>
                        )}
                        {!p.executed && currentBlock > 0 && currentBlock >= p.endBlock && currentBlock < p.timelockEnd && (
                          <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded">
                            Timelock — {formatTimeRemaining(p.timelockEnd, currentBlock)}
                          </span>
                        )}
                        {!p.executed && currentBlock > 0 && currentBlock >= p.timelockEnd && (
                          <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">Ready to Execute</span>
                        )}
                      </div>
                      <div className="text-right">
                        {currentBlock > 0 ? (
                          <div>
                            <span className="text-xs text-gray-400">
                              {currentBlock < p.endBlock ? 'Voting ends ' : 'Ended '}{formatDate(blocksToDate(p.endBlock, currentBlock))}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">Blocks {p.startBlock} &mdash; {p.endBlock}</span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-200 mb-4 font-medium">{formatProposalDescription(p)}</p>

                    {/* Vote Progress */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span className="text-green-400">For: {p.votesFor.toLocaleString()}</span>
                        <span className="text-red-400">Against: {p.votesAgainst.toLocaleString()}</span>
                        <span className="text-gray-400">Abstain: {p.votesAbstain.toLocaleString()}</span>
                      </div>
                      <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${forPct}%` }}
                        />
                        <div
                          className="h-full bg-red-500 transition-all"
                          style={{ width: `${againstPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>Total: {totalVotes.toLocaleString()} votes</span>
                        <span>Quorum: {quorumPct.toFixed(0)}% ({totalVotes}/{quorumNeeded})</span>
                      </div>
                    </div>

                    {/* Actions */}
                    {!p.executed && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleVote(p.id, 1)}
                          disabled={txPending || !wallet.connected || votingPower <= 0}
                          className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-xs font-medium transition-colors flex items-center gap-1.5"
                        >
                          {txPending ? <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : null}
                          Vote For
                        </button>
                        <button
                          onClick={() => handleVote(p.id, 0)}
                          disabled={txPending || !wallet.connected || votingPower <= 0}
                          className="bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-xs font-medium transition-colors flex items-center gap-1.5"
                        >
                          {txPending ? <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : null}
                          Vote Against
                        </button>
                        <button
                          onClick={() => handleVote(p.id, 2)}
                          disabled={txPending || !wallet.connected || votingPower <= 0}
                          className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-xs font-medium transition-colors flex items-center gap-1.5"
                        >
                          {txPending ? <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : null}
                          Abstain
                        </button>
                        <button
                          onClick={() => handleExecute(p.id)}
                          disabled={txPending || !wallet.connected}
                          className="ml-auto bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-xs font-medium transition-colors flex items-center gap-1.5"
                        >
                          {txPending ? <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : null}
                          Execute
                        </button>
                      </div>
                    )}

                    {votingPower <= 0 && !p.executed && wallet.connected && (
                      <p className="text-[10px] text-yellow-400 mt-2">Claim GOV tokens above to vote on this proposal</p>
                    )}
                  </motion.div>
                );
              })
            )}
            {transactionPending && activeAction === 'overview' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 rounded-xl p-5 border border-white/10"
              >
                <TransactionFlow currentStep={transactionStep} txId={transactionId} />
              </motion.div>
            )}
            {transactionStep === 'confirmed' && activeAction === 'overview' && (
              <div className="flex justify-center">
                <button
                  onClick={() => { resetTransaction(); setActiveAction(null); }}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════ NEW PROPOSAL TAB ═══════════════════ */}
        {activeTab === 'propose' && (
          <motion.div
            key="propose"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white/5 rounded-xl p-6 border border-white/10"
          >
            <h3 className="text-lg font-semibold text-white mb-1">Create New Proposal</h3>
            <p className="text-xs text-gray-400 mb-5">
              Propose changes to protocol parameters. Requires &gt;100 voting power. Choose a voting duration,
              then after voting ends a timelock period follows before execution.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-medium">Proposal Type</label>
                <select
                  value={proposalType}
                  onChange={e => { setProposalType(parseInt(e.target.value, 10)); setParamKey(0); }}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-purple-500/50 focus:outline-none transition-colors"
                >
                  {PROPOSAL_TYPES.map((t, i) => (
                    <option key={i} value={i}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-medium">
                  {proposalType === 0 ? 'Rate Parameter' : proposalType === 1 ? 'LTV Parameter' : proposalType === 2 ? 'Liquidation Parameter' : 'Parameter Key'}
                </label>
                <select
                  value={paramKey}
                  onChange={e => setParamKey(parseInt(e.target.value, 10))}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-purple-500/50 focus:outline-none transition-colors"
                >
                  {getParamLabels(proposalType).map((l, i) => <option key={i} value={i}>{l}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-400 block mb-1.5 font-medium">
                  New Value {proposalType <= 2 ? '(BPS \u2014 e.g. 400 = 4%)' : ''}
                </label>
                <input
                  type="number"
                  value={paramValue}
                  onChange={e => setParamValue(e.target.value)}
                  placeholder={proposalType === 0 ? 'e.g. 400 for 4%' : proposalType === 3 ? '1 = pause, 0 = resume' : 'Enter value in BPS'}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-purple-500/50 focus:outline-none transition-colors"
                />
                {paramValue && proposalType <= 2 && (
                  <p className="text-xs text-gray-500 mt-1">
                    = {(parseInt(paramValue) / 100).toFixed(2)}%
                  </p>
                )}
              </div>
            </div>

            {/* Voting Duration Selector */}
            <div className="mb-4">
              <label className="text-xs text-gray-400 block mb-2 font-medium">Voting Duration</label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map(opt => (
                  <button
                    key={opt.blocks}
                    type="button"
                    onClick={() => setVotingDuration(opt.blocks)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                      votingDuration === opt.blocks
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Voting: {DURATION_OPTIONS.find(o => o.blocks === votingDuration)?.label ?? `${votingDuration} blocks`}
                {' · '}Timelock: {Math.max(1, Math.round(votingDuration / 4 / 8640))}d after voting ends
                {' · '}Quorum: 20% of token supply
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {votingPower >= 100 ? (
                  <span className="text-green-400">You have {votingPower.toLocaleString()} voting power</span>
                ) : (
                  <span className="text-yellow-400">Need 100+ voting power (have {votingPower}). Claim tokens first.</span>
                )}
              </div>
              <button
                onClick={handleCreateProposal}
                disabled={txPending || !wallet.connected || votingPower < 100 || !paramValue}
                className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-all"
              >
                {txPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Submitting...
                  </span>
                ) : 'Submit Proposal'}
              </button>
            </div>
            {transactionPending && activeAction === 'propose' && (
              <div className="mt-4">
                <TransactionFlow currentStep={transactionStep} txId={transactionId} />
              </div>
            )}
            {transactionStep === 'confirmed' && activeAction === 'propose' && (
              <div className="flex justify-center mt-3">
                <button
                  onClick={() => { resetTransaction(); setActiveAction(null); }}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════ DELEGATE TAB ═══════════════════ */}
        {activeTab === 'delegate' && (
          <motion.div
            key="delegate"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white/5 rounded-xl p-6 border border-white/10"
          >
            <h3 className="text-lg font-semibold text-white mb-1">Delegate Voting Power</h3>
            <p className="text-xs text-gray-400 mb-5">
              Transfer your voting power to another address. The delegate can then vote on proposals using your power.
              You receive a delegation receipt to reclaim your votes later.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-medium">Delegate To</label>
                <input
                  type="text"
                  value={delegateTo}
                  onChange={e => setDelegateTo(e.target.value)}
                  placeholder="aleo1..."
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-purple-500/50 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-medium">Amount</label>
                <input
                  type="number"
                  value={delegateAmount}
                  onChange={e => setDelegateAmount(e.target.value)}
                  placeholder={votingPower > 0 ? `Max: ${votingPower}` : '0'}
                  max={votingPower}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-purple-500/50 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {votingPower > 0 ? (
                  <span className="text-green-400">Available: {votingPower.toLocaleString()} votes</span>
                ) : (
                  <span className="text-yellow-400">No voting power to delegate. Claim tokens first.</span>
                )}
              </div>
              <button
                onClick={handleDelegate}
                disabled={txPending || !wallet.connected || votingPower <= 0 || !delegateTo || !delegateAmount}
                className="bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-all"
              >
                {txPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Delegating...
                  </span>
                ) : 'Delegate Votes'}
              </button>
            </div>
            {transactionPending && activeAction === 'delegate' && (
              <div className="mt-4">
                <TransactionFlow currentStep={transactionStep} txId={transactionId} />
              </div>
            )}
            {transactionStep === 'confirmed' && activeAction === 'delegate' && (
              <div className="flex justify-center mt-3">
                <button
                  onClick={() => { resetTransaction(); setActiveAction(null); }}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white/[0.02] rounded-xl p-5 border border-white/5"
      >
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">How Governance Works</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { step: '1', title: 'Claim Tokens', desc: 'Get GOV tokens to participate. Each claim gives 1,000 voting power.' },
            { step: '2', title: 'Create Proposal', desc: 'Need 100+ voting power. Choose a voting duration (1 day to 1 month) and propose parameter changes.' },
            { step: '3', title: 'Vote Privately', desc: 'Cast ZK-private votes. Nobody sees who voted \u2014 only aggregated totals appear on-chain.' },
            { step: '4', title: 'Execute', desc: 'After voting ends + timelock, anyone can execute a passing proposal with 20% quorum and majority.' },
          ].map(item => (
            <div key={item.step} className="flex gap-3">
              <div className="shrink-0 w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-300">
                {item.step}
              </div>
              <div>
                <p className="text-sm text-white font-medium">{item.title}</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
