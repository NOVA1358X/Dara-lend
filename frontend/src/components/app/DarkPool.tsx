import { useState, useEffect, useCallback } from 'react';
import { useTransaction } from '@/hooks/useTransaction';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import {
  DARKPOOL_PROGRAM_ID, DARKPOOL_TRANSITIONS, DARKPOOL_MAPPINGS,
  ALEO_TESTNET_API, BACKEND_API, PRECISION, CREDITS_PROGRAM,
  TX_FEE, TX_FEE_HIGH, USDCX_PROGRAM, ADMIN_ADDRESS, DARKPOOL_ADDRESS,
} from '@/utils/constants';
import { formatCredits } from '@/utils/formatting';
import { SpotlightCard } from '@/components/shared/SpotlightCard';
import { FadeInView } from '@/components/shared/FadeInView';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { TransactionFlow } from '@/components/shared/TransactionFlow';
import { useAppStore } from '@/stores/appStore';
import toast from 'react-hot-toast';

interface DarkPoolProps {
  wallet: {
    requestRecords?: (program: string, all?: boolean) => Promise<unknown[]>;
    requestTransaction?: (tx: any) => Promise<{ transactionId: string } | undefined>;
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
  const { submitBuyIntent, submitSellIntent, claimBuyFill, claimSellFill, cancelBuy, cancelSell, fundDarkPoolAleo, fundDarkPoolUsdcx, resetTransaction } = useTransaction(wallet as any);
  const { creditsRecords, usdcxRecords, refetch: refetchRecords } = useWalletRecords(wallet);
  const { transactionStep, transactionId, transactionPending } = useAppStore();
  const [epochData, setEpochData] = useState<EpochData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [fundToken, setFundToken] = useState<'aleo' | 'usdcx'>('aleo');
  const [poolBalance, setPoolBalance] = useState({ aleo: 0, usdcx: 0 });
  const [intentRecords, setIntentRecords] = useState<any[]>([]);
  const isAdmin = wallet.address === ADMIN_ADDRESS;
  const [activeAction, setActiveAction] = useState<'submit' | 'claim' | null>(null);

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

  // Fetch dark pool on-chain balances (ALEO + USDCx)
  useEffect(() => {
    const fetchPoolBalance = async () => {
      try {
        const [aleoRaw, usdcxRaw] = await Promise.all([
          fetch(`${ALEO_TESTNET_API}/program/${CREDITS_PROGRAM}/mapping/account/${DARKPOOL_ADDRESS}`).then(r => r.text()).catch(() => ''),
          fetch(`${ALEO_TESTNET_API}/program/${USDCX_PROGRAM}/mapping/balances/${DARKPOOL_ADDRESS}`).then(r => r.text()).catch(() => ''),
        ]);
        const parseVal = (raw: string) => {
          if (!raw || raw.includes('null') || raw.includes('error') || raw.includes('NOT_FOUND')) return 0;
          const cleaned = raw.replace(/["\s]/g, '').replace(/u\d+$/i, '');
          return parseInt(cleaned, 10) || 0;
        };
        setPoolBalance({ aleo: parseVal(aleoRaw), usdcx: parseVal(usdcxRaw) });
      } catch { /* silent */ }
    };
    fetchPoolBalance();
    const interval = setInterval(fetchPoolBalance, 30000);
    return () => clearInterval(interval);
  }, []);

  const refetchIntentRecords = useCallback(() => {
    if (!wallet.connected || !wallet.requestRecords) return;
    wallet.requestRecords(DARKPOOL_PROGRAM_ID, true)
      .then((recs: any[]) => setIntentRecords(recs.filter((r: any) => !r.spent)))
      .catch(() => setIntentRecords([]));
  }, [wallet.connected, wallet.requestRecords]);

  // Fetch TradeIntent records from dark pool program
  useEffect(() => {
    refetchIntentRecords();
  }, [refetchIntentRecords]);

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
    setActiveAction('claim');

    // Fetch the settlement price for this intent's epoch (may differ from current epoch)
    let price = 0;
    try {
      const epochRes = await fetch(`${BACKEND_API}/darkpool/epoch/${intent.epoch}`).then(r => r.json());
      price = parseInt(epochRes?.price || '0', 10);
      if (!epochRes?.settled) {
        const bv = parseInt(epochRes?.buyVolume || '0', 10);
        const sv = parseInt(epochRes?.sellVolume || '0', 10);
        const waitingFor = bv === 0 && sv === 0 ? 'orders on both sides' : bv === 0 ? 'buy orders' : sv === 0 ? 'sell orders' : 'the bot to finalize';
        toast.error(`Epoch #${intent.epoch} is not settled yet. Waiting for ${waitingFor}. You can cancel this intent if you don't want to wait.`);
        return;
      }
    } catch {
      // Fallback to current epoch price
      price = parseInt(epochData?.epochPrice || '0', 10);
    }
    if (!price) { toast.error('Epoch price not available yet. Wait for settlement.'); return; }

    // Check actual pool balance — pool must hold the output token (admin may have funded it)
    try {
      const [aleoRaw, usdcxRaw] = await Promise.all([
        fetch(`${ALEO_TESTNET_API}/program/${CREDITS_PROGRAM}/mapping/account/${DARKPOOL_ADDRESS}`).then(r => r.text()).catch(() => ''),
        fetch(`${ALEO_TESTNET_API}/program/${USDCX_PROGRAM}/mapping/balances/${DARKPOOL_ADDRESS}`).then(r => r.text()).catch(() => ''),
      ]);
      const parseVal = (raw: string) => {
        if (!raw || raw.includes('null') || raw.includes('error') || raw.includes('NOT_FOUND')) return 0;
        const cleaned = raw.replace(/["\s]/g, '').replace(/u\d+$/i, '');
        return parseInt(cleaned, 10) || 0;
      };
      const liveAleo = parseVal(aleoRaw);
      const liveUsdcx = parseVal(usdcxRaw);
      if (intent.intentType === 0 && liveAleo === 0) {
        toast.error('The dark pool currently has 0 ALEO. Your buy claim cannot be filled until the pool is funded with ALEO. You can cancel this intent to get your USDCx back.');
        return;
      }
      if (intent.intentType === 1 && liveUsdcx === 0) {
        toast.error('The dark pool currently has 0 USDCx. Your sell claim cannot be filled until the pool is funded with USDCx. You can cancel this intent to get your ALEO back.');
        return;
      }
    } catch { /* proceed anyway */ }

    try {
      if (intent.intentType === 0) {
        // Buy intent: fill_aleo = amount * SCALE / price
        const fillAleo = Math.floor(Number(BigInt(intent.amount) * BigInt(PRECISION) / BigInt(price)));
        await claimBuyFill(intent.plaintext, fillAleo);
        toast.success(`Buy fill claimed! Receiving ~${(fillAleo / PRECISION).toFixed(6)} ALEO privately. Transaction confirming...`);
      } else {
        // Sell intent: fill_usdcx = amount * price / SCALE
        const fillUsdcx = Math.floor(Number(BigInt(intent.amount) * BigInt(price) / BigInt(PRECISION)));
        await claimSellFill(intent.plaintext, fillUsdcx);
        toast.success(`Sell fill claimed! Receiving ~${(fillUsdcx / PRECISION).toFixed(2)} USDCx privately. Transaction confirming...`);
      }
      setTimeout(() => { fetchEpochData(); refetchRecords(); refetchIntentRecords(); }, 3000);
      setTimeout(refetchIntentRecords, 8000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Claim failed';
      if (errMsg.includes('rejected') || errMsg.includes('REJECTED')) {
        toast.error('Claim transaction was rejected. The pool may not have enough balance for your fill. Try again or contact admin.');
      } else {
        toast.error(errMsg);
      }
    }
  };

  const handleCancelIntent = async (intent: typeof parsedIntents[0]) => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }
    setActiveAction('claim');
    try {
      if (intent.intentType === 0) {
        await cancelBuy(intent.plaintext);
      } else {
        await cancelSell(intent.plaintext);
      }
      toast.success('Intent cancelled! Funds returned.');
      setTimeout(() => { fetchEpochData(); refetchRecords(); refetchIntentRecords(); }, 3000);
      setTimeout(refetchIntentRecords, 8000);
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
    setActiveAction('submit');

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
      const otherSideVol = tab === 'buy' ? (Number(epochData?.sellVolume) || 0) : (Number(epochData?.buyVolume) || 0);
      if (otherSideVol > 0) {
        toast.success(`${tab === 'buy' ? 'Buy' : 'Sell'} intent submitted to Epoch #${epoch}! Both sides have volume — the bot will settle automatically.`);
      } else {
        toast.success(`${tab === 'buy' ? 'Buy' : 'Sell'} intent submitted to Epoch #${epoch}! Waiting for ${tab === 'buy' ? 'sellers' : 'buyers'} to match. Settlement happens once both sides have orders.`);
      }
      setTimeout(() => { fetchEpochData(); refetchRecords(); refetchIntentRecords(); }, 3000);
      setTimeout(refetchIntentRecords, 8000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      toast.error(msg);
    }
  };

  const buyVol = (Number(epochData?.buyVolume) || 0) / PRECISION;
  const sellVol = (Number(epochData?.sellVolume) || 0) / PRECISION;
  const totalTrades = Number(epochData?.totalTrades) || 0;
  const totalVolume = (Number(epochData?.totalVolume) || 0) / PRECISION;

  // Epoch matching state — tells users what's happening
  const epochMatchState: 'settled' | 'matched' | 'buy-only' | 'sell-only' | 'empty' = (() => {
    if (!epochData || epochData.settled) return 'settled';
    const bv = Number(epochData.buyVolume) || 0;
    const sv = Number(epochData.sellVolume) || 0;
    if (bv === 0 && sv === 0) return 'empty';
    if (bv > 0 && sv > 0) return 'matched';
    if (bv > 0) return 'buy-only';
    return 'sell-only';
  })();

  const epochStatusConfig = {
    settled: { color: 'bg-accent-success', text: 'Settled — claim your fills', textColor: 'text-accent-success' },
    matched: { color: 'bg-primary', text: 'Both sides matched — settlement in progress', textColor: 'text-primary' },
    'buy-only': { color: 'bg-accent-warning', text: 'Buy orders waiting — needs sellers to settle', textColor: 'text-accent-warning' },
    'sell-only': { color: 'bg-accent-warning', text: 'Sell orders waiting — needs buyers to settle', textColor: 'text-accent-warning' },
    empty: { color: 'bg-white/20', text: 'No orders yet — submit an intent to start', textColor: 'text-text-muted' },
  };

  const getIntentStatus = (intent: typeof parsedIntents[0]) => {
    if (epochData && intent.epoch < epochData.currentEpoch) {
      return { label: 'Settled', detail: 'Ready to claim your fill', color: 'text-accent-success', bgColor: 'bg-accent-success/10', canClaim: true, canCancel: false };
    }
    if (epochData?.settled && intent.epoch === epochData.currentEpoch) {
      return { label: 'Settled', detail: 'Ready to claim your fill', color: 'text-accent-success', bgColor: 'bg-accent-success/10', canClaim: true, canCancel: false };
    }
    // Current epoch, not settled
    const bv = Number(epochData?.buyVolume) || 0;
    const sv = Number(epochData?.sellVolume) || 0;
    if (bv > 0 && sv > 0) {
      return { label: 'Matching', detail: 'Both sides have volume — bot will settle soon', color: 'text-primary', bgColor: 'bg-primary/10', canClaim: false, canCancel: true };
    }
    if (intent.intentType === 0 && sv === 0) {
      return { label: 'Waiting', detail: 'Waiting for sellers to match your buy order', color: 'text-accent-warning', bgColor: 'bg-accent-warning/10', canClaim: false, canCancel: true };
    }
    if (intent.intentType === 1 && bv === 0) {
      return { label: 'Waiting', detail: 'Waiting for buyers to match your sell order', color: 'text-accent-warning', bgColor: 'bg-accent-warning/10', canClaim: false, canCancel: true };
    }
    return { label: 'Open', detail: 'Epoch collecting intents — cancel or wait', color: 'text-text-muted', bgColor: 'bg-white/[0.04]', canClaim: false, canCancel: true };
  };

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
          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchEpochData(); refetchRecords(); refetchIntentRecords(); }}
              className="text-text-muted hover:text-primary text-xs font-label uppercase tracking-wider transition-colors"
            >
              Refresh
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${epochData?.paused ? 'bg-red-500' : 'bg-accent-success'}`} />
              <span className="text-text-muted text-xs font-label uppercase tracking-wider">
                {epochData?.paused ? 'Paused' : 'Active'}
              </span>
            </div>
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

      {/* Pool Liquidity & Epoch Status — visible to all users */}
      <FadeInView delay={0.15}>
        <SpotlightCard className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-text-muted text-[10px] font-label uppercase tracking-wider">Pool ALEO</p>
                <p className="text-sm font-headline text-accent-success">{(poolBalance.aleo / PRECISION).toFixed(4)}</p>
              </div>
              <div className="h-6 w-px bg-white/[0.06]" />
              <div>
                <p className="text-text-muted text-[10px] font-label uppercase tracking-wider">Pool USDCx</p>
                <p className="text-sm font-headline text-primary">{(poolBalance.usdcx / PRECISION).toFixed(2)}</p>
              </div>
              <div className="h-6 w-px bg-white/[0.06]" />
              <div>
                <p className="text-text-muted text-[10px] font-label uppercase tracking-wider">Epoch #{epochData?.currentEpoch ?? '—'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${epochStatusConfig[epochMatchState].color}`} />
                  <span className={`text-xs ${epochStatusConfig[epochMatchState].textColor}`}>
                    {epochStatusConfig[epochMatchState].text}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {(epochMatchState === 'buy-only' || epochMatchState === 'sell-only') && (
            <p className="text-text-muted text-[10px] mt-2 border-t border-white/[0.04] pt-2">
              The dark pool requires both buy and sell orders in the same epoch before settlement. The bot automatically settles once both sides have volume. You can cancel your intent anytime before settlement.
            </p>
          )}
          {epochMatchState === 'matched' && (
            <p className="text-text-muted text-[10px] mt-2 border-t border-white/[0.04] pt-2">
              Both buy and sell orders are matched. The settlement bot will execute within 60 seconds using the 5-source oracle mid-price.
            </p>
          )}
        </SpotlightCard>
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

            {/* Transaction Flow */}
            {transactionPending && activeAction === 'submit' && (
              <div className="mb-2">
                <TransactionFlow currentStep={transactionStep} txId={transactionId} />
              </div>
            )}

            <button
              onClick={handleSubmitIntent}
              disabled={!wallet.connected || !amount || transactionPending}
              className="w-full py-3 rounded-lg font-label text-sm uppercase tracking-wider transition-all bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {transactionPending ? 'Processing...' : !wallet.connected ? 'Connect Wallet' : `Submit ${tab === 'buy' ? 'Buy' : 'Sell'} Intent`}
            </button>

            {transactionStep === 'confirmed' && activeAction === 'submit' && (
              <button
                onClick={() => { resetTransaction(); setActiveAction(null); }}
                className="w-full mt-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                New Intent
              </button>
            )}
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
                const status = getIntentStatus(intent);
                return (
                  <div key={i} className="bg-white/[0.02] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-label uppercase tracking-wider px-2 py-0.5 rounded ${isBuy ? 'bg-accent-success/10 text-accent-success' : 'bg-accent-warning/10 text-accent-warning'}`}>
                          {isBuy ? 'BUY' : 'SELL'}
                        </span>
                        <span className="text-text-primary text-sm font-medium">
                          {(intent.amount / PRECISION).toFixed(isBuy ? 2 : 6)} {isBuy ? 'USDCx' : 'ALEO'}
                        </span>
                        <span className="text-text-muted text-xs">Epoch #{intent.epoch}</span>
                      </div>
                      <div className="flex gap-2">
                        {status.canClaim && (
                          <button
                            onClick={() => handleClaimFill(intent)}
                            className="px-3 py-1.5 rounded-lg text-xs font-label uppercase tracking-wider bg-accent-success/10 text-accent-success border border-accent-success/20 hover:bg-accent-success/20 transition-all"
                          >
                            Claim Fill
                          </button>
                        )}
                        {status.canCancel && (
                          <button
                            onClick={() => handleCancelIntent(intent)}
                            className="px-3 py-1.5 rounded-lg text-xs font-label uppercase tracking-wider bg-white/[0.04] text-text-muted border border-white/[0.06] hover:bg-white/[0.08] transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${status.bgColor}`} />
                      <span className={`text-[11px] ${status.color}`}>{status.label}</span>
                      <span className="text-text-muted text-[10px]">— {status.detail}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </SpotlightCard>
        </FadeInView>
      )}

      {/* Claim/Cancel Transaction Flow */}
      {activeAction === 'claim' && (transactionPending || transactionStep === 'confirmed') && (
        <FadeInView delay={0.25}>
          <SpotlightCard className="p-6">
            <h3 className="font-headline text-lg text-text-primary mb-4">
              {transactionStep === 'confirmed' ? 'Transaction Confirmed' : 'Processing...'}
            </h3>
            <TransactionFlow currentStep={transactionStep} txId={transactionId} />
            {transactionStep === 'confirmed' && (
              <button
                onClick={() => { resetTransaction(); setActiveAction(null); }}
                className="w-full mt-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Done
              </button>
            )}
          </SpotlightCard>
        </FadeInView>
      )}

      {/* How It Works */}
      <FadeInView delay={0.3}>
        <SpotlightCard className="p-6">
          <h3 className="font-headline text-lg text-text-primary mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">1</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Submit Intent</h4>
              <p className="text-text-muted text-xs">Choose Buy ALEO (pay with USDCx) or Sell ALEO (receive USDCx). Your intent is encrypted in a ZK record — no one can see your amount or identity. Only aggregate epoch volume is visible on-chain.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">2</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Wait for Match</h4>
              <p className="text-text-muted text-xs">The epoch needs <strong className="text-text-secondary">both buy and sell orders</strong> before it can settle. If only one side has volume, the status shows "Waiting for buyers/sellers". You can cancel anytime while waiting.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">3</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Auto-Settlement</h4>
              <p className="text-text-muted text-xs">Once both sides have orders, the bot settles automatically within 60 seconds using the 5-source oracle mid-price (Binance, Coinbase, CoinGecko, CoinMarketCap, CryptoCompare). No manual action needed.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">4</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Claim Fill</h4>
              <p className="text-text-muted text-xs">After settlement, click "Claim Fill" on your intent. Buyers receive private ALEO, sellers receive private USDCx — calculated from the settlement price. Your trade details remain private forever.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">5</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Cancel Anytime</h4>
              <p className="text-text-muted text-xs">Before settlement, you can cancel your intent at any time using the Cancel button to get your full tokens back. After settlement, only Claim is available — your tokens have been matched.</p>
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

      {/* Admin: Fund Dark Pool */}
      {isAdmin && (
        <FadeInView delay={0.5}>
          <SpotlightCard className="p-6 border border-primary/20">
            <h3 className="font-headline text-lg text-primary mb-4">Admin — Fund Dark Pool</h3>
            <p className="text-text-muted text-xs mb-4">
              Transfer ALEO or USDCx to the dark pool's on-chain balance. Buyers claim ALEO, sellers claim USDCx — the pool must hold enough of each.
            </p>

            {/* Pool Balance Display */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/[0.02] rounded-lg p-3">
                <p className="text-text-muted text-xs font-label uppercase tracking-wider">Pool ALEO Balance</p>
                <p className="text-lg font-headline text-accent-success mt-1">{(poolBalance.aleo / PRECISION).toFixed(6)} ALEO</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-3">
                <p className="text-text-muted text-xs font-label uppercase tracking-wider">Pool USDCx Balance</p>
                <p className="text-lg font-headline text-primary mt-1">{(poolBalance.usdcx / PRECISION).toFixed(2)} USDCx</p>
              </div>
            </div>

            {/* Token selector */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setFundToken('aleo')}
                className={`flex-1 py-2 rounded-lg font-label text-xs uppercase tracking-wider transition-all ${
                  fundToken === 'aleo' ? 'bg-accent-success/20 text-accent-success border border-accent-success/30' : 'bg-white/[0.03] text-text-muted hover:text-text-secondary'
                }`}
              >
                Fund ALEO
              </button>
              <button
                onClick={() => setFundToken('usdcx')}
                className={`flex-1 py-2 rounded-lg font-label text-xs uppercase tracking-wider transition-all ${
                  fundToken === 'usdcx' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/[0.03] text-text-muted hover:text-text-secondary'
                }`}
              >
                Fund USDCx
              </button>
            </div>

            <div className="flex gap-3">
              <input
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder={fundToken === 'aleo' ? 'ALEO amount (e.g. 5.0)' : 'USDCx amount (e.g. 10.0)'}
                className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-primary/30 transition-colors"
              />
              <button
                onClick={async () => {
                  const parsed = parseFloat(fundAmount);
                  if (!parsed || parsed <= 0) { toast.error('Enter a valid amount'); return; }
                  const micro = Math.floor(parsed * PRECISION);
                  if (fundToken === 'aleo') {
                    await fundDarkPoolAleo(micro);
                  } else {
                    await fundDarkPoolUsdcx(micro);
                  }
                  setFundAmount('');
                  setTimeout(() => refetchRecords(), 3000);
                }}
                disabled={!wallet.connected || !fundAmount}
                className="px-6 py-3 rounded-lg font-label text-xs uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Fund {fundToken === 'aleo' ? 'ALEO' : 'USDCx'}
              </button>
            </div>
            <p className="text-text-muted text-[10px] mt-2 font-mono break-all">Pool: {DARKPOOL_ADDRESS}</p>
          </SpotlightCard>
        </FadeInView>
      )}
    </div>
  );
}
