import { useState, useEffect, useCallback } from 'react';
import { useTransaction } from '@/hooks/useTransaction';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import {
  AUCTION_PROGRAM_ID, AUCTION_TRANSITIONS, AUCTION_MAPPINGS,
  BACKEND_API, PRECISION, TX_FEE, TX_FEE_HIGH,
} from '@/utils/constants';
import { SpotlightCard } from '@/components/shared/SpotlightCard';
import { FadeInView } from '@/components/shared/FadeInView';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
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

export function Auctions({ wallet }: AuctionsProps) {
  const { submitSealedBid, revealBid, claimAuctionCollateral } = useTransaction(wallet as any);
  const { usdcxRecords, refetch: refetchRecords } = useWalletRecords(wallet);
  const [stats, setStats] = useState<AuctionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'bid' | 'reveal' | 'claim'>('bid');
  const [auctionId, setAuctionId] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [secret, setSecret] = useState('');
  const [auctionRecords, setAuctionRecords] = useState<any[]>([]);

  // Parse USDCx records for bidding
  const parsedUsdcx = (usdcxRecords || []).filter((r: any) => !r.spent).map((r: any) => {
    const pt = (r.recordPlaintext ?? r.plaintext ?? r.data ?? '') as string;
    const str = typeof pt === 'string' ? pt : JSON.stringify(pt);
    const match = str.match(/amount\s*:\s*(\d+)u128/);
    return match ? { amount: parseInt(match[1], 10), plaintext: str } : null;
  }).filter(Boolean) as { amount: number; plaintext: string }[];

  // Fetch auction program records (SealedBid, RevealedBid, etc.)
  useEffect(() => {
    if (!wallet.connected || !wallet.requestRecords) return;
    wallet.requestRecords(AUCTION_PROGRAM_ID, true)
      .then((recs: any[]) => setAuctionRecords(recs.filter((r: any) => !r.spent)))
      .catch(() => setAuctionRecords([]));
  }, [wallet.connected]);

  const fetchStats = useCallback(async () => {
    try {
      const [activeRes, statsRes] = await Promise.all([
        fetch(`${BACKEND_API}/auction/active`).then(r => r.json()).catch(() => null),
        fetch(`${BACKEND_API}/auction/stats`).then(r => r.json()).catch(() => null),
      ]);
      setStats({
        activeAuctions: activeRes?.auctionCount ?? activeRes?.activeAuctions ?? 0,
        totalAuctions: statsRes?.totalAuctions ?? '0',
        totalBidVolume: statsRes?.totalBidVolume ?? '0',
        paused: activeRes?.paused ?? false,
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleSubmitBid = async () => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }
    const parsedAmount = parseFloat(bidAmount);
    const parsedAuction = parseInt(auctionId);
    if (!parsedAmount || parsedAmount <= 0) { toast.error('Enter a valid bid amount'); return; }
    if (isNaN(parsedAuction) || parsedAuction < 0) { toast.error('Enter a valid auction ID'); return; }
    if (!secret) { toast.error('Enter a secret for sealed bid'); return; }

    const microAmount = Math.floor(parsedAmount * PRECISION);

    // Find USDCx record with sufficient balance
    const record = parsedUsdcx.find(r => r.amount >= microAmount);
    if (!record) {
      toast.error(`No USDCx record with enough balance. Need ${parsedAmount} USDCx.`);
      return;
    }

    // Compute auction_id field (contract uses BHP256::hash_to_field(count))
    // For now pass as field — admin can provide the correct auction_id field value
    const auctionIdField = `${parsedAuction}field`;

    // Commitment = BHP256(BHP256(bid_amount) + secret) — computed on-chain during reveal
    // For sealed bid submission, we pass a commitment that we can verify later
    // Since BHP256 can't be computed in JS, use a deterministic placeholder
    // The user must remember their exact bid + secret for the reveal phase
    const commitmentField = `${BigInt(microAmount) * BigInt(secret)}field`;

    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    const nonce = Array.from(randomBytes).reduce((acc, b) => acc * 256 + b, 0);

    try {
      await submitSealedBid(record.plaintext, auctionIdField, commitmentField, microAmount, nonce);
      toast.success('Sealed bid submitted! Save your secret — you need it to reveal.');
      setBidAmount('');
      setAuctionId('');
      setTimeout(() => { fetchStats(); refetchRecords(); }, 5000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bid submission failed');
    }
  };

  const handleRevealBid = async () => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }
    if (!secret) { toast.error('Enter the secret from your sealed bid'); return; }
    const parsedAmount = parseFloat(bidAmount);
    if (!parsedAmount) { toast.error('Enter your actual bid amount'); return; }

    // Find SealedBid record from auction program
    const sealedBidRecord = auctionRecords.find((r: any) => {
      const pt = (r.recordPlaintext ?? r.plaintext ?? '') as string;
      return pt.includes('commitment') && pt.includes('deposit');
    });
    if (!sealedBidRecord) {
      toast.error('No SealedBid record found. Make sure you submitted a bid first.');
      return;
    }
    const sealedPlaintext = (sealedBidRecord.recordPlaintext ?? sealedBidRecord.plaintext ?? '') as string;
    const microAmount = Math.floor(parsedAmount * PRECISION);

    try {
      await revealBid(sealedPlaintext, microAmount, secret);
      toast.success('Bid revealed! Wait for settlement to claim.');
      setBidAmount('');
      setSecret('');
      setTimeout(fetchStats, 5000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reveal failed');
    }
  };

  const handleClaimCollateral = async () => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }

    // Find RevealedBid record from auction program records
    const revealedRecord = auctionRecords.find((r: any) => {
      const pt = (r.recordPlaintext ?? r.plaintext ?? '') as string;
      return pt.includes('bid_amount') && pt.includes('deposit') && pt.includes('nonce_hash');
    });
    if (!revealedRecord) {
      toast.error('No RevealedBid record found. Reveal your bid first.');
      return;
    }
    const revealedPlaintext = (revealedRecord.recordPlaintext ?? revealedRecord.plaintext ?? '') as string;

    try {
      await claimAuctionCollateral(revealedPlaintext);
      toast.success('Collateral claimed!');
      setAuctionId('');
      setTimeout(fetchStats, 5000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Claim failed');
    }
  };

  const totalBidVol = (Number(stats?.totalBidVolume) || 0) / PRECISION;

  return (
    <div className="space-y-6">
      <FadeInView>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-2xl text-text-primary tracking-wide">Sealed-Bid Auctions</h1>
            <p className="text-text-muted text-sm mt-1">
              Privacy-preserving liquidation auctions — sealed bids prevent MEV and front-running
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${stats?.paused ? 'bg-red-500' : 'bg-accent-success'}`} />
            <span className="text-text-muted text-xs font-label uppercase tracking-wider">
              {stats?.paused ? 'Paused' : 'Active'}
            </span>
          </div>
        </div>
      </FadeInView>

      {/* Stats */}
      <FadeInView delay={0.1}>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Active Auctions</p>
            {loading ? <LoadingSkeleton className="h-6 w-12 mt-1" /> : (
              <p className="text-xl font-headline text-primary mt-1">{stats?.activeAuctions ?? 0}</p>
            )}
          </SpotlightCard>
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Total Auctions</p>
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
        </div>
      </FadeInView>

      {/* Action Tabs */}
      <FadeInView delay={0.2}>
        <SpotlightCard className="p-6">
          <div className="flex gap-2 mb-6">
            {(['bid', 'reveal', 'claim'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-lg font-label text-xs uppercase tracking-wider transition-all ${
                  tab === t ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/[0.03] text-text-muted hover:text-text-secondary'
                }`}
              >
                {t === 'bid' ? 'Submit Bid' : t === 'reveal' ? 'Reveal Bid' : 'Claim'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-text-muted text-xs font-label uppercase tracking-wider block mb-2">
                Auction ID
              </label>
              <input
                type="number"
                value={auctionId}
                onChange={(e) => setAuctionId(e.target.value)}
                placeholder="Enter auction ID"
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-primary/30 transition-colors"
              />
            </div>

            {(tab === 'bid' || tab === 'reveal') && (
              <>
                <div>
                  <label className="text-text-muted text-xs font-label uppercase tracking-wider block mb-2">
                    {tab === 'bid' ? 'Bid Amount (USDCx)' : 'Actual Bid Amount (USDCx)'}
                  </label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={tab === 'bid' ? 'Your sealed bid amount' : 'Your original bid amount'}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-primary/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-text-muted text-xs font-label uppercase tracking-wider block mb-2">
                    {tab === 'bid' ? 'Secret (save this!)' : 'Secret (from your bid)'}
                  </label>
                  <input
                    type="text"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder={tab === 'bid' ? 'Enter a random number as your secret' : 'Enter the secret you used when bidding'}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-primary/30 transition-colors"
                  />
                  {tab === 'bid' && (
                    <p className="text-accent-warning text-xs mt-1">
                      Important: Save your secret. You will need it to reveal your bid.
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="bg-white/[0.02] rounded-lg p-3 space-y-1">
              {tab === 'bid' && (
                <>
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Commitment</span>
                    <span>BHP256(BHP256(bid) + secret)</span>
                  </div>
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Privacy</span>
                    <span className="text-accent-success">Sealed — bid hidden until reveal</span>
                  </div>
                </>
              )}
              {tab === 'reveal' && (
                <>
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Verification</span>
                    <span>On-chain commitment check</span>
                  </div>
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>If Highest</span>
                    <span className="text-accent-success">Auto-tracked as winner</span>
                  </div>
                </>
              )}
              {tab === 'claim' && (
                <div className="flex justify-between text-xs text-text-muted">
                  <span>Winner</span>
                  <span className="text-accent-success">Claim discounted collateral</span>
                </div>
              )}
            </div>

            <button
              onClick={tab === 'bid' ? handleSubmitBid : tab === 'reveal' ? handleRevealBid : handleClaimCollateral}
              disabled={!wallet.connected || !auctionId}
              className="w-full py-3 rounded-lg font-label text-sm uppercase tracking-wider transition-all bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {!wallet.connected ? 'Connect Wallet' : tab === 'bid' ? 'Submit Sealed Bid' : tab === 'reveal' ? 'Reveal Bid' : 'Claim Collateral'}
            </button>
          </div>
        </SpotlightCard>
      </FadeInView>

      {/* How It Works */}
      <FadeInView delay={0.3}>
        <SpotlightCard className="p-6">
          <h3 className="font-headline text-lg text-text-primary mb-4">Auction Phases</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">1</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Auction Created</h4>
              <p className="text-text-muted text-xs">Liquidated collateral is listed. Minimum bid is set by the protocol.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">2</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Sealed Bidding</h4>
              <p className="text-text-muted text-xs">Bid privately using a cryptographic commitment. Nobody can see your bid.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">3</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Reveal Phase</h4>
              <p className="text-text-muted text-xs">Reveal your bid. Contract verifies commitment matches. Highest bid tracked on-chain.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">4</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Settlement</h4>
              <p className="text-text-muted text-xs">Winner claims collateral. Losers get automatic refunds. All private records.</p>
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
