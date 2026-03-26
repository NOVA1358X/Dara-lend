import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTransaction } from '@/hooks/useTransaction';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import { useVaultStats } from '@/hooks/useVaultStats';
import { useAppStore } from '@/stores/appStore';
import { TransactionFlow } from '@/components/shared/TransactionFlow';
import { StatCard } from '@/components/shared/StatCard';
import { TokenIcon } from '@/components/shared/TokenIcon';
import { LinkIcon } from '@/components/icons/LinkIcon';
import { formatCredits } from '@/utils/formatting';
import { PRECISION, VAULT_PROGRAM_ID } from '@/utils/constants';
import toast from 'react-hot-toast';

type PoolToken = 'USDCx' | 'USAD';
type Tab = 'deposit' | 'withdraw';

interface YieldVaultProps {
  wallet: {
    requestRecords?: (program: string) => Promise<unknown[]>;
    requestTransaction?: (transaction: any) => Promise<{ transactionId: string } | undefined>;
    transactionStatus?: (txId: string) => Promise<{ status: string }>;
    decrypt?: (cipherText: string) => Promise<string>;
    connected: boolean;
    address?: string | null;
  };
}

interface ParsedTokenRecord {
  amount: number;
  plaintext: string;
}

interface ParsedPoolShareRecord {
  shareAmount: number;
  tokenType: number;
  plaintext: string;
}

function parseStablecoinRecord(raw: Record<string, unknown>): ParsedTokenRecord | null {
  const plaintext = (raw.recordPlaintext ?? raw.plaintext ?? raw.data ?? '') as string;
  if (!plaintext) return null;
  const str = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
  const match = str.match(/amount\s*:\s*(\d+)u128/);
  if (!match) return null;
  const amount = parseInt(match[1], 10);
  if (isNaN(amount) || amount <= 0) return null;
  return { amount, plaintext: str };
}

function parsePoolShareRecord(raw: Record<string, unknown>): ParsedPoolShareRecord | null {
  const plaintext = (raw.recordPlaintext ?? raw.plaintext ?? raw.data ?? '') as string;
  if (!plaintext) return null;
  const str = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
  const shareMatch = str.match(/share_amount\s*:\s*(\d+)u128/);
  const typeMatch = str.match(/token_type\s*:\s*(\d+)u8/);
  if (!shareMatch) return null;
  const shareAmount = parseInt(shareMatch[1], 10);
  const tokenType = typeMatch ? parseInt(typeMatch[1], 10) : 0;
  if (isNaN(shareAmount) || shareAmount <= 0) return null;
  return { shareAmount, tokenType, plaintext: str };
}

