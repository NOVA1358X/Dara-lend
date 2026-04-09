import { useState, useEffect, useCallback } from 'react';
import { useTransaction } from '@/hooks/useTransaction';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import {
  DARKPOOL_PROGRAM_ID, DARKPOOL_TRANSITIONS, DARKPOOL_MAPPINGS,
  ALEO_TESTNET_API, BACKEND_API, PRECISION, CREDITS_PROGRAM,
  TX_FEE, TX_FEE_HIGH, USDCX_PROGRAM,
} from '@/utils/constants';
import { formatCredits } from '@/utils/formatting';
import { SpotlightCard } from '@/components/shared/SpotlightCard';
import { FadeInView } from '@/components/shared/FadeInView';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import toast from 'react-hot-toast';

interface DarkPoolProps {
  wallet: {
    requestRecords?: (program: string, all?: boolean) => Promise<unknown[]>;
    requestTransaction?: (tx: unknown) => Promise<{ transactionId: string } | undefined>;
    transactionStatus?: (txId: string) => Promise<{ status: string }>;
    decrypt?: (cipherText: string) => Promise<string>;
    connected: boolean;
    address?: string | null;
  };
}

const FREEZE_LIST_PROOF = `[{siblings: [0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field], leaf_index: 1u32}, {siblings: [0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field], leaf_index: 1u32}]`;

interface EpochData {
  currentEpoch: number;
  paused: boolean;
  buyVolume: string;
  sellVolume: string;
  settled: boolean;
  epochPrice: string;
  totalTrades: string;
  totalVolume: string;
}

