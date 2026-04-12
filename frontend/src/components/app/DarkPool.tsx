import { useState, useEffect, useCallback } from 'react';
import { useTransaction } from '@/hooks/useTransaction';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import {
  DARKPOOL_PROGRAM_ID, DARKPOOL_TRANSITIONS, DARKPOOL_MAPPINGS,
  ALEO_TESTNET_API, BACKEND_API, PRECISION, CREDITS_PROGRAM,
  TX_FEE, TX_FEE_HIGH, USDCX_PROGRAM, ADMIN_ADDRESS,
  DARK_POOL_MARKETS, type DarkPoolMarket,
} from '@/utils/constants';
import { formatCredits } from '@/utils/formatting';
import { SpotlightCard } from '@/components/shared/SpotlightCard';
import { FadeInView } from '@/components/shared/FadeInView';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { TransactionFlow } from '@/components/shared/TransactionFlow';
import { TokenIcon } from '@/components/shared/TokenIcon';
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

interface BatchData {
  currentBatch: number;
  paused: boolean;
  approved: boolean;
  proposedPrice: string;
  approvalCount: number;
  oraclePrice: string;
  oracleRound: string;
  twap: string;
  feeBps: string;
  feeVault: string;
  totalTrades: string;
  totalVolume: string;
  realPrice: number;
}

const OPERATOR_ADDRESS = ADMIN_ADDRESS;