export function YieldVault({ wallet }: YieldVaultProps) {
  const [tab, setTab] = useState<Tab>('deposit');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<PoolToken>('USDCx');
  const [selectedRecordIdx, setSelectedRecordIdx] = useState(0);
  const [selectedShareIdx, setSelectedShareIdx] = useState(0);
  const [tokenRecords, setTokenRecords] = useState<ParsedTokenRecord[]>([]);
  const [poolShareRecords, setPoolShareRecords] = useState<ParsedPoolShareRecord[]>([]);

  const { transactionStep, transactionId, transactionPending } = useAppStore();
  const { provideUsdcxCapital, provideUsadCapital, redeemUsdcxCapital, redeemUsadCapital, resetTransaction } = useTransaction(wallet);
  const { data: vaultStats, isLoading } = useVaultStats();
  const { usdcxRecords, usadRecords, refetch } = useWalletRecords(wallet);

  // Parse token records for the selected token type
  useEffect(() => {
    const rawRecords = selectedToken === 'USDCx' ? (usdcxRecords || []) : (usadRecords || []);
    const parsed: ParsedTokenRecord[] = [];
    for (const r of rawRecords) {
      const raw = r as Record<string, unknown>;
      if (raw.spent === true) continue;
      const record = parseStablecoinRecord(raw);
      if (record) parsed.push(record);
    }
    parsed.sort((a, b) => b.amount - a.amount);
    setTokenRecords(parsed);
    setSelectedRecordIdx(0);
  }, [usdcxRecords, usadRecords, selectedToken]);

  // Fetch PoolShare records from vault program
  useEffect(() => {
    const requestRecords = wallet.requestRecords;
    if (!wallet.connected || !requestRecords) {
      setPoolShareRecords([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rawRecords = await requestRecords(VAULT_PROGRAM_ID);
        if (cancelled) return;
        const parsed: ParsedPoolShareRecord[] = [];
        for (const r of rawRecords) {
          const raw = r as Record<string, unknown>;
          if (raw.spent === true) continue;
          // Try to decrypt if needed
          let record = parsePoolShareRecord(raw);
          if (!record && wallet.decrypt) {
            const cipher = raw.recordCiphertext as string | undefined;
            if (cipher) {
              try {
                const plaintext = await wallet.decrypt(cipher);
                raw.recordPlaintext = plaintext;
                record = parsePoolShareRecord(raw);
              } catch { /* skip */ }
            }
          }
          if (record) parsed.push(record);
        }
        // Filter by selected token (0u8=USDCx, 1u8=USAD)
        const targetType = selectedToken === 'USDCx' ? 0 : 1;
        const filtered = parsed.filter(r => r.tokenType === targetType);
        filtered.sort((a, b) => b.shareAmount - a.shareAmount);
        setPoolShareRecords(filtered);
        setSelectedShareIdx(0);
      } catch {
        if (!cancelled) setPoolShareRecords([]);
      }
    })();
    return () => { cancelled = true; };
  }, [wallet.connected, wallet.requestRecords, wallet.decrypt, selectedToken]);

  const selectedRecord = tokenRecords[selectedRecordIdx];
  const selectedShare = poolShareRecords[selectedShareIdx];

  const handleDeposit = useCallback(async () => {
    if (!wallet.connected) {
      toast.error('Connect wallet first');
      return;
    }
    if (!selectedRecord) {
      toast.error(`No private ${selectedToken} records found. You need a private token record.`);
      return;
    }
    const amountMicro = Math.floor(parseFloat(amount) * PRECISION);
    if (isNaN(amountMicro) || amountMicro <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amountMicro < 100_000) {
      toast.error('Minimum deposit is 0.1 token');
      return;
    }
    if (amountMicro > selectedRecord.amount) {
      toast.error('Amount exceeds selected record balance');
      return;
    }
    const randomBytes = new Uint8Array(6);
    crypto.getRandomValues(randomBytes);
    const nonce = Array.from(randomBytes).reduce((acc, b) => acc * 256 + b, 0);
    if (selectedToken === 'USDCx') {
      await provideUsdcxCapital(selectedRecord.plaintext, amountMicro, nonce);
    } else {
      await provideUsadCapital(selectedRecord.plaintext, amountMicro, nonce);
    }
    setAmount('');
    refetch();
  }, [wallet.connected, amount, selectedToken, selectedRecord, provideUsdcxCapital, provideUsadCapital, refetch]);

  const handleRedeem = useCallback(async () => {
    if (!wallet.connected) {
      toast.error('Connect wallet first');
      return;
    }
    if (!selectedShare) {
      toast.error('No PoolShare records found');
      return;
    }
    if (selectedToken === 'USDCx') {
      await redeemUsdcxCapital(selectedShare.plaintext);
    } else {
      await redeemUsadCapital(selectedShare.plaintext);
    }
    refetch();
  }, [wallet.connected, selectedShare, selectedToken, redeemUsdcxCapital, redeemUsadCapital, refetch]);

  const poolTvl = selectedToken === 'USDCx'
    ? (vaultStats?.poolTotalUsdcx ?? 0)
    : (vaultStats?.poolTotalUsad ?? 0);
  const poolShares = selectedToken === 'USDCx'
    ? (vaultStats?.poolSharesUsdcx ?? 0)
    : (vaultStats?.poolSharesUsad ?? 0);
  const yieldAccumulated = selectedToken === 'USDCx'
    ? (vaultStats?.yieldAccumulatedUsdcx ?? 0)
    : (vaultStats?.yieldAccumulatedUsad ?? 0);
  const sharePrice = selectedToken === 'USDCx'
    ? (vaultStats?.sharePriceUsdcx ?? 1)
    : (vaultStats?.sharePriceUsad ?? 1);
  const depositCount = selectedToken === 'USDCx'
    ? (vaultStats?.depositCountUsdcx ?? 0)
    : (vaultStats?.depositCountUsad ?? 0);

  if (transactionPending) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <LinkIcon size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-headline text-2xl text-text-primary">
              {tab === 'deposit' ? 'Depositing to Yield Pool' : 'Redeeming from Yield Pool'}
            </h1>
          </div>
        </div>
        <TransactionFlow currentStep={transactionStep} txId={transactionId} />
        {(transactionStep === 'confirmed' || transactionStep === 'failed') && (
          <button onClick={resetTransaction} className="mt-4 px-6 py-2 rounded-lg bg-white/[0.06] text-text-secondary hover:text-text-primary text-sm transition-colors">Back</button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <LinkIcon size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-headline text-2xl text-text-primary">Yield Vault</h1>
          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-text-muted">
            Earn yield by providing liquidity
          </p>
        </div>
      </div>

      {/* Pool Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      >
        <h2 className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] mb-4">
          Pool Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label={`${selectedToken} Pool TVL`}
            value={`$${formatCredits(poolTvl)}`}
            loading={isLoading}
          />
          <StatCard
            label="Total Shares"
            value={formatCredits(poolShares)}
            loading={isLoading}
          />
          <StatCard
            label="Share Price"
            value={`${sharePrice.toFixed(4)}`}
            loading={isLoading}
          />
          <StatCard
            label="Yield Accumulated"
            value={`$${formatCredits(yieldAccumulated)}`}
            loading={isLoading}
          />
        </div>
      </motion.div>

      {/* Deposit / Withdraw Toggle + Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 20 }}
        className="rounded-xl glass-panel p-6"
      >
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('deposit')}
            className={`px-4 py-2 rounded-lg font-label text-xs uppercase tracking-[0.12em] transition-all ${
              tab === 'deposit'
                ? 'bg-primary/20 text-primary'
                : 'bg-white/[0.03] text-text-muted hover:text-text-secondary'
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => setTab('withdraw')}
            className={`px-4 py-2 rounded-lg font-label text-xs uppercase tracking-[0.12em] transition-all ${
              tab === 'withdraw'
                ? 'bg-primary/20 text-primary'
                : 'bg-white/[0.03] text-text-muted hover:text-text-secondary'
            }`}
          >
            Withdraw
          </button>
        </div>

        {/* Token Selector */}
        <div className="mb-4">
          <label className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-2">
            Token
          </label>
          <div className="flex gap-2">
            {(['USDCx', 'USAD'] as PoolToken[]).map((token) => (
              <button
                key={token}
                onClick={() => setSelectedToken(token)}
                className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                  selectedToken === token
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-white/[0.06] bg-white/[0.03] text-text-muted hover:text-text-secondary'
                }`}
              >
                {token}
              </button>
            ))}
          </div>
        </div>

        {tab === 'deposit' ? (
          <div className="space-y-4">
            {/* Record Selector */}
            {tokenRecords.length > 0 ? (
              <div>
                <label className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-2">
                  Private {selectedToken} Record
                </label>
                <div className="space-y-2">
                  {tokenRecords.map((rec, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedRecordIdx(idx)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-sm ${
                        selectedRecordIdx === idx
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-white/[0.06] bg-white/[0.03] text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <TokenIcon token={selectedToken} size={18} />
                        <span className="font-mono">{formatCredits(rec.amount)} {selectedToken}</span>
                      </div>
                      {selectedRecordIdx === idx && (
                        <span className="text-[10px] font-label uppercase tracking-wider text-primary">Selected</span>
                      )}
                    </button>
                  ))}
                </div>
                <span className="mt-1.5 block text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-full w-fit">PRIVATE RECORD</span>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] text-center">
                <p className="text-sm text-text-muted">
                  No private {selectedToken} records found. You need a private token record to deposit.
                </p>
              </div>
            )}

            <div>
              <label className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-2">
                Amount ({selectedToken})
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Min 0.1"
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary font-mono text-lg placeholder-text-muted focus:border-primary/40 focus:outline-none transition-colors"
                />
                {selectedRecord && (
                  <button
                    onClick={() => setAmount((selectedRecord.amount / PRECISION).toFixed(6))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[10px] font-label uppercase bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    Max
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white/[0.02] text-xs text-text-muted space-y-1">
              <div className="flex justify-between">
                <span>You receive</span>
                <span className="text-text-secondary">
                  ~{amount ? (parseFloat(amount) / sharePrice).toFixed(4) : '0'} shares
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pool deposits</span>
                <span className="text-text-secondary">{depositCount}</span>
              </div>
            </div>

            <button
              onClick={handleDeposit}
              disabled={!wallet.connected || !amount || !selectedRecord}
              className="w-full py-3 rounded-lg font-label text-sm uppercase tracking-[0.12em] transition-all bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {!wallet.connected ? 'Connect Wallet' : !selectedRecord ? 'No Records Available' : `Deposit ${selectedToken}`}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* PoolShare Record Selector */}
            {poolShareRecords.length > 0 ? (
              <div>
                <label className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-2">
                  Your PoolShare Records ({selectedToken})
                </label>
                <div className="space-y-2">
                  {poolShareRecords.map((share, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedShareIdx(idx)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-sm ${
                        selectedShareIdx === idx
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-white/[0.06] bg-white/[0.03] text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <TokenIcon token={selectedToken} size={18} />
                        <span className="font-mono">{formatCredits(share.shareAmount)} shares</span>
                      </div>
                      <span className="text-xs text-text-muted">
                        ~${formatCredits(Math.round(share.shareAmount * sharePrice))} {selectedToken}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] text-center">
                <p className="text-sm text-text-muted">
                  No {selectedToken} PoolShare records found. Deposit first to get shares.
                </p>
              </div>
            )}

            <div className="p-3 rounded-lg bg-white/[0.02] text-xs text-text-muted">
              <p>Redeem your PoolShare record to receive your deposit + yield. A 0.1% withdrawal fee applies.</p>
            </div>

            <button
              onClick={handleRedeem}
              disabled={!wallet.connected || !selectedShare}
              className="w-full py-3 rounded-lg font-label text-sm uppercase tracking-[0.12em] transition-all bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {!wallet.connected ? 'Connect Wallet' : !selectedShare ? 'No Shares to Redeem' : `Redeem ${selectedToken}`}
            </button>
          </div>
        )}
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 20 }}
        className="rounded-xl glass-panel p-6"
      >
        <h3 className="font-headline text-base text-text-primary mb-3">How Yield Vault Works</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <span className="material-symbols-outlined text-primary text-lg mb-1 block">savings</span>
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-primary mb-1">1. Deposit</p>
            <p className="text-[11px] text-text-muted">Deposit USDCx or USAD to the yield pool and receive PoolShare records as proof.</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <span className="material-symbols-outlined text-primary text-lg mb-1 block">trending_up</span>
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-primary mb-1">2. Earn Yield</p>
            <p className="text-[11px] text-text-muted">Protocol fees and interest are distributed to the pool, increasing the share price over time.</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <span className="material-symbols-outlined text-primary text-lg mb-1 block">account_balance_wallet</span>
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-primary mb-1">3. Redeem</p>
            <p className="text-[11px] text-text-muted">Redeem your PoolShare record to receive your deposit plus accumulated yield (0.1% fee).</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
