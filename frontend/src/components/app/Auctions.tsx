import { useState, useEffect, useCallback } from 'react';
import { useTransaction } from '@/hooks/useTransaction';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import {
  AUCTION_PROGRAM_ID, AUCTION_ID_TABLE,
  BACKEND_API, PRECISION, ADMIN_ADDRESS,
} from '@/utils/constants';
import { SpotlightCard } from '@/components/shared/SpotlightCard';
import { FadeInView } from '@/components/shared/FadeInView';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { TransactionFlow } from '@/components/shared/TransactionFlow';
import { useAppStore } from '@/stores/appStore';
import toast from 'react-hot-toast';

interface AuctionsProps {
  wallet: {
    requestRecords?: (program: string, all?: boolean) => Promise<unknown[]>;
    requestTransaction?: (tx: unknown) => Promise<{ transactionId: string } | undefined>;
    transactionStatus?: (txId: string) => Promise<{ status: string }>;
    decrypt?: (cipherText: string) => Promise<string>;
    connected: boolean;
    address?: string | null;
  };
}

interface AuctionStats {
  activeAuctions: number;
  totalAuctions: string;
  totalBidVolume: string;
  paused: boolean;
}

interface LiveAuction {
  index: number;
  auctionIdHash: string;
  collateral: number;
  minBid: number;
  startBlock: number;
  bidEndBlock: number;
  revealEndBlock: number;
  phase: 'bidding' | 'reveal' | 'awaiting_settlement' | 'settled' | 'cancelled';
  highestBid: number;
  bidCount: number;
  currentBlock: number;
}

const SECS_PER_BLOCK = 10;

const BID_DURATION_OPTIONS = [
  { label: '15 min',  blocks: 90 },
  { label: '30 min',  blocks: 180 },
  { label: '1 hour',  blocks: 360 },
  { label: '3 hours', blocks: 1080 },
  { label: '6 hours', blocks: 2160 },
  { label: '12 hours', blocks: 4320 },
  { label: '1 day',   blocks: 8640 },
] as const;

const REVEAL_DURATION_OPTIONS = [
  { label: '5 min',   blocks: 30 },
  { label: '10 min',  blocks: 60 },
  { label: '30 min',  blocks: 180 },
  { label: '1 hour',  blocks: 360 },
  { label: '3 hours', blocks: 1080 },
  { label: '6 hours', blocks: 2160 },
] as const;