export function DarkPool({ wallet }: DarkPoolProps) {
  const { submitBuyOrder, submitSellOrder, cancelBuyOrder, cancelSellOrder, resubmitResidual, fundDarkPoolAleo, fundDarkPoolUsdcx, resetTransaction } = useTransaction(wallet as any);
  const { creditsRecords, usdcxRecords, btcRecords, ethRecords, solRecords, refetch: refetchRecords } = useWalletRecords(wallet);
  const { transactionStep, transactionId, transactionPending } = useAppStore();
  const [selectedMarket, setSelectedMarket] = useState<DarkPoolMarket>(DARK_POOL_MARKETS[0]);
  const [batchData, setBatchData] = useState<BatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [fundToken, setFundToken] = useState<'aleo' | 'usdcx'>('aleo');
  const [poolBalance, setPoolBalance] = useState({ aleo: 0, usdcx: 0 });
  const [orderRecords, setOrderRecords] = useState<any[]>([]);
  const isAdmin = wallet.address === ADMIN_ADDRESS;
  const [activeAction, setActiveAction] = useState<'submit' | 'cancel' | null>(null);
  const [faucetLoading, setFaucetLoading] = useState<string | null>(null);
  const [faucetStatus, setFaucetStatus] = useState<Record<string, number>>({ BTC: 5, ETH: 5, SOL: 5 });

  const activeProgramId = selectedMarket.programId;

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

  // Parse test token records (BTC/ETH/SOL) — Token { owner, amount: u64 }
  const parseTokenRecords = (records: unknown[]) =>
    (records || []).filter((r: any) => !r.spent).map((r: any) => {
      const pt = (r.recordPlaintext ?? r.plaintext ?? r.data ?? '') as string;
      const str = typeof pt === 'string' ? pt : JSON.stringify(pt);
      const match = str.match(/amount\s*:\s*(\d+)u64/);
      return match ? { amount: parseInt(match[1], 10), plaintext: str } : null;
    }).filter(Boolean) as { amount: number; plaintext: string }[];

  const parsedBtc = parseTokenRecords(btcRecords);
  const parsedEth = parseTokenRecords(ethRecords);
  const parsedSol = parseTokenRecords(solRecords);

  // Get parsed sell records for the selected market
  const getSellRecords = () => {
    switch (selectedMarket.id) {
      case 'btc-usdcx': return parsedBtc;
      case 'eth-usdcx': return parsedEth;
      case 'sol-usdcx': return parsedSol;
      default: return parsedCredits; // ALEO market uses credits
    }
  };

  // Report order TX to backend for automated settlement
  const reportOrderToBackend = (txId: string, programId: string, direction: string, trader: string, size: number, limitPrice: number) => {
    fetch(`${BACKEND_API}/darkpool/report-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txId, programId, direction, trader, size, limitPrice }),
    }).catch(() => { /* best-effort, non-blocking */ });
  };

  const fetchBatchData = useCallback(async () => {
    try {
      const marketId = selectedMarket.id;
      const [batchRes, statsRes, twapRes] = await Promise.all([
        fetch(`${BACKEND_API}/darkpool/${marketId}/batch`).then(r => r.json()).catch(() => null),
        fetch(`${BACKEND_API}/darkpool/${marketId}/stats`).then(r => r.json()).catch(() => null),
        fetch(`${BACKEND_API}/darkpool/${marketId}/twap`).then(r => r.json()).catch(() => null),
      ]);
      setBatchData({
        currentBatch: batchRes?.currentBatch ?? 1,
        paused: batchRes?.paused ?? false,
        approved: batchRes?.approved ?? false,
        proposedPrice: batchRes?.proposedPrice ?? '0',
        approvalCount: batchRes?.approvalCount ?? 0,
        oraclePrice: statsRes?.oraclePrice ?? '0',
        oracleRound: statsRes?.oracleRound ?? '0',
        twap: twapRes?.twap ?? '0',
        feeBps: statsRes?.feeBps ?? '0',
        feeVault: statsRes?.feeVault ?? '0',
        totalTrades: statsRes?.totalTrades ?? '0',
        totalVolume: statsRes?.totalVolume ?? '0',
        realPrice: statsRes?.realPrice ?? 0,
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [selectedMarket]);

  useEffect(() => {
    fetchBatchData();
    const interval = setInterval(fetchBatchData, 30000);
    return () => clearInterval(interval);
  }, [fetchBatchData]);

  // Fetch dark pool on-chain balances (base token + USDCx) via backend stats
  useEffect(() => {
    const fetchPoolBalance = async () => {
      try {
        const statsRes = await fetch(`${BACKEND_API}/darkpool/${selectedMarket.id}/stats`).then(r => r.json()).catch(() => null);
        setPoolBalance({
          aleo: parseInt(statsRes?.feeVault ?? '0', 10),
          usdcx: parseInt(statsRes?.totalVolume ?? '0', 10),
        });
      } catch { /* silent */ }
    };
    fetchPoolBalance();
    const interval = setInterval(fetchPoolBalance, 30000);
    return () => clearInterval(interval);
  }, [selectedMarket]);

  const refetchOrderRecords = useCallback(() => {
    if (!wallet.connected || !wallet.requestRecords) return;
    wallet.requestRecords(activeProgramId, true)
      .then((recs: any[]) => setOrderRecords(recs.filter((r: any) => !r.spent)))
      .catch(() => setOrderRecords([]));
  }, [wallet.connected, wallet.requestRecords, activeProgramId]);

  useEffect(() => {
    refetchOrderRecords();
  }, [refetchOrderRecords]);

  // Fetch faucet status for connected wallet
  useEffect(() => {
    if (!wallet.connected || !wallet.address) return;
    fetch(`${BACKEND_API}/faucet/status/${wallet.address}`)
      .then(r => r.json())
      .then(data => {
        if (data.tokens) {
          const status: Record<string, number> = {};
          data.tokens.forEach((t: { token: string; remaining: number }) => { status[t.token] = t.remaining; });
          setFaucetStatus(status);
        }
      })
      .catch(() => {});
  }, [wallet.connected, wallet.address]);

  const handleFaucetClaim = async (token: string) => {
    if (!wallet.connected || !wallet.address) { toast.error('Connect wallet first'); return; }
    setFaucetLoading(token);
    try {
      const res = await fetch(`${BACKEND_API}/faucet/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: wallet.address, token }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `10 ${token} claimed!`);
        setFaucetStatus(prev => ({ ...prev, [token]: data.remaining ?? (prev[token] - 1) }));
        // Refetch records after a delay to pick up the new private token record
        setTimeout(refetchRecords, 5000);
        setTimeout(refetchRecords, 15000);
      } else {
        toast.error(data.error || 'Claim failed');
      }
    } catch {
      toast.error('Faucet request failed');
    } finally {
      setFaucetLoading(null);
    }
  };

  // Parse OrderCommitment records (v2)
  const parsedOrders = orderRecords.map((r: any) => {
    const pt = (r.recordPlaintext ?? r.plaintext ?? '') as string;
    if (!pt.includes('order_id')) return null;
    // Detect record type
    const isCommitment = pt.includes('OrderCommitment') || (pt.includes('direction') && pt.includes('size'));
    const isFill = pt.includes('FillReceipt') || pt.includes('fill_size');
    const isResidual = pt.includes('ResidualOrder') || pt.includes('residual_size');
    if (!isCommitment && !isFill && !isResidual) return null;

    const orderIdMatch = pt.match(/order_id\s*:\s*(\d+field|\w+)/);
    const directionMatch = pt.match(/direction\s*:\s*(\d+)u8/);
    const sizeMatch = pt.match(/(?:size|fill_size|residual_size)\s*:\s*(\d+)u128/);
    const limitMatch = pt.match(/limit_price\s*:\s*(\d+)u64/);
    const batchMatch = pt.match(/batch_id\s*:\s*(\d+)u64/);
    const expiryMatch = pt.match(/expiry_block\s*:\s*(\d+)u32/);

    return {
      type: isCommitment ? 'commitment' as const : isFill ? 'fill' as const : 'residual' as const,
      orderId: orderIdMatch?.[1] ?? '',
      direction: directionMatch ? parseInt(directionMatch[1], 10) : -1, // 0=buy, 1=sell
      size: sizeMatch ? parseInt(sizeMatch[1], 10) : 0,
      limitPrice: limitMatch ? parseInt(limitMatch[1], 10) : 0,
      batchId: batchMatch ? parseInt(batchMatch[1], 10) : 0,
      expiryBlock: expiryMatch ? parseInt(expiryMatch[1], 10) : 0,
      plaintext: pt,
    };
  }).filter(Boolean) as {
    type: 'commitment' | 'fill' | 'residual';
    orderId: string;
    direction: number;
    size: number;
    limitPrice: number;
    batchId: number;
    expiryBlock: number;
    plaintext: string;
  }[];

  const commitments = parsedOrders.filter(o => o.type === 'commitment');
  const fills = parsedOrders.filter(o => o.type === 'fill');
  const residuals = parsedOrders.filter(o => o.type === 'residual');

  const handleCancelOrder = async (order: typeof commitments[0]) => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }
    setActiveAction('cancel');
    try {
      if (order.direction === 0) {
        await cancelBuyOrder(order.plaintext, activeProgramId);
      } else {
        await cancelSellOrder(order.plaintext, activeProgramId);
      }
      toast.success('Order cancelled! Funds returned.');
      setTimeout(() => { fetchBatchData(); refetchRecords(); refetchOrderRecords(); }, 3000);
      setTimeout(refetchOrderRecords, 8000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('parse') || msg.includes('constructor') || msg.includes('Remaining invalid string')) {
        toast.error('Shield wallet needs an update to cancel directly. Please contact the operator to cancel your order.');
      } else {
        toast.error(msg || 'Cancel failed');
      }
    }
  };

  const handleSubmitOrder = async () => {
    if (!wallet.connected) {
      toast.error('Connect wallet first');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    // Limit price: contract requires limit_price > 0
    // For market orders, use oracle price + 5% slippage (buys) or - 5% (sells)
    // Scale down by priceScale to fit contract's MAX_PRICE range
    const SCALE = 1_000_000;
    const parsedLimit = parseFloat(limitPrice || '0');
    const onChainOracle = Number(batchData?.oraclePrice) || 0;
    let limitMicro: number;
    if (parsedLimit > 0) {
      limitMicro = Math.floor(parsedLimit * PRECISION / selectedMarket.priceScale);
    } else if (onChainOracle > 0) {
      // Market order: use oracle price with 5% slippage
      limitMicro = tab === 'buy'
        ? Math.ceil(onChainOracle * 1.05)
        : Math.max(Math.floor(onChainOracle * 0.95), 1);
    } else {
      toast.error('Oracle price not available. Please enter a limit price.');
      return;
    }

    // Expiry block: default to current + 1000 blocks (~50 min)
    const expiryBlock = 999_999_999;

    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    const nonce = Array.from(randomBytes).reduce((acc, b) => acc * 256 + b, 0);
    const microAmount = Math.floor(parsedAmount * PRECISION);
    setActiveAction('submit');

    // Submit via Shield wallet directly
    if (tab === 'buy') {
      // For buy orders: user enters USDCx amount to spend; contract size = base asset quantity
      // size = usdcx_amount * SCALE / limit_price (converts USDCx → base asset quantity)
      const buySize = Math.floor(microAmount * SCALE / limitMicro);
      if (buySize <= 0) {
        toast.error('Order too small at this price');
        return;
      }
      const record = parsedUsdcx.find(r => r.amount >= microAmount);
      if (!record) {
        toast.error(`No USDCx record with enough balance. Largest: ${parsedUsdcx.length > 0 ? (Math.max(...parsedUsdcx.map(r => r.amount)) / PRECISION).toFixed(2) : '0'} USDCx`);
        return;
      }
      const txId = await submitBuyOrder(record.plaintext, buySize, limitMicro, expiryBlock, OPERATOR_ADDRESS, nonce, activeProgramId);
      if (txId) {
        setAmount('');
        setLimitPrice('');
        toast.success(`Buy order submitted to ${selectedMarket.label} Batch #${batchData?.currentBatch ?? 1}!`);
        // Report order to backend for settlement bot tracking
        reportOrderToBackend(txId, activeProgramId, 'buy', wallet.address || '', buySize, limitMicro);
        setTimeout(() => { fetchBatchData(); refetchRecords(); refetchOrderRecords(); }, 3000);
        setTimeout(refetchOrderRecords, 8000);
      }
    } else {
      const sellRecords = getSellRecords();
      const record = sellRecords.find(r => r.amount >= microAmount);
      if (!record) {
        toast.error(`No ${selectedMarket.baseAsset} record with enough balance. Largest: ${sellRecords.length > 0 ? (Math.max(...sellRecords.map(r => r.amount)) / PRECISION).toFixed(6) : '0'} ${selectedMarket.baseAsset}`);
        return;
      }
      const txId = await submitSellOrder(record.plaintext, microAmount, limitMicro, expiryBlock, OPERATOR_ADDRESS, nonce, activeProgramId);
      if (txId) {
        setAmount('');
        setLimitPrice('');
        toast.success(`Sell order submitted to ${selectedMarket.label} Batch #${batchData?.currentBatch ?? 1}!`);
        // Report order to backend for settlement bot tracking
        reportOrderToBackend(txId, activeProgramId, 'sell', wallet.address || '', microAmount, limitMicro);
        setTimeout(() => { fetchBatchData(); refetchRecords(); refetchOrderRecords(); }, 3000);
        setTimeout(refetchOrderRecords, 8000);
      }
    }
  };

  const oraclePrice = ((Number(batchData?.oraclePrice) || 0) / PRECISION) * selectedMarket.priceScale;
  const twapPrice = ((Number(batchData?.twap) || 0) / PRECISION) * selectedMarket.priceScale;
  const realPrice = batchData?.realPrice ?? 0;
  const totalTrades = Number(batchData?.totalTrades) || 0;
  const totalVolume = (Number(batchData?.totalVolume) || 0) / PRECISION;
  const feeBps = Number(batchData?.feeBps) || 0;

  // Batch state
  const batchState: 'collecting' | 'proposed' | 'approved' | 'settling' = (() => {
    if (!batchData) return 'collecting';
    if (batchData.approved) return 'approved';
    if (Number(batchData.proposedPrice) > 0) return 'proposed';
    return 'collecting';
  })();

  const batchStatusConfig = {
    collecting: { color: 'bg-primary', text: 'Collecting orders — submit your order now', textColor: 'text-primary' },
    proposed: { color: 'bg-accent-warning', text: `Settlement proposed at $${((Number(batchData?.proposedPrice || 0) / PRECISION) * selectedMarket.priceScale).toFixed(2)} — awaiting 2-of-3 approval`, textColor: 'text-accent-warning' },
    approved: { color: 'bg-accent-success', text: 'Batch approved — operator executing matches', textColor: 'text-accent-success' },
    settling: { color: 'bg-accent-success', text: 'Batch settled — advancing to next batch', textColor: 'text-accent-success' },
  };

  const getOrderStatus = (order: typeof commitments[0]) => {
    if (batchData && order.batchId < batchData.currentBatch) {
      return { label: 'Matched', detail: 'Operator has settled this batch', color: 'text-accent-success', bgColor: 'bg-accent-success/10', canCancel: false };
    }
    if (batchState === 'approved') {
      return { label: 'Settling', detail: 'Batch approved — matches executing soon', color: 'text-accent-success', bgColor: 'bg-accent-success/10', canCancel: false };
    }
    if (batchState === 'proposed') {
      return { label: 'Pending', detail: 'Settlement proposed — waiting for operator approval', color: 'text-accent-warning', bgColor: 'bg-accent-warning/10', canCancel: true };
    }
    return { label: 'Open', detail: 'Batch collecting orders — cancel anytime', color: 'text-text-muted', bgColor: 'bg-white/[0.04]', canCancel: true };
  };

  return (
    <div className="space-y-6">
      <FadeInView>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-2xl text-text-primary tracking-wide">Dark Pool</h1>
            <p className="text-text-muted text-sm mt-1">
              Private batch trading with TWAP settlement — orders are encrypted, matched by 2-of-3 threshold operators
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchBatchData(); refetchRecords(); refetchOrderRecords(); }}
              className="text-text-muted hover:text-primary text-xs font-label uppercase tracking-wider transition-colors"
            >
              Refresh
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${batchData?.paused ? 'bg-red-500' : 'bg-accent-success'}`} />
              <span className="text-text-muted text-xs font-label uppercase tracking-wider">
                {batchData?.paused ? 'Paused' : 'Active'}
              </span>
            </div>
          </div>
        </div>
      </FadeInView>

      {/* Market Selector */}
      <FadeInView delay={0.05}>
        <div className="flex gap-2">
          {DARK_POOL_MARKETS.map((market) => (
            <button
              key={market.id}
              onClick={() => { setBatchData(null); setSelectedMarket(market); setLoading(true); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label text-xs uppercase tracking-wider transition-all ${
                selectedMarket.id === market.id
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-white/[0.03] text-text-muted hover:text-text-secondary border border-transparent'
              }`}
            >
              <TokenIcon token={market.baseAsset as any} size={16} />
              {market.label}
            </button>
          ))}
        </div>
      </FadeInView>

      {/* Stats Grid */}
      <FadeInView delay={0.1}>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Current Batch</p>
            {loading ? <LoadingSkeleton className="h-6 w-16 mt-1" /> : (
              <p className="text-xl font-headline text-primary mt-1">#{batchData?.currentBatch}</p>
            )}
          </SpotlightCard>
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Market Price</p>
            {loading ? <LoadingSkeleton className="h-6 w-24 mt-1" /> : (
              <p className="text-xl font-headline text-accent-success mt-1">
                {realPrice > 0 ? `$${realPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: selectedMarket.priceScale >= 100 ? 2 : 4 })}` : `$${oraclePrice.toFixed(4)}`}
              </p>
            )}
          </SpotlightCard>
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">On-Chain Oracle</p>
            {loading ? <LoadingSkeleton className="h-6 w-24 mt-1" /> : (
              <p className="text-xl font-headline text-accent-warning mt-1">
                {oraclePrice > 0
                  ? `$${oraclePrice.toLocaleString(undefined, { minimumFractionDigits: selectedMarket.priceScale >= 100 ? 2 : 4, maximumFractionDigits: selectedMarket.priceScale >= 100 ? 2 : 4 })}`
                  : '—'}
              </p>
            )}
          </SpotlightCard>
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Total Trades</p>
            {loading ? <LoadingSkeleton className="h-6 w-16 mt-1" /> : (
              <p className="text-xl font-headline text-text-primary mt-1">{totalTrades}</p>
            )}
          </SpotlightCard>
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Fee</p>
            {loading ? <LoadingSkeleton className="h-6 w-16 mt-1" /> : (
              <p className="text-xl font-headline text-text-primary mt-1">{(feeBps / 100).toFixed(2)}%</p>
            )}
          </SpotlightCard>
        </div>
      </FadeInView>

      {/* Pool Liquidity & Batch Status */}
      <FadeInView delay={0.15}>
        <SpotlightCard className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-text-muted text-[10px] font-label uppercase tracking-wider">Fee Vault</p>
                <p className="text-sm font-headline text-accent-success">{(poolBalance.aleo / PRECISION).toFixed(4)}</p>
              </div>
              <div className="h-6 w-px bg-white/[0.06]" />
              <div>
                <p className="text-text-muted text-[10px] font-label uppercase tracking-wider">Volume</p>
                <p className="text-sm font-headline text-primary">{(poolBalance.usdcx / PRECISION).toFixed(2)}</p>
              </div>
              <div className="h-6 w-px bg-white/[0.06]" />
              <div>
                <p className="text-text-muted text-[10px] font-label uppercase tracking-wider">Approval</p>
                <p className="text-sm font-headline text-text-primary">{batchData?.approvalCount ?? 0}/2</p>
              </div>
              <div className="h-6 w-px bg-white/[0.06]" />
              <div>
                <p className="text-text-muted text-[10px] font-label uppercase tracking-wider">Batch #{batchData?.currentBatch ?? '—'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${batchStatusConfig[batchState].color}`} />
                  <span className={`text-xs ${batchStatusConfig[batchState].textColor}`}>
                    {batchStatusConfig[batchState].text}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {batchState === 'collecting' && (
            <p className="text-text-muted text-[10px] mt-2 border-t border-white/[0.04] pt-2">
              The batch is open for orders. Submit buy or sell orders with optional limit prices. Once sufficient volume accumulates, operators propose a TWAP settlement price for 2-of-3 approval.
            </p>
          )}
          {batchState === 'proposed' && (
            <p className="text-text-muted text-[10px] mt-2 border-t border-white/[0.04] pt-2">
              A settlement price has been proposed. Waiting for threshold operator approval (2-of-3). Once approved, the operator will execute order matches automatically.
            </p>
          )}
          {batchState === 'approved' && (
            <p className="text-text-muted text-[10px] mt-2 border-t border-white/[0.04] pt-2">
              Batch approved! The operator is executing matches. Matching pairs receive private FillReceipt records. Unmatched residuals carry forward.
            </p>
          )}
        </SpotlightCard>
      </FadeInView>

      {/* Test Token Faucet */}
      {wallet.connected && (
        <FadeInView delay={0.18}>
          <SpotlightCard className="p-6 border border-accent-success/20">
            <h3 className="font-headline text-lg text-accent-success mb-2">Test Token Faucet</h3>
            <p className="text-text-muted text-xs mb-4">
              Claim free test tokens to trade on the dark pool. 10 tokens per claim, up to 5 claims per token per day.
            </p>
            <div className="flex gap-3">
              {(['BTC', 'ETH', 'SOL'] as const).map((token) => (
                <button
                  key={token}
                  onClick={() => handleFaucetClaim(token)}
                  disabled={faucetLoading !== null || (faucetStatus[token] ?? 0) <= 0}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-label text-xs uppercase tracking-wider transition-all bg-white/[0.04] text-text-secondary border border-white/[0.08] hover:bg-accent-success/10 hover:text-accent-success hover:border-accent-success/30 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <TokenIcon token={token} size={16} />
                  {faucetLoading === token ? 'Sending...' : `Claim 10 ${token}`}
                </button>
              ))}
            </div>
            <p className="text-text-muted text-[10px] mt-2">
              Daily remaining: BTC ({faucetStatus.BTC ?? 0}/5) · ETH ({faucetStatus.ETH ?? 0}/5) · SOL ({faucetStatus.SOL ?? 0}/5)
            </p>
          </SpotlightCard>
        </FadeInView>
      )}

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
              <span className="flex items-center justify-center gap-1.5"><TokenIcon token={selectedMarket.baseAsset as any} size={14} /> Buy {selectedMarket.baseAsset}</span>
            </button>
            <button
              onClick={() => setTab('sell')}
              className={`flex-1 py-2.5 rounded-lg font-label text-xs uppercase tracking-wider transition-all ${
                tab === 'sell' ? 'bg-accent-warning/20 text-accent-warning border border-accent-warning/30' : 'bg-white/[0.03] text-text-muted hover:text-text-secondary'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5"><TokenIcon token={selectedMarket.baseAsset as any} size={14} /> Sell {selectedMarket.baseAsset}</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-text-muted text-xs font-label uppercase tracking-wider">
                  {tab === 'buy' ? 'USDCx Amount' : `${selectedMarket.baseAsset} Amount`}
                </label>
                <span className="text-text-muted text-xs">
                  {tab === 'buy'
                    ? `Balance: ${parsedUsdcx.length > 0 ? (parsedUsdcx.reduce((s, r) => s + r.amount, 0) / PRECISION).toFixed(2) : '0.00'} USDCx (${parsedUsdcx.length} records)`
                    : (() => {
                        const recs = getSellRecords();
                        const total = recs.reduce((s, r) => s + r.amount, 0);
                        return `Balance: ${recs.length > 0 ? (total / PRECISION).toFixed(6) : '0.000000'} ${selectedMarket.baseAsset} (${recs.length} records)`;
                      })()
                  }
                </span>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={tab === 'buy' ? 'Amount of USDCx to spend' : `Amount of ${selectedMarket.baseAsset} to sell`}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-primary/30 transition-colors"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-text-muted text-xs font-label uppercase tracking-wider">
                  Limit Price (optional)
                </label>
                <span className="text-text-muted text-xs">
                  {realPrice > 0
                    ? `Market: $${realPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: selectedMarket.priceScale >= 100 ? 2 : 4 })}`
                    : `Oracle: $${oraclePrice > 0 ? oraclePrice.toFixed(4) : '—'}`}
                </span>
              </div>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="Leave empty for market order (no limit)"
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-primary/30 transition-colors"
              />
            </div>

            <div className="bg-white/[0.02] rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-xs text-text-muted">
                <span>Batch</span>
                <span>#{batchData?.currentBatch ?? '—'}</span>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Settlement</span>
                <span>TWAP-validated oracle price (2-of-3 threshold)</span>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Fee</span>
                <span>{(feeBps / 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Privacy</span>
                <span className="text-accent-success">Fully encrypted ZK order</span>
              </div>
            </div>

            {/* Transaction Flow */}
            {transactionPending && activeAction === 'submit' && (
              <div className="mb-2">
                <TransactionFlow currentStep={transactionStep} txId={transactionId} />
              </div>
            )}

            <button
              onClick={handleSubmitOrder}
              disabled={!wallet.connected || !amount || transactionPending}
              className="w-full py-3 rounded-lg font-label text-sm uppercase tracking-wider transition-all bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {transactionPending ? 'Processing...' : !wallet.connected ? 'Connect Wallet' : `Submit ${tab === 'buy' ? 'Buy' : 'Sell'} ${selectedMarket.baseAsset} Order`}
            </button>

            {transactionStep === 'confirmed' && activeAction === 'submit' && (
              <button
                onClick={() => { resetTransaction(); setActiveAction(null); }}
                className="w-full mt-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                New Order
              </button>
            )}
          </div>
        </SpotlightCard>
      </FadeInView>

      {/* Your Active Orders */}
      {commitments.length > 0 && (
        <FadeInView delay={0.25}>
          <SpotlightCard className="p-6">
            <h3 className="font-headline text-lg text-text-primary mb-4">Your Active Orders</h3>
            <div className="space-y-3">
              {commitments.map((order, i) => {
                const isBuy = order.direction === 0;
                const status = getOrderStatus(order);
                return (
                  <div key={i} className="bg-white/[0.02] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-label uppercase tracking-wider px-2 py-0.5 rounded ${isBuy ? 'bg-accent-success/10 text-accent-success' : 'bg-accent-warning/10 text-accent-warning'}`}>
                          {isBuy ? 'BUY' : 'SELL'}
                        </span>
                        <span className="text-text-primary text-sm font-medium">
                          {(order.size / PRECISION).toFixed(isBuy ? 2 : 6)} {isBuy ? 'USDCx' : selectedMarket.baseAsset}
                        </span>
                        {order.limitPrice > 0 && (
                          <span className="text-text-muted text-xs">@ ${(order.limitPrice / PRECISION).toFixed(4)}</span>
                        )}
                        <span className="text-text-muted text-xs">Batch #{order.batchId}</span>
                      </div>
                      <div className="flex gap-2">
                        {status.canCancel && (
                          <button
                            onClick={() => handleCancelOrder(order)}
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

      {/* Fill Receipts */}
      {fills.length > 0 && (
        <FadeInView delay={0.25}>
          <SpotlightCard className="p-6">
            <h3 className="font-headline text-lg text-text-primary mb-4">Fill Receipts</h3>
            <div className="space-y-3">
              {fills.map((fill, i) => {
                const isBuy = fill.direction === 0;
                return (
                  <div key={i} className="bg-white/[0.02] rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-label uppercase tracking-wider px-2 py-0.5 rounded ${isBuy ? 'bg-accent-success/10 text-accent-success' : 'bg-accent-warning/10 text-accent-warning'}`}>
                        {isBuy ? 'BUY FILL' : 'SELL FILL'}
                      </span>
                      <span className="text-text-primary text-sm font-medium">
                        {(fill.size / PRECISION).toFixed(isBuy ? 6 : 2)} {isBuy ? selectedMarket.baseAsset : 'USDCx'}
                      </span>
                      <span className="text-text-muted text-xs">Batch #{fill.batchId}</span>
                      <span className="text-accent-success text-[11px]">Filled</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </SpotlightCard>
        </FadeInView>
      )}

      {/* Residual Orders */}
      {residuals.length > 0 && (
        <FadeInView delay={0.25}>
          <SpotlightCard className="p-6">
            <h3 className="font-headline text-lg text-accent-warning mb-4">Residual Orders</h3>
            <p className="text-text-muted text-xs mb-3">Partially filled orders that can be resubmitted to the next batch.</p>
            <div className="space-y-3">
              {residuals.map((residual, i) => {
                const isBuy = residual.direction === 0;
                return (
                  <div key={i} className="bg-white/[0.02] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-label uppercase tracking-wider px-2 py-0.5 rounded ${isBuy ? 'bg-accent-success/10 text-accent-success' : 'bg-accent-warning/10 text-accent-warning'}`}>
                          {isBuy ? 'BUY' : 'SELL'} RESIDUAL
                        </span>
                        <span className="text-text-primary text-sm font-medium">
                          {(residual.size / PRECISION).toFixed(isBuy ? 2 : 6)} {isBuy ? 'USDCx' : selectedMarket.baseAsset}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SpotlightCard>
        </FadeInView>
      )}

      {/* Cancel Transaction Flow */}
      {activeAction === 'cancel' && (transactionPending || transactionStep === 'confirmed') && (
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
              <h4 className="text-text-primary text-sm font-medium mb-1">Submit Order</h4>
              <p className="text-text-muted text-xs">Choose Buy {selectedMarket.baseAsset} (pay with USDCx) or Sell {selectedMarket.baseAsset} (receive USDCx). Set an optional limit price. Your order is encrypted in a ZK record — no one can see your size, price or identity.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">2</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Batch Collection</h4>
              <p className="text-text-muted text-xs">Orders accumulate in the current batch. The oracle continually pushes TWAP-validated prices on-chain. Once sufficient volume exists, an operator proposes the settlement price.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">3</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Threshold Approval</h4>
              <p className="text-text-muted text-xs">Settlement requires <strong className="text-text-secondary">2-of-3 threshold operators</strong> to approve the proposed price. This prevents single-operator manipulation and ensures fair pricing.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">4</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Auto-Matching</h4>
              <p className="text-text-muted text-xs">Once approved, the operator executes matches automatically. Full matches produce FillReceipt records. Partial fills produce ResidualOrder records that carry into the next batch.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">5</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Cancel Anytime</h4>
              <p className="text-text-muted text-xs">Before the batch is approved, cancel your order anytime to get your full tokens back. After approval, your order is matched by the operator and you receive your fill privately.</p>
            </div>
          </div>
        </SpotlightCard>
      </FadeInView>

      {/* Total Volume */}
      <FadeInView delay={0.4}>
        <div className="text-center text-text-muted text-xs">
          {selectedMarket.label} Volume: <span className="text-primary">${totalVolume.toFixed(2)}</span> &middot; Program: <span className="text-text-secondary font-mono text-[10px]">{activeProgramId}</span>
        </div>
      </FadeInView>

      {/* Admin: Fund Dark Pool */}
      {isAdmin && (
        <FadeInView delay={0.5}>
          <SpotlightCard className="p-6 border border-primary/20">
            <h3 className="font-headline text-lg text-primary mb-4">Admin — Fund Dark Pool</h3>
            <p className="text-text-muted text-xs mb-4">
              Transfer ALEO or USDCx to the dark pool's on-chain balance. The pool must hold liquidity for operator-executed matches.
            </p>

            {/* Pool Balance Display */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/[0.02] rounded-lg p-3">
                <p className="text-text-muted text-xs font-label uppercase tracking-wider">Fee Vault Balance</p>
                <p className="text-lg font-headline text-accent-success mt-1">{(poolBalance.aleo / PRECISION).toFixed(6)}</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-3">
                <p className="text-text-muted text-xs font-label uppercase tracking-wider">Total Volume</p>
                <p className="text-lg font-headline text-primary mt-1">{(poolBalance.usdcx / PRECISION).toFixed(2)}</p>
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
            <p className="text-text-muted text-[10px] mt-2 font-mono break-all">Program: {activeProgramId}</p>
          </SpotlightCard>
        </FadeInView>
      )}
    </div>
  );
}