export function DarkPool({ wallet }: DarkPoolProps) {
  const { submitBuyIntent, submitSellIntent, claimBuyFill, claimSellFill, cancelBuy, cancelSell } = useTransaction(wallet as any);
  const { creditsRecords, usdcxRecords, refetch: refetchRecords } = useWalletRecords(wallet);
  const [epochData, setEpochData] = useState<EpochData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [intentRecords, setIntentRecords] = useState<any[]>([]);

  // Parse wallet records
  const parsedUsdcx = (usdcxRecords || []).filter((r: any) => !r.spent).map((r: any) => {
    const pt = (r.recordPlaintext ?? r.plaintext ?? r.data ?? '') as string;
    const str = typeof pt === 'string' ? pt : JSON.stringify(pt);
    const match = str.match(/amount\s*:\s*(\d+)u128/);
    return match ? { amount: parseInt(match[1], 10), plaintext: str } : null;
  }).filter(Boolean) as { amount: number; plaintext: string }[];

  const parsedCredits = (creditsRecords || []).filter((r: any) => !r.spent).map((r: any) => {
    const pt = (r.recordPlaintext ?? r.plaintext ?? r.data ?? '') as string;
    const str = typeof pt === 'string' ? pt : JSON.stringify(pt);
    const match = str.match(/microcredits\s*:\s*(\d+)u64/);
    return match ? { amount: parseInt(match[1], 10), plaintext: str } : null;
  }).filter(Boolean) as { amount: number; plaintext: string }[];

  const fetchEpochData = useCallback(async () => {
    try {
      const [epochRes, statsRes] = await Promise.all([
        fetch(`${BACKEND_API}/darkpool/epoch`).then(r => r.json()).catch(() => null),
        fetch(`${BACKEND_API}/darkpool/stats`).then(r => r.json()).catch(() => null),
      ]);
      setEpochData({
        currentEpoch: epochRes?.currentEpoch ?? 1,
        paused: epochRes?.paused ?? false,
        buyVolume: epochRes?.buyVolume ?? '0',
        sellVolume: epochRes?.sellVolume ?? '0',
        settled: epochRes?.settled ?? false,
        epochPrice: epochRes?.price ?? '0',
        totalTrades: statsRes?.totalTrades ?? '0',
        totalVolume: statsRes?.totalVolume ?? '0',
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEpochData();
    const interval = setInterval(fetchEpochData, 30000);
    return () => clearInterval(interval);
  }, [fetchEpochData]);

  // Fetch TradeIntent records from dark pool program
  useEffect(() => {
    if (!wallet.connected || !wallet.requestRecords) return;
    wallet.requestRecords(DARKPOOL_PROGRAM_ID, true)
      .then((recs: any[]) => setIntentRecords(recs.filter((r: any) => !r.spent)))
      .catch(() => setIntentRecords([]));
  }, [wallet.connected]);

  // Parse TradeIntent records
  const parsedIntents = intentRecords.map((r: any) => {
    const pt = (r.recordPlaintext ?? r.plaintext ?? '') as string;
    if (!pt.includes('nonce_hash')) return null; // Not a TradeIntent
    const typeMatch = pt.match(/intent_type\s*:\s*(\d+)u8/);
    const amountMatch = pt.match(/amount\s*:\s*(\d+)u128/);
    const epochMatch = pt.match(/epoch\s*:\s*(\d+)u64/);
    if (!typeMatch || !amountMatch || !epochMatch) return null;
    return {
      intentType: parseInt(typeMatch[1], 10), // 0=buy, 1=sell
      amount: parseInt(amountMatch[1], 10),
      epoch: parseInt(epochMatch[1], 10),
      plaintext: pt,
    };
  }).filter(Boolean) as { intentType: number; amount: number; epoch: number; plaintext: string }[];

  const handleClaimFill = async (intent: typeof parsedIntents[0]) => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }
    const price = parseInt(epochData?.epochPrice || '0', 10);
    if (!price) { toast.error('Epoch price not available yet. Wait for settlement.'); return; }
    try {
      if (intent.intentType === 0) {
        // Buy intent: fill_aleo = amount * SCALE / price
        const fillAleo = Math.floor(Number(BigInt(intent.amount) * BigInt(PRECISION) / BigInt(price)));
        await claimBuyFill(intent.plaintext, fillAleo);
      } else {
        // Sell intent: fill_usdcx = amount * price / SCALE
        const fillUsdcx = Math.floor(Number(BigInt(intent.amount) * BigInt(price) / BigInt(PRECISION)));
        await claimSellFill(intent.plaintext, fillUsdcx);
      }
      toast.success('Fill claimed!');
      setTimeout(() => { fetchEpochData(); refetchRecords(); }, 5000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Claim failed');
    }
  };

  const handleCancelIntent = async (intent: typeof parsedIntents[0]) => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }
    try {
      if (intent.intentType === 0) {
        await cancelBuy(intent.plaintext);
      } else {
        await cancelSell(intent.plaintext);
      }
      toast.success('Intent cancelled! Funds returned.');
      setTimeout(() => { fetchEpochData(); refetchRecords(); }, 5000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed');
    }
  };

  const handleSubmitIntent = async () => {
    if (!wallet.connected) {
      toast.error('Connect wallet first');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    const epoch = epochData?.currentEpoch ?? 1;
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    const nonce = Array.from(randomBytes).reduce((acc, b) => acc * 256 + b, 0);
    const microAmount = Math.floor(parsedAmount * PRECISION);

    try {
      if (tab === 'buy') {
        // Find USDCx record with sufficient balance
        const record = parsedUsdcx.find(r => r.amount >= microAmount);
        if (!record) {
          toast.error(`No USDCx record with enough balance. Largest: ${parsedUsdcx.length > 0 ? (parsedUsdcx[0].amount / PRECISION).toFixed(2) : '0'} USDCx`);
          return;
        }
        await submitBuyIntent(record.plaintext, microAmount, epoch, nonce);
      } else {
        // Find credits record with sufficient balance
        const record = parsedCredits.find(r => r.amount >= microAmount);
        if (!record) {
          toast.error(`No ALEO record with enough balance. Largest: ${parsedCredits.length > 0 ? (parsedCredits[0].amount / PRECISION).toFixed(6) : '0'} ALEO`);
          return;
        }
        await submitSellIntent(record.plaintext, microAmount, epoch, nonce);
      }

      setAmount('');
      toast.success('Intent submitted! Waiting for epoch settlement.');
      setTimeout(() => { fetchEpochData(); refetchRecords(); }, 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      toast.error(msg);
    }
  };

  const buyVol = (Number(epochData?.buyVolume) || 0) / PRECISION;
  const sellVol = (Number(epochData?.sellVolume) || 0) / PRECISION;
  const totalTrades = Number(epochData?.totalTrades) || 0;
  const totalVolume = (Number(epochData?.totalVolume) || 0) / PRECISION;

  return (
    <div className="space-y-6">
      <FadeInView>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-2xl text-text-primary tracking-wide">Dark Pool</h1>
            <p className="text-text-muted text-sm mt-1">
              Private epoch-based batch trading — intents are encrypted, settlement at oracle mid-price
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${epochData?.paused ? 'bg-red-500' : 'bg-accent-success'}`} />
            <span className="text-text-muted text-xs font-label uppercase tracking-wider">
              {epochData?.paused ? 'Paused' : 'Active'}
            </span>
          </div>
        </div>
      </FadeInView>

      {/* Stats Grid */}
      <FadeInView delay={0.1}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Current Epoch</p>
            {loading ? <LoadingSkeleton className="h-6 w-16 mt-1" /> : (
              <p className="text-xl font-headline text-primary mt-1">#{epochData?.currentEpoch}</p>
            )}
          </SpotlightCard>
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Buy Volume</p>
            {loading ? <LoadingSkeleton className="h-6 w-24 mt-1" /> : (
              <p className="text-xl font-headline text-accent-success mt-1">{buyVol.toFixed(2)} USDCx</p>
            )}
          </SpotlightCard>
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Sell Volume</p>
            {loading ? <LoadingSkeleton className="h-6 w-24 mt-1" /> : (
              <p className="text-xl font-headline text-accent-warning mt-1">{sellVol.toFixed(2)} ALEO</p>
            )}
          </SpotlightCard>
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Total Trades</p>
            {loading ? <LoadingSkeleton className="h-6 w-16 mt-1" /> : (
              <p className="text-xl font-headline text-text-primary mt-1">{totalTrades}</p>
            )}
          </SpotlightCard>
        </div>
      </FadeInView>

      {/* Trade Form */}
      <FadeInView delay={0.2}>
        <SpotlightCard className="p-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab('buy')}
              className={`flex-1 py-2.5 rounded-lg font-label text-xs uppercase tracking-wider transition-all ${
                tab === 'buy' ? 'bg-accent-success/20 text-accent-success border border-accent-success/30' : 'bg-white/[0.03] text-text-muted hover:text-text-secondary'
              }`}
            >
              Buy ALEO
            </button>
            <button
              onClick={() => setTab('sell')}
              className={`flex-1 py-2.5 rounded-lg font-label text-xs uppercase tracking-wider transition-all ${
                tab === 'sell' ? 'bg-accent-warning/20 text-accent-warning border border-accent-warning/30' : 'bg-white/[0.03] text-text-muted hover:text-text-secondary'
              }`}
            >
              Sell ALEO
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-text-muted text-xs font-label uppercase tracking-wider">
                  {tab === 'buy' ? 'USDCx Amount' : 'ALEO Amount'}
                </label>
                <span className="text-text-muted text-xs">
                  {tab === 'buy'
                    ? `Balance: ${parsedUsdcx.length > 0 ? (parsedUsdcx.reduce((s, r) => s + r.amount, 0) / PRECISION).toFixed(2) : '0.00'} USDCx (${parsedUsdcx.length} records)`
                    : `Balance: ${parsedCredits.length > 0 ? (parsedCredits.reduce((s, r) => s + r.amount, 0) / PRECISION).toFixed(6) : '0.000000'} ALEO (${parsedCredits.length} records)`
                  }
                </span>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={tab === 'buy' ? 'Amount of USDCx to spend' : 'Amount of ALEO to sell'}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-primary/30 transition-colors"
              />
            </div>

            <div className="bg-white/[0.02] rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-xs text-text-muted">
                <span>Epoch</span>
                <span>#{epochData?.currentEpoch ?? '—'}</span>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Settlement</span>
                <span>Oracle mid-price (5-source)</span>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Privacy</span>
                <span className="text-accent-success">Fully encrypted intent</span>
              </div>
            </div>

            <button
              onClick={handleSubmitIntent}
              disabled={!wallet.connected || !amount}
              className="w-full py-3 rounded-lg font-label text-sm uppercase tracking-wider transition-all bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {!wallet.connected ? 'Connect Wallet' : `Submit ${tab === 'buy' ? 'Buy' : 'Sell'} Intent`}
            </button>
          </div>
        </SpotlightCard>
      </FadeInView>

      {/* Your Active Intents */}
      {parsedIntents.length > 0 && (
        <FadeInView delay={0.25}>
          <SpotlightCard className="p-6">
            <h3 className="font-headline text-lg text-text-primary mb-4">Your Active Intents</h3>
            <div className="space-y-3">
              {parsedIntents.map((intent, i) => {
                const isBuy = intent.intentType === 0;
                const intentEpochSettled = epochData?.settled && intent.epoch === epochData.currentEpoch;
                // For past epochs, check if epoch < current (always settled)
                const pastEpochSettled = epochData && intent.epoch < epochData.currentEpoch;
                const isSettled = intentEpochSettled || pastEpochSettled;
                return (
                  <div key={i} className="flex items-center justify-between bg-white/[0.02] rounded-lg p-3">
                    <div>
                      <span className={`text-xs font-label uppercase tracking-wider ${isBuy ? 'text-accent-success' : 'text-accent-warning'}`}>
                        {isBuy ? 'BUY' : 'SELL'}
                      </span>
                      <span className="text-text-primary text-sm ml-2">
                        {(intent.amount / PRECISION).toFixed(2)} {isBuy ? 'USDCx' : 'ALEO'}
                      </span>
                      <span className="text-text-muted text-xs ml-2">Epoch #{intent.epoch}</span>
                    </div>
                    <div className="flex gap-2">
                      {isSettled ? (
                        <button
                          onClick={() => handleClaimFill(intent)}
                          className="px-3 py-1.5 rounded-lg text-xs font-label uppercase tracking-wider bg-accent-success/10 text-accent-success border border-accent-success/20 hover:bg-accent-success/20"
                        >
                          Claim Fill
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCancelIntent(intent)}
                          className="px-3 py-1.5 rounded-lg text-xs font-label uppercase tracking-wider bg-accent-warning/10 text-accent-warning border border-accent-warning/20 hover:bg-accent-warning/20"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {epochData?.settled && (
              <p className="text-accent-success text-xs mt-3">Epoch #{epochData?.currentEpoch} is settled. You can claim your fills.</p>
            )}
            {!epochData?.settled && (
              <p className="text-text-muted text-xs mt-3">Epoch #{epochData?.currentEpoch} is collecting intents. Cancel before settlement or wait to claim after.</p>
            )}
          </SpotlightCard>
        </FadeInView>
      )}

      {/* How It Works */}
      <FadeInView delay={0.3}>
        <SpotlightCard className="p-6">
          <h3 className="font-headline text-lg text-text-primary mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">1</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Submit Intent</h4>
              <p className="text-text-muted text-xs">Lock tokens privately. Your intent amount and identity are encrypted in a ZK record.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">2</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Epoch Settlement</h4>
              <p className="text-text-muted text-xs">Admin settles epoch using 5-source oracle mid-price. Only aggregate volume is on-chain.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">3</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Claim Fill</h4>
              <p className="text-text-muted text-xs">Claim your traded tokens after settlement. Trade details remain private forever.</p>
            </div>
          </div>
        </SpotlightCard>
      </FadeInView>

      {/* Total Volume */}
      <FadeInView delay={0.4}>
        <div className="text-center text-text-muted text-xs">
          Total Dark Pool Volume: <span className="text-primary">${totalVolume.toFixed(2)}</span> &middot; Program: <span className="text-text-secondary font-mono text-[10px]">{DARKPOOL_PROGRAM_ID}</span>
        </div>
      </FadeInView>
    </div>
  );
}