function blocksToTimeStr(blocks: number): string {
  const secs = blocks * SECS_PER_BLOCK;
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.round(secs / 60)}m`;
  if (secs < 86400) return `${(secs / 3600).toFixed(1)}h`;
  return `${(secs / 86400).toFixed(1)}d`;
}

function phaseBadge(phase: string): string {
  switch (phase) {
    case 'bidding': return 'bg-accent-success/10 border-accent-success/30 text-accent-success';
    case 'reveal': return 'bg-accent-warning/10 border-accent-warning/30 text-accent-warning';
    case 'awaiting_settlement': return 'bg-primary/10 border-primary/30 text-primary';
    case 'settled': return 'bg-white/[0.03] border-white/[0.06] text-text-muted';
    case 'cancelled': return 'bg-red-500/10 border-red-500/30 text-red-400';
    default: return 'bg-white/[0.03] border-white/[0.06] text-text-muted';
  }
}

function phaseColor(phase: string): string {
  switch (phase) {
    case 'bidding': return 'text-accent-success';
    case 'reveal': return 'text-accent-warning';
    case 'awaiting_settlement': return 'text-primary';
    default: return 'text-text-muted';
  }
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case 'bidding': return 'Accepting Bids';
    case 'reveal': return 'Reveal Phase';
    case 'awaiting_settlement': return 'Awaiting Settlement';
    case 'settled': return 'Settled';
    case 'cancelled': return 'Cancelled';
    default: return phase;
  }
}

export function Auctions({ wallet }: AuctionsProps) {
  const {
    startAuction, submitSealedBid, revealBid, claimAuctionCollateral,
    redeemAuctionCollateral, refundBid, settleAuction, cancelAuction, resetTransaction,
  } = useTransaction(wallet as any);
  const { usdcxRecords, creditsRecords, refetch: refetchRecords } = useWalletRecords(wallet);
  const { transactionStep, transactionId, transactionPending } = useAppStore();

  const [stats, setStats] = useState<AuctionStats | null>(null);
  const [liveAuctions, setLiveAuctions] = useState<LiveAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);

  const [activeAction, setActiveAction] = useState<'admin' | 'bid' | 'reveal' | 'claim' | 'redeem' | 'refund' | null>(null);
  const [tab, setTab] = useState<'bid' | 'reveal' | 'claim' | 'redeem' | 'refund'>('bid');
  const [selectedAuction, setSelectedAuction] = useState<LiveAuction | null>(null);
  const [auctionId, setAuctionId] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [secret, setSecret] = useState('');
  const [auctionRecords, setAuctionRecords] = useState<any[]>([]);

  const isAdmin = wallet.address === ADMIN_ADDRESS;
  const [adminCollateral, setAdminCollateral] = useState('');
  const [adminMinBid, setAdminMinBid] = useState('');
  const [adminBidBlocks, setAdminBidBlocks] = useState('180');
  const [adminRevealBlocks, setAdminRevealBlocks] = useState('60');

  // Parse USDCx records for bidding — sorted largest first
  const parsedUsdcx = (usdcxRecords || []).filter((r: any) => !r.spent).map((r: any) => {
    const pt = (r.recordPlaintext ?? r.plaintext ?? r.data ?? '') as string;
    const str = typeof pt === 'string' ? pt : JSON.stringify(pt);
    const match = str.match(/amount\s*:\s*(\d+)u128/);
    return match ? { amount: parseInt(match[1], 10), plaintext: str } : null;
  }).filter(Boolean).sort((a, b) => b!.amount - a!.amount) as { amount: number; plaintext: string }[];

  // Parse credits records for admin start auction
  const parsedCredits = (creditsRecords || []).filter((r: any) => !r.spent).map((r: any) => {
    const pt = (r.recordPlaintext ?? r.plaintext ?? r.data ?? '') as string;
    const str = typeof pt === 'string' ? pt : JSON.stringify(pt);
    const match = str.match(/microcredits\s*:\s*(\d+)u64/);
    return match ? { amount: parseInt(match[1], 10), plaintext: str } : null;
  }).filter(Boolean) as { amount: number; plaintext: string }[];

  const refetchAuctionRecords = useCallback(() => {
    if (!wallet.connected || !wallet.requestRecords) return;
    wallet.requestRecords(AUCTION_PROGRAM_ID, true)
      .then((recs: any[]) => setAuctionRecords(recs.filter((r: any) => !r.spent)))
      .catch(() => setAuctionRecords([]));
  }, [wallet.connected, wallet.requestRecords]);

  useEffect(() => {
    refetchAuctionRecords();
  }, [refetchAuctionRecords]);

  // Helper: find auction record by type, filtered by auction_id hash
  const getRecordByType = useCallback((type: 'sealed' | 'revealed' | 'win' | 'refund', auctionIdHash?: string) => {
    return auctionRecords.find((r: any) => {
      const pt = (r.recordPlaintext ?? r.plaintext ?? '') as string;
      if (auctionIdHash && !pt.includes(auctionIdHash)) return false;
      switch (type) {
        case 'sealed': return pt.includes('commitment') && pt.includes('deposit') && !pt.includes('bid_amount');
        case 'revealed': return pt.includes('bid_amount') && pt.includes('nonce_hash');
        case 'win': return pt.includes('collateral_amount') && pt.includes('winning_bid');
        case 'refund': return pt.includes('refund_amount');
      }
    });
  }, [auctionRecords]);

  const fetchStats = useCallback(async () => {
    try {
      const [activeRes, statsRes] = await Promise.all([
        fetch(`${BACKEND_API}/auction/active`).then(r => r.json()).catch(() => null),
        fetch(`${BACKEND_API}/auction/stats`).then(r => r.json()).catch(() => null),
      ]);
      setStats({
        activeAuctions: activeRes?.auctionCount ?? 0,
        totalAuctions: statsRes?.totalAuctions ?? '0',
        totalBidVolume: statsRes?.totalBidVolume ?? '0',
        paused: activeRes?.paused ?? false,
      });
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuctions = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_API}/auction/list`);
      if (!res.ok) return;
      const data = await res.json();
      setLiveAuctions(data.auctions ?? []);
    } catch { /* silent */ } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchAuctions();
    const interval = setInterval(() => { fetchStats(); fetchAuctions(); }, 15000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchAuctions]);

  const refreshAll = useCallback(() => {
    setTimeout(() => { fetchStats(); fetchAuctions(); refetchRecords(); refetchAuctionRecords(); }, 3000);
    setTimeout(() => { fetchAuctions(); refetchAuctionRecords(); }, 8000);
  }, [fetchStats, fetchAuctions, refetchRecords, refetchAuctionRecords]);

  const handleStartAuction = async () => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }
    if (!isAdmin) { toast.error('Only admin can start auctions'); return; }
    const collateral = parseFloat(adminCollateral);
    const minBid = parseFloat(adminMinBid);
    const bidBlocks = parseInt(adminBidBlocks, 10);
    const revealBlocks = parseInt(adminRevealBlocks, 10);
    if (!collateral || collateral <= 0) { toast.error('Enter valid collateral amount'); return; }
    if (!minBid || minBid <= 0) { toast.error('Enter valid minimum bid'); return; }
    if (!bidBlocks || bidBlocks <= 0) { toast.error('Select a bid window duration'); return; }
    if (!revealBlocks || revealBlocks <= 0) { toast.error('Select a reveal window duration'); return; }

    const microCollateral = Math.floor(collateral * PRECISION);
    const microMinBid = Math.floor(minBid * PRECISION);
    const record = parsedCredits.find(r => r.amount >= microCollateral);
    if (!record) {
      toast.error(`No ALEO record with enough balance. Need ${collateral} ALEO.`);
      return;
    }
    setActiveAction('admin');
    try {
      await startAuction(record.plaintext, microCollateral, microMinBid, bidBlocks, revealBlocks);
      toast.success('Auction created on-chain!');
      setAdminCollateral('');
      setAdminMinBid('');
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start auction');
    }
  };

  const handleSettleAuction = async (index: number) => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }
    if (!isAdmin) { toast.error('Only admin can settle auctions'); return; }
    const idHash = AUCTION_ID_TABLE[index];
    if (!idHash) { toast.error('Invalid auction index'); return; }
    setActiveAction('admin');
    try {
      // Use backend DPS endpoint (admin key is on backend)
      const res = await fetch(`${BACKEND_API}/auction/settle/${index}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Auction #${index} settlement submitted! TX: ${data.txId?.slice(0, 20)}... (~30s to confirm)`);
      } else {
        toast.error(data.error || 'Settlement failed');
      }
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Settlement failed');
    } finally {
      setActiveAction(null);
    }
  };

  const handleCancelAuction = async (index: number) => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }
    if (!isAdmin) { toast.error('Only admin can cancel auctions'); return; }
    const idHash = AUCTION_ID_TABLE[index];
    if (!idHash) { toast.error('Invalid auction index'); return; }
    setActiveAction('admin');
    try {
      const res = await fetch(`${BACKEND_API}/auction/cancel/${index}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Auction #${index} cancellation submitted! TX: ${data.txId?.slice(0, 20)}... (~30s to confirm)`);
      } else {
        toast.error(data.error || 'Cancellation failed');
      }
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancellation failed');
    } finally {
      setActiveAction(null);
    }
  };

  const handleSubmitBid = async () => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }
    const parsedAmount = parseFloat(bidAmount);
    const parsedIndex = parseInt(auctionId, 10);
    if (!parsedAmount || parsedAmount <= 0) { toast.error('Enter a valid bid amount in USDCx'); return; }
    if (isNaN(parsedIndex) || parsedIndex < 0 || parsedIndex > 9) { toast.error('Enter a valid auction ID (0-9)'); return; }
    if (!secret) { toast.error('Enter a secret number — you will need it to reveal later'); return; }

    const auctionIdField = AUCTION_ID_TABLE[parsedIndex];
    if (!auctionIdField) { toast.error('Invalid auction ID'); return; }

    const microAmount = Math.floor(parsedAmount * PRECISION);
    const record = parsedUsdcx.find(r => r.amount >= microAmount);
    if (!record) {
      const largest = parsedUsdcx.length > 0 ? (parsedUsdcx[0].amount / PRECISION).toFixed(2) : '0';
      toast.error(`No single USDCx record has ${parsedAmount} USDCx. Your largest record: ${largest} USDCx. Bid up to that amount.`);
      return;
    }

    // Compute BHP256 commitment via backend (WASM SDK doesn't match AVM hashing)
    // commitment = BHP256(BHP256(actual_bid) + secret) — verified by reveal_bid on-chain
    setActiveAction('bid');
    let commitmentField: string;
    try {
      toast('Computing commitment hash...', { icon: '⏳', duration: 3000 });
      const commitRes = await fetch(`${BACKEND_API}/auction/commitment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bid: microAmount, secret }),
      });
      const commitData = await commitRes.json();
      if (!commitRes.ok || !commitData.commitment) {
        toast.error(commitData.error || 'Failed to compute commitment. Try again.');
        setActiveAction(null);
        return;
      }
      commitmentField = commitData.commitment;
    } catch (err) {
      toast.error('Backend unreachable — cannot compute commitment hash.');
      setActiveAction(null);
      return;
    }

    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    const nonce = Array.from(randomBytes).reduce((acc, b) => acc * 256 + b, 0);

    try {
      await submitSealedBid(record.plaintext, auctionIdField, commitmentField, microAmount, nonce);
      toast.success('Sealed bid submitted! Remember your secret for the reveal phase.');
      setBidAmount('');
      setSecret('');
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bid submission failed');
    }
  };

  const handleRevealBid = async () => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }
    if (!secret) { toast.error('Enter the same secret you used when bidding'); return; }
    const parsedAmount = parseFloat(bidAmount);
    if (!parsedAmount) { toast.error('Enter your original bid amount'); return; }

    const idHash = selectedAuction ? AUCTION_ID_TABLE[selectedAuction.index] : undefined;
    const sealedBidRecord = getRecordByType('sealed', idHash);
    if (!sealedBidRecord) {
      toast.error(selectedAuction
        ? `No SealedBid record for Auction #${selectedAuction.index}. Did you bid on this auction?`
        : 'No SealedBid record found. Select an auction and place a bid first.');
      return;
    }
    if (selectedAuction?.phase === 'bidding') {
      toast.error('Cannot reveal during bidding phase. Wait for the reveal window to open.');
      return;
    }
    if (selectedAuction?.phase === 'settled' || selectedAuction?.phase === 'cancelled') {
      toast.error('This auction is already settled/cancelled. You cannot reveal after settlement — your deposit is forfeited.');
      return;
    }
    const sealedPlaintext = (sealedBidRecord.recordPlaintext ?? sealedBidRecord.plaintext ?? '') as string;
    const microAmount = Math.floor(parsedAmount * PRECISION);

    setActiveAction('reveal');
    try {
      await revealBid(sealedPlaintext, microAmount, secret);
      toast.success('Bid revealed! If yours is the highest, you win the collateral.');
      setBidAmount('');
      setSecret('');
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reveal failed');
    }
  };

  const handleClaimCollateral = async () => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }
    const idHash = selectedAuction ? AUCTION_ID_TABLE[selectedAuction.index] : undefined;
    const revealedRecord = getRecordByType('revealed', idHash);
    if (!revealedRecord) {
      const sealedRecord = getRecordByType('sealed', idHash);
      if (sealedRecord && (selectedAuction?.phase === 'settled' || selectedAuction?.phase === 'cancelled')) {
        toast.error('Your bid was not revealed before settlement. Your USDCx deposit is forfeited — sealed-bid auctions require revealing before the window closes.');
      } else if (sealedRecord) {
        toast.error('You have an unrevealed SealedBid. Go to the Reveal tab first to reveal it before the window closes!');
      } else {
        toast.error(selectedAuction ? `No bid records found for Auction #${selectedAuction.index}.` : 'No RevealedBid record found.');
      }
      return;
    }
    const revealedPlaintext = (revealedRecord.recordPlaintext ?? revealedRecord.plaintext ?? '') as string;

    setActiveAction('claim');
    try {
      await claimAuctionCollateral(revealedPlaintext);
      toast.success('Collateral claimed! You now have an AuctionWin record — go to Redeem tab.');
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Claim failed');
    }
  };

  const handleRedeemCollateral = async () => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }
    const idHash = selectedAuction ? AUCTION_ID_TABLE[selectedAuction.index] : undefined;
    const winRecord = getRecordByType('win', idHash);
    if (!winRecord) {
      const revealedRecord = getRecordByType('revealed', idHash);
      if (revealedRecord) {
        toast.error('You have a RevealedBid but no AuctionWin yet. Go to the Claim tab first.');
      } else {
        toast.error('No AuctionWin record found. You need to Claim first (Claim tab → Claim Collateral).');
      }
      return;
    }
    const winPlaintext = (winRecord.recordPlaintext ?? winRecord.plaintext ?? '') as string;
    const colMatch = winPlaintext.match(/collateral_amount\s*:\s*(\d+)u64/);
    const colAmount = colMatch ? parseInt(colMatch[1], 10) : 0;
    if (!colAmount) { toast.error('Could not parse collateral amount from record'); return; }

    setActiveAction('redeem');
    try {
      await redeemAuctionCollateral(winPlaintext, colAmount);
      toast.success('ALEO collateral redeemed to your wallet!');
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Redeem failed');
    }
  };

  const handleRefundBid = async () => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }
    const idHash = selectedAuction ? AUCTION_ID_TABLE[selectedAuction.index] : undefined;
    const refundRecord = getRecordByType('refund', idHash);
    if (!refundRecord) {
      toast.error(selectedAuction
        ? `No AuctionRefund record for Auction #${selectedAuction.index}. Non-winners get refund records after settlement.`
        : 'No AuctionRefund record found. Non-winners get refund records after settlement.');
      return;
    }
    const refundPlaintext = (refundRecord.recordPlaintext ?? refundRecord.plaintext ?? '') as string;

    setActiveAction('refund');
    try {
      await refundBid(refundPlaintext);
      toast.success('USDCx refund collected!');
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Refund failed');
    }
  };

  const selectAuction = (auction: LiveAuction) => {
    setSelectedAuction(auction);
    setAuctionId(String(auction.index));
    const idHash = AUCTION_ID_TABLE[auction.index];
    const hasSealed = !!getRecordByType('sealed', idHash);
    const hasRevealed = !!getRecordByType('revealed', idHash);
    const hasWin = !!getRecordByType('win', idHash);
    if (auction.phase === 'bidding') setTab('bid');
    else if (auction.phase === 'reveal') setTab(hasSealed ? 'reveal' : 'bid');
    else if (auction.phase === 'settled') {
      if (hasWin) setTab('redeem');
      else if (hasRevealed) setTab('claim');
      else if (hasSealed) setTab('claim'); // show forfeited warning
      else setTab('bid');
    } else if (auction.phase === 'cancelled') setTab('refund');
    else setTab('bid');
  };

  const totalBidVol = (Number(stats?.totalBidVolume) || 0) / PRECISION;
  const activeAuctionsList = liveAuctions.filter(a => a.phase === 'bidding' || a.phase === 'reveal');
  const pastAuctionsList = liveAuctions.filter(a => a.phase !== 'bidding' && a.phase !== 'reveal');
  const tabAction = tab as string;

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeInView>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-2xl text-text-primary tracking-wide">Sealed-Bid Auctions</h1>
            <p className="text-text-muted text-sm mt-1">
              Buy discounted ALEO collateral from liquidations. Your bid is hidden until the reveal phase — no front-running, no MEV.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchStats(); fetchAuctions(); refetchRecords(); refetchAuctionRecords(); }}
              className="text-text-muted hover:text-primary text-xs font-label uppercase tracking-wider transition-colors"
            >
              Refresh
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${stats?.paused ? 'bg-red-500' : 'bg-accent-success'}`} />
              <span className="text-text-muted text-xs font-label uppercase tracking-wider">
                {stats?.paused ? 'Paused' : 'Active'}
              </span>
            </div>
          </div>
        </div>
      </FadeInView>

      {/* Stats */}
      <FadeInView delay={0.1}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Live Auctions</p>
            {loading ? <LoadingSkeleton className="h-6 w-12 mt-1" /> : (
              <p className="text-xl font-headline text-primary mt-1">{activeAuctionsList.length}</p>
            )}
          </SpotlightCard>
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Total Created</p>
            {loading ? <LoadingSkeleton className="h-6 w-12 mt-1" /> : (
              <p className="text-xl font-headline text-text-primary mt-1">{stats?.totalAuctions}</p>
            )}
          </SpotlightCard>
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Total Bid Volume</p>
            {loading ? <LoadingSkeleton className="h-6 w-24 mt-1" /> : (
              <p className="text-xl font-headline text-accent-success mt-1">{totalBidVol.toFixed(2)} USDCx</p>
            )}
          </SpotlightCard>
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Your Records</p>
            <p className="text-xl font-headline text-text-primary mt-1">{auctionRecords.length}</p>
          </SpotlightCard>
        </div>
      </FadeInView>

      {/* Live Auction Cards */}
      <FadeInView delay={0.15}>
        <div>
          <h2 className="font-headline text-lg text-text-primary mb-3">
            {activeAuctionsList.length > 0 ? 'Live Auctions' : 'All Auctions'}
          </h2>
          {listLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <SpotlightCard key={i} className="p-5">
                  <LoadingSkeleton className="h-6 w-32 mb-3" />
                  <LoadingSkeleton className="h-4 w-full mb-2" />
                  <LoadingSkeleton className="h-4 w-2/3" />
                </SpotlightCard>
              ))}
            </div>
          ) : liveAuctions.length === 0 ? (
            <SpotlightCard className="p-6 text-center">
              <p className="text-text-muted text-sm">No auctions found yet. {isAdmin ? 'Start one below.' : 'Check back soon.'}</p>
            </SpotlightCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(activeAuctionsList.length > 0 ? activeAuctionsList : liveAuctions.slice(0, 4)).map((auction) => {
                const isSelected = selectedAuction?.index === auction.index;
                const blocksRemaining = auction.phase === 'bidding'
                  ? auction.bidEndBlock - auction.currentBlock
                  : auction.phase === 'reveal'
                    ? auction.revealEndBlock - auction.currentBlock
                    : 0;
                const timeRemaining = blocksRemaining > 0 ? blocksToTimeStr(blocksRemaining) : '—';
                const collAleo = (auction.collateral / PRECISION).toFixed(4);
                const minBidUsdcx = (auction.minBid / PRECISION).toFixed(2);
                const highBidUsdcx = (auction.highestBid / PRECISION).toFixed(2);

                return (
                  <div
                    key={auction.index}
                    onClick={() => selectAuction(auction)}
                    className={`cursor-pointer transition-all rounded-2xl ${isSelected ? 'ring-1 ring-primary/40' : 'hover:ring-1 hover:ring-white/10'}`}
                  >
                  <SpotlightCard className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-text-primary font-headline text-lg">Auction #{auction.index}</span>
                        {isSelected && <span className="text-primary text-xs">● Selected</span>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${phaseBadge(auction.phase)}`}>
                        {phaseLabel(auction.phase)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-text-muted text-xs block">Collateral</span>
                        <span className="text-text-primary font-medium">{collAleo} ALEO</span>
                      </div>
                      <div>
                        <span className="text-text-muted text-xs block">Min Bid</span>
                        <span className="text-text-primary font-medium">{minBidUsdcx} USDCx</span>
                      </div>
                      <div>
                        <span className="text-text-muted text-xs block">
                          {auction.phase === 'bidding' ? 'Bid Closes In' : auction.phase === 'reveal' ? 'Reveal Closes In' : 'Status'}
                        </span>
                        <span className={`font-medium ${phaseColor(auction.phase)}`}>
                          {(auction.phase === 'bidding' || auction.phase === 'reveal') ? `~${timeRemaining}` : phaseLabel(auction.phase)}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted text-xs block">Bids</span>
                        <span className="text-text-primary font-medium">
                          {auction.bidCount} {auction.highestBid > 0 ? `(high: ${highBidUsdcx})` : ''}
                        </span>
                      </div>
                    </div>
                    {/* Admin: Settle / Cancel buttons for awaiting_settlement */}
                    {isAdmin && auction.phase === 'awaiting_settlement' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                        {auction.bidCount > 0 ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSettleAuction(auction.index); }}
                            disabled={transactionPending}
                            className="flex-1 py-2 rounded-lg text-xs font-label uppercase tracking-wider bg-accent-success/10 text-accent-success border border-accent-success/20 hover:bg-accent-success/20 disabled:opacity-40 transition-all"
                          >
                            {transactionPending && activeAction === 'admin' ? 'Processing...' : 'Settle Auction'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCancelAuction(auction.index); }}
                            disabled={transactionPending}
                            className="flex-1 py-2 rounded-lg text-xs font-label uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 transition-all"
                          >
                            {transactionPending && activeAction === 'admin' ? 'Processing...' : 'Cancel (No Bids)'}
                          </button>
                        )}
                      </div>
                    )}
                  </SpotlightCard>
                  </div>
                );
              })}
            </div>
          )}

          {activeAuctionsList.length > 0 && pastAuctionsList.length > 0 && (
            <details className="mt-4">
              <summary className="text-text-muted text-xs font-label uppercase tracking-wider cursor-pointer hover:text-text-secondary">
                Past Auctions ({pastAuctionsList.length})
              </summary>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                {pastAuctionsList.map((auction) => {
                  const collAleo = (auction.collateral / PRECISION).toFixed(4);
                  const highBidUsdcx = (auction.highestBid / PRECISION).toFixed(2);
                  return (
                    <SpotlightCard key={auction.index} className="p-4 opacity-60">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-text-primary font-headline">Auction #{auction.index}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${phaseBadge(auction.phase)}`}>
                          {phaseLabel(auction.phase)}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-text-muted">
                        <span>{collAleo} ALEO</span>
                        <span>{auction.bidCount} bids</span>
                        {auction.highestBid > 0 && <span>Winner: {highBidUsdcx} USDCx</span>}
                      </div>
                    </SpotlightCard>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      </FadeInView>

      {/* Admin: Start Auction */}
      {isAdmin && (
        <FadeInView delay={0.2}>
          <SpotlightCard className="p-6">
            <h3 className="font-headline text-lg text-text-primary mb-1">Start New Auction</h3>
            <p className="text-text-muted text-xs mb-4">
              Lock ALEO collateral from liquidations into a sealed-bid auction. Bidders compete privately to buy it at a discount.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-text-muted text-xs font-label uppercase tracking-wider block mb-2">
                  ALEO Collateral to Auction
                </label>
                <input
                  type="number"
                  value={adminCollateral}
                  onChange={(e) => setAdminCollateral(e.target.value)}
                  placeholder="Amount in ALEO"
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-primary/30 transition-colors"
                />
                <span className="text-text-muted text-xs mt-1 block">
                  Balance: {parsedCredits.length > 0 ? (parsedCredits.reduce((s, r) => s + r.amount, 0) / PRECISION).toFixed(6) : '0'} ALEO
                </span>
              </div>
              <div>
                <label className="text-text-muted text-xs font-label uppercase tracking-wider block mb-2">
                  Minimum Bid (USDCx)
                </label>
                <input
                  type="number"
                  value={adminMinBid}
                  onChange={(e) => setAdminMinBid(e.target.value)}
                  placeholder="Floor price in USDCx"
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-primary/30 transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-text-muted text-xs font-label uppercase tracking-wider block mb-2">
                  Bid Window — how long users can submit sealed bids
                </label>
                <div className="flex flex-wrap gap-2">
                  {BID_DURATION_OPTIONS.map(opt => (
                    <button
                      key={opt.blocks}
                      type="button"
                      onClick={() => setAdminBidBlocks(String(opt.blocks))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-label transition-all border ${
                        adminBidBlocks === String(opt.blocks)
                          ? 'bg-primary/20 border-primary/50 text-primary'
                          : 'bg-white/[0.03] border-white/[0.06] text-text-muted hover:text-text-secondary hover:border-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-text-muted text-[10px] mt-1.5">≈ {adminBidBlocks} blocks (~{Math.round(parseInt(adminBidBlocks) * SECS_PER_BLOCK / 60)} min at ~10s/block)</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-text-muted text-xs font-label uppercase tracking-wider block mb-2">
                  Reveal Window — how long bidders must reveal after bidding closes
                </label>
                <div className="flex flex-wrap gap-2">
                  {REVEAL_DURATION_OPTIONS.map(opt => (
                    <button
                      key={opt.blocks}
                      type="button"
                      onClick={() => setAdminRevealBlocks(String(opt.blocks))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-label transition-all border ${
                        adminRevealBlocks === String(opt.blocks)
                          ? 'bg-accent-warning/20 border-accent-warning/50 text-accent-warning'
                          : 'bg-white/[0.03] border-white/[0.06] text-text-muted hover:text-text-secondary hover:border-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-text-muted text-[10px] mt-1.5">≈ {adminRevealBlocks} blocks (~{Math.round(parseInt(adminRevealBlocks) * SECS_PER_BLOCK / 60)} min at ~10s/block)</p>
              </div>
            </div>
            <button
              onClick={handleStartAuction}
              disabled={!wallet.connected || !adminCollateral || !adminMinBid || transactionPending}
              className="w-full py-3 rounded-lg font-label text-sm uppercase tracking-wider transition-all bg-accent-warning/10 text-accent-warning border border-accent-warning/20 hover:bg-accent-warning/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {transactionPending && activeAction === 'admin' ? 'Creating Auction...' : 'Start Auction'}
            </button>
            {transactionPending && activeAction === 'admin' && (
              <div className="mt-4">
                <TransactionFlow currentStep={transactionStep} txId={transactionId} />
              </div>
            )}
            {transactionStep === 'confirmed' && activeAction === 'admin' && (
              <button
                onClick={() => { resetTransaction(); setActiveAction(null); }}
                className="w-full mt-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Done
              </button>
            )}
          </SpotlightCard>
        </FadeInView>
      )}

      {/* Action Tabs */}
      <FadeInView delay={0.25}>
        <SpotlightCard className="p-6">
          <div className="flex gap-1 mb-6 flex-wrap">
            {([
              { key: 'bid', label: 'Place Bid' },
              { key: 'reveal', label: 'Reveal' },
              { key: 'claim', label: 'Claim' },
              { key: 'redeem', label: 'Redeem' },
              { key: 'refund', label: 'Refund' },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 min-w-[80px] py-2 rounded-lg font-label text-xs uppercase tracking-wider transition-all ${
                  tab === t.key ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/[0.03] text-text-muted hover:text-text-secondary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {selectedAuction && (
            <div className="bg-white/[0.02] rounded-lg p-3 mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-text-primary font-headline">Auction #{selectedAuction.index}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${phaseBadge(selectedAuction.phase)}`}>
                    {phaseLabel(selectedAuction.phase)}
                  </span>
                </div>
                <button
                  onClick={() => { setSelectedAuction(null); setAuctionId(''); }}
                  className="text-text-muted hover:text-text-primary text-xs transition-colors"
                >
                  Clear
                </button>
              </div>
              {/* Record status for this auction */}
              {(() => {
                const idHash = AUCTION_ID_TABLE[selectedAuction.index];
                const hasSealed = !!getRecordByType('sealed', idHash);
                const hasRevealed = !!getRecordByType('revealed', idHash);
                const hasWin = !!getRecordByType('win', idHash);
                const hasRefund = !!getRecordByType('refund', idHash);
                if (!hasSealed && !hasRevealed && !hasWin && !hasRefund) return null;
                return (
                  <div className="flex flex-wrap gap-2 text-[10px] font-label uppercase tracking-wider">
                    <span className="text-text-muted">Your records:</span>
                    {hasSealed && <span className="text-accent-warning">● SealedBid</span>}
                    {hasRevealed && <span className="text-accent-success">● RevealedBid</span>}
                    {hasWin && <span className="text-primary">● AuctionWin</span>}
                    {hasRefund && <span className="text-text-secondary">● Refund</span>}
                  </div>
                );
              })()}
            </div>
          )}

          <div className="space-y-4">
            {/* Bid Tab */}
            {tab === 'bid' && (
              <>
                <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 mb-2">
                  <p className="text-text-secondary text-xs leading-relaxed">
                    <strong className="text-primary">How it works:</strong> Submit a sealed bid with your USDCx deposit. Your bid amount stays hidden until the reveal phase.
                    Pick a secret number and remember it — you need the same secret + bid amount to reveal.
                    Highest revealed bid wins the ALEO collateral at their bid price.
                  </p>
                </div>
                {!selectedAuction && (
                  <div>
                    <label className="text-text-muted text-xs font-label uppercase tracking-wider block mb-2">
                      Auction ID (select from cards above or enter manually)
                    </label>
                    <input
                      type="number"
                      value={auctionId}
                      onChange={(e) => setAuctionId(e.target.value)}
                      placeholder="0, 1, 2..."
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-primary/30 transition-colors"
                    />
                  </div>
                )}
                <div>
                  <label className="text-text-muted text-xs font-label uppercase tracking-wider block mb-2">
                    Bid Amount (USDCx)
                  </label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="How much USDCx to bid"
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-primary/30 transition-colors"
                  />
                  {parsedUsdcx.length > 0 && (
                    <span className="text-text-muted text-xs mt-1 block">
                      Available: {(parsedUsdcx.reduce((s, r) => s + r.amount, 0) / PRECISION).toFixed(2)} USDCx
                      {parsedUsdcx.length > 1 && (
                        <> ({parsedUsdcx.length} records — max single: {(parsedUsdcx[0].amount / PRECISION).toFixed(2)} USDCx)</>
                      )}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-text-muted text-xs font-label uppercase tracking-wider block mb-2">
                    Secret Number (save this — required to reveal)
                  </label>
                  <input
                    type="text"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Any number, e.g. 42, 1234567..."
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-primary/30 transition-colors"
                  />
                  <p className="text-accent-warning text-xs mt-1">
                    ⚠ Save your secret and bid amount. You cannot reveal without them. If you lose them, your deposit is forfeited.
                  </p>
                </div>
              </>
            )}

            {/* Reveal Tab */}
            {tab === 'reveal' && (
              <>
                {(() => {
                  const idHash = selectedAuction ? AUCTION_ID_TABLE[selectedAuction.index] : undefined;
                  const hasSealed = !!getRecordByType('sealed', idHash);
                  const hasRevealed = !!getRecordByType('revealed', idHash);
                  const isSettled = selectedAuction?.phase === 'settled';
                  const isCancelled = selectedAuction?.phase === 'cancelled';

                  if (hasRevealed) return (
                    <div className="bg-accent-success/5 border border-accent-success/10 rounded-lg p-3 mb-2">
                      <p className="text-text-secondary text-xs leading-relaxed">
                        <strong className="text-accent-success">✓ Already revealed!</strong> Your bid is revealed for this auction.
                        {isSettled ? ' Go to the Claim tab to claim your collateral.' : ' Wait for the auction to be settled.'}
                      </p>
                    </div>
                  );
                  if (hasSealed && (isSettled || isCancelled)) return (
                    <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 mb-2">
                      <p className="text-text-secondary text-xs leading-relaxed">
                        <strong className="text-red-400">⚠ Too late:</strong> This auction is already {isSettled ? 'settled' : 'cancelled'}.
                        You cannot reveal after settlement — your deposit is forfeited.
                      </p>
                    </div>
                  );
                  if (hasSealed && selectedAuction?.phase === 'bidding') return (
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 mb-2">
                      <p className="text-text-secondary text-xs leading-relaxed">
                        <strong className="text-blue-400">⏳ Bidding still open.</strong> You cannot reveal until the bid window closes.
                        Come back after the bidding phase ends to reveal your bid.
                      </p>
                    </div>
                  );
                  if (hasSealed) return (
                    <div className="bg-accent-warning/5 border border-accent-warning/10 rounded-lg p-3 mb-2">
                      <p className="text-text-secondary text-xs leading-relaxed">
                        <strong className="text-accent-warning">SealedBid found!</strong> Enter your original bid amount and secret to reveal.
                        You must reveal before the window closes or your deposit is forfeited.
                      </p>
                    </div>
                  );
                  return (
                    <div className="bg-accent-warning/5 border border-accent-warning/10 rounded-lg p-3 mb-2">
                      <p className="text-text-secondary text-xs leading-relaxed">
                        <strong className="text-accent-warning">Reveal your bid:</strong> Enter the exact bid amount and secret you used when bidding.
                        The contract verifies your commitment. If your bid is the highest, you win.
                        You must reveal before the window closes or your deposit is forfeited.
                      </p>
                    </div>
                  );
                })()}
                <div>
                  <label className="text-text-muted text-xs font-label uppercase tracking-wider block mb-2">
                    Your Original Bid Amount (USDCx)
                  </label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="Same amount you used when bidding"
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-primary/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-text-muted text-xs font-label uppercase tracking-wider block mb-2">
                    Your Secret (from bidding)
                  </label>
                  <input
                    type="text"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="The same secret you saved when bidding"
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-primary/30 transition-colors"
                  />
                </div>
              </>
            )}

            {/* Claim Tab */}
            {tab === 'claim' && (
              <>
                {(() => {
                  const idHash = selectedAuction ? AUCTION_ID_TABLE[selectedAuction.index] : undefined;
                  const hasSealed = !!getRecordByType('sealed', idHash);
                  const hasRevealed = !!getRecordByType('revealed', idHash);
                  const hasWin = !!getRecordByType('win', idHash);
                  const isSettled = selectedAuction?.phase === 'settled';
                  const isCancelled = selectedAuction?.phase === 'cancelled';

                  if (hasWin) return (
                    <div className="bg-accent-success/5 border border-accent-success/10 rounded-lg p-3">
                      <p className="text-text-secondary text-xs leading-relaxed">
                        <strong className="text-accent-success">✓ Already claimed!</strong> You have an AuctionWin record for this auction.
                        Go to the <strong>Redeem</strong> tab to convert it into ALEO credits in your wallet.
                      </p>
                    </div>
                  );
                  if (hasRevealed) return (
                    <div className="bg-accent-success/5 border border-accent-success/10 rounded-lg p-3">
                      <p className="text-text-secondary text-xs leading-relaxed">
                        <strong className="text-accent-success">Ready to claim:</strong> You have a RevealedBid for this auction.
                        {isSettled ? ' The auction is settled — click Claim Collateral. If you\'re the highest bidder, you\'ll get an AuctionWin record.' : ' Wait for the auction to be settled, then claim.'}
                      </p>
                    </div>
                  );
                  if (hasSealed && (isSettled || isCancelled)) return (
                    <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                      <p className="text-text-secondary text-xs leading-relaxed">
                        <strong className="text-red-400">⚠ Deposit forfeited:</strong> You have an unrevealed SealedBid for this auction,
                        but it has already been {isSettled ? 'settled' : 'cancelled'}. You cannot reveal after settlement.
                        In sealed-bid auctions, failing to reveal within the reveal window forfeits your deposit.
                      </p>
                    </div>
                  );
                  if (hasSealed) return (
                    <div className="bg-accent-warning/5 border border-accent-warning/10 rounded-lg p-3">
                      <p className="text-text-secondary text-xs leading-relaxed">
                        <strong className="text-accent-warning">⚠ Reveal first!</strong> You have a SealedBid — go to the <strong>Reveal</strong> tab
                        to reveal your bid before the window closes. You cannot claim without revealing.
                      </p>
                    </div>
                  );
                  return (
                    <div className="bg-accent-success/5 border border-accent-success/10 rounded-lg p-3">
                      <p className="text-text-secondary text-xs leading-relaxed">
                        <strong className="text-accent-success">Winner claim:</strong> After the auction is settled, the highest bidder can claim collateral.
                        This uses your RevealedBid record and gives you an AuctionWin record. Then go to Redeem to receive ALEO.
                      </p>
                      {auctionRecords.length > 0 && (
                        <p className="text-text-muted text-xs mt-2">
                          You have {auctionRecords.length} auction record(s) in your wallet.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </>
            )}

            {/* Redeem Tab */}
            {tab === 'redeem' && (
              <>
                {(() => {
                  const idHash = selectedAuction ? AUCTION_ID_TABLE[selectedAuction.index] : undefined;
                  const hasWin = !!getRecordByType('win', idHash);
                  const hasRevealed = !!getRecordByType('revealed', idHash);
                  if (hasWin) return (
                    <div className="bg-accent-success/5 border border-accent-success/10 rounded-lg p-3">
                      <p className="text-text-secondary text-xs leading-relaxed">
                        <strong className="text-accent-success">✓ Ready to redeem!</strong> Click Redeem ALEO below to convert your AuctionWin record
                        into actual ALEO credits in your wallet. This is the final step.
                      </p>
                    </div>
                  );
                  if (hasRevealed) return (
                    <div className="bg-accent-warning/5 border border-accent-warning/10 rounded-lg p-3">
                      <p className="text-text-secondary text-xs leading-relaxed">
                        <strong className="text-accent-warning">Claim first:</strong> You have a RevealedBid but no AuctionWin yet.
                        Go to the <strong>Claim</strong> tab first to get your AuctionWin record, then come back to Redeem.
                      </p>
                    </div>
                  );
                  return (
                    <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                      <p className="text-text-secondary text-xs leading-relaxed">
                        <strong className="text-primary">Redeem ALEO:</strong> Convert your AuctionWin record into actual ALEO credits.
                        Flow: Place Bid → Reveal → Claim → <strong>Redeem</strong>. This is the final step — ALEO is sent privately to your wallet.
                      </p>
                    </div>
                  );
                })()}
              </>
            )}

            {/* Refund Tab */}
            {tab === 'refund' && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                <p className="text-text-secondary text-xs leading-relaxed">
                  <strong className="text-text-primary">Collect refund:</strong> If you did not win, you get an AuctionRefund record after settlement.
                  Use this to get your USDCx deposit back. Non-winners always get a full refund.
                </p>
              </div>
            )}

            {/* Transaction Flow */}
            {transactionPending && activeAction === tabAction && (
              <div className="mb-2">
                <TransactionFlow currentStep={transactionStep} txId={transactionId} />
              </div>
            )}

            {/* Action Button */}
            {(() => {
              const idHash = selectedAuction ? AUCTION_ID_TABLE[selectedAuction.index] : undefined;
              const hasSealed = !!getRecordByType('sealed', idHash);
              const hasRevealed = !!getRecordByType('revealed', idHash);
              const hasWin = !!getRecordByType('win', idHash);
              const hasRefund = !!getRecordByType('refund', idHash);
              const phase = selectedAuction?.phase;
              const isSettledOrCancelled = phase === 'settled' || phase === 'cancelled';

              // Forfeited: has SealedBid, no RevealedBid, auction already closed
              const isForfeited = tab === 'claim' && hasSealed && !hasRevealed && isSettledOrCancelled;
              // Already done: has win record and on redeem tab
              const alreadyRedeemable = tab === 'redeem' && hasWin;
              // Already revealed, waiting for settlement on claim
              const waitingForSettlement = tab === 'claim' && hasRevealed && phase !== 'settled';
              // Reveal too early (still in bidding phase)
              const revealTooEarly = tab === 'reveal' && phase === 'bidding';
              // Reveal too late
              const revealTooLate = tab === 'reveal' && hasSealed && isSettledOrCancelled;
              // Already revealed and auction settled: ready to claim
              const readyToClaim = tab === 'claim' && hasRevealed && phase === 'settled';
              // Claim done, ready to redeem
              const readyToRedeem = tab === 'redeem' && hasWin;
              // Has refund ready
              const readyToRefund = tab === 'refund' && hasRefund;

              const isActionDisabled =
                !wallet.connected ||
                transactionPending ||
                (tab === 'bid' && !auctionId) ||
                isForfeited ||
                revealTooEarly ||
                revealTooLate ||
                waitingForSettlement;

              let buttonLabel = '';
              if (transactionPending && activeAction === tabAction) {
                buttonLabel = 'Processing...';
              } else if (!wallet.connected) {
                buttonLabel = 'Connect Wallet';
              } else if (isForfeited) {
                buttonLabel = 'Deposit Forfeited — Cannot Claim';
              } else if (revealTooEarly) {
                buttonLabel = 'Bidding Still Open — Reveal Later';
              } else if (revealTooLate) {
                buttonLabel = 'Reveal Window Closed';
              } else if (waitingForSettlement) {
                buttonLabel = 'Waiting for Settlement';
              } else if (tab === 'bid') {
                buttonLabel = 'Submit Sealed Bid';
              } else if (tab === 'reveal') {
                buttonLabel = hasRevealed ? '✓ Already Revealed' : 'Reveal Bid';
              } else if (tab === 'claim') {
                buttonLabel = hasWin ? '✓ Already Claimed' : readyToClaim ? 'Claim Collateral' : 'Claim Collateral';
              } else if (tab === 'redeem') {
                buttonLabel = readyToRedeem ? 'Redeem ALEO' : 'Redeem ALEO';
              } else {
                buttonLabel = readyToRefund ? 'Collect Refund' : 'Collect Refund';
              }

              // Reveal already done — show Done state, no button needed
              if (tab === 'reveal' && hasRevealed) {
                return (
                  <button
                    disabled
                    className="w-full py-3 rounded-lg font-label text-sm uppercase tracking-wider transition-all bg-accent-success/10 text-accent-success border border-accent-success/20 opacity-60 cursor-not-allowed"
                  >
                    ✓ Already Revealed — Wait for Settlement
                  </button>
                );
              }
              // Claim already done — show Done state
              if (tab === 'claim' && hasWin) {
                return (
                  <button
                    disabled
                    className="w-full py-3 rounded-lg font-label text-sm uppercase tracking-wider transition-all bg-accent-success/10 text-accent-success border border-accent-success/20 opacity-60 cursor-not-allowed"
                  >
                    ✓ Already Claimed — Go to Redeem Tab
                  </button>
                );
              }

              return (
                <button
                  onClick={
                    tab === 'bid' ? handleSubmitBid
                    : tab === 'reveal' ? handleRevealBid
                    : tab === 'claim' ? handleClaimCollateral
                    : tab === 'redeem' ? handleRedeemCollateral
                    : handleRefundBid
                  }
                  disabled={isActionDisabled}
                  className={`w-full py-3 rounded-lg font-label text-sm uppercase tracking-wider transition-all border disabled:cursor-not-allowed ${
                    isForfeited || revealTooLate
                      ? 'bg-red-500/5 text-red-400/60 border-red-500/10 opacity-60'
                      : revealTooEarly
                      ? 'bg-blue-500/5 text-blue-400/60 border-blue-500/10 opacity-60'
                      : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 disabled:opacity-40'
                  }`}
                >
                  {buttonLabel}
                </button>
              );
            })()}

            {transactionStep === 'confirmed' && activeAction === tabAction && (
              <button
                onClick={() => { resetTransaction(); setActiveAction(null); }}
                className="w-full mt-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </SpotlightCard>
      </FadeInView>

      {/* How It Works */}
      <FadeInView delay={0.3}>
        <SpotlightCard className="p-6">
          <h3 className="font-headline text-lg text-text-primary mb-4">How Sealed-Bid Auctions Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-accent-success font-headline text-lg mb-2">1</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Auction Created</h4>
              <p className="text-text-muted text-xs">ALEO collateral from liquidations is locked in the contract. A bid window and reveal window are set.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-accent-success font-headline text-lg mb-2">2</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Submit Sealed Bid</h4>
              <p className="text-text-muted text-xs">Deposit USDCx and submit a hidden commitment. Nobody can see how much you bid — Aleo ZK proofs keep it private.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-accent-warning font-headline text-lg mb-2">3</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Reveal Your Bid</h4>
              <p className="text-text-muted text-xs">After bidding closes, enter your original bid + secret. The contract verifies it matches and tracks the highest bidder.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">4</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Auto-Settlement</h4>
              <p className="text-text-muted text-xs">Our bot auto-settles after the reveal phase ends. Highest bidder wins. Non-winners get automatic refund records.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">5</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Claim & Redeem</h4>
              <p className="text-text-muted text-xs">Winner: Claim → Redeem to receive ALEO privately. Non-winner: Collect your full USDCx refund. All as private records.</p>
            </div>
          </div>
        </SpotlightCard>
      </FadeInView>

      {/* Why Sealed Bids */}
      <FadeInView delay={0.35}>
        <SpotlightCard className="p-6">
          <h3 className="font-headline text-lg text-text-primary mb-3">Why Sealed-Bid?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <h4 className="text-accent-success text-sm font-medium">No Front-Running</h4>
              <p className="text-text-muted text-xs">Bids are hidden behind zero-knowledge commitments. No one can see your bid and outbid you by $1.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-accent-success text-sm font-medium">No MEV Extraction</h4>
              <p className="text-text-muted text-xs">Validators cannot extract value from bid ordering because all bids are sealed. Fair price discovery for everyone.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-accent-success text-sm font-medium">Full Privacy</h4>
              <p className="text-text-muted text-xs">Built on Aleo — bid amounts, bidder identities, and winner details are all private. Only aggregate stats are public.</p>
            </div>
          </div>
        </SpotlightCard>
      </FadeInView>

      {/* Footer */}
      <FadeInView delay={0.4}>
        <div className="text-center text-text-muted text-xs">
          Total Bid Volume: <span className="text-primary">{totalBidVol.toFixed(2)} USDCx</span> &middot; Program: <span className="text-text-secondary font-mono text-[10px]">{AUCTION_PROGRAM_ID}</span>
        </div>
      </FadeInView>
    </div>
  );
}
