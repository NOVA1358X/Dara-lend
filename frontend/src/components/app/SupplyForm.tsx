import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTransaction } from '@/hooks/useTransaction';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import { useAppStore } from '@/stores/appStore';
import { TransactionFlow } from '@/components/shared/TransactionFlow';
import { LockIcon } from '@/components/icons/LockIcon';
import { ShieldIcon } from '@/components/icons/ShieldIcon';
import { TokenIcon } from '@/components/shared/TokenIcon';
import { formatCredits } from '@/utils/formatting';
import { ALEO_TESTNET_API, USDCX_PROGRAM, USAD_PROGRAM, TOKEN_TYPES } from '@/utils/constants';
import toast from 'react-hot-toast';

type TokenType = 'ALEO' | 'USDCx' | 'USAD';

interface SupplyFormProps {
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
  raw: Record<string, unknown>;
}

/** Parse a credits.aleo record (microcredits: u64) */
function parseCreditsRecord(raw: Record<string, unknown>): ParsedTokenRecord | null {
  const plaintext = (raw.recordPlaintext ?? raw.plaintext ?? raw.data ?? '') as string;
  if (!plaintext) return null;
  const str = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
  const match = str.match(/microcredits\s*:\s*(\d+)u64/);
  if (!match) return null;
  const amount = parseInt(match[1], 10);
  if (isNaN(amount) || amount <= 0) return null;
  return { amount, plaintext: str, raw };
}

/** Parse a stablecoin token record (amount: u128) */
function parseStablecoinRecord(raw: Record<string, unknown>): ParsedTokenRecord | null {
  const plaintext = (raw.recordPlaintext ?? raw.plaintext ?? raw.data ?? '') as string;
  if (!plaintext) return null;
  const str = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
  const match = str.match(/amount\s*:\s*(\d+)u128/);
  if (!match) return null;
  const amount = parseInt(match[1], 10);
  if (isNaN(amount) || amount <= 0) return null;
  return { amount, plaintext: str, raw };
}

export function SupplyForm({ wallet }: SupplyFormProps) {
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenType>('ALEO');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [privateRecords, setPrivateRecords] = useState<ParsedTokenRecord[]>([]);
  const [selectedRecordIdx, setSelectedRecordIdx] = useState(0);
  const [convertStep, setConvertStep] = useState(false);

  const { transactionStep, transactionId, transactionPending } = useAppStore();
  const { supplyCollateral, supplyUsdcxCollateral, supplyUsadCollateral, convertCreditsToPrivate, resetTransaction } = useTransaction(wallet);
  const { creditsRecords, usdcxRecords, usadRecords, refetch } = useWalletRecords(wallet);

  // Parse private records based on selected token
  useEffect(() => {
    let rawRecords: unknown[] = [];
    let parseFn: (raw: Record<string, unknown>) => ParsedTokenRecord | null;

    if (selectedToken === 'ALEO') {
      rawRecords = creditsRecords || [];
      parseFn = parseCreditsRecord;
    } else if (selectedToken === 'USDCx') {
      rawRecords = usdcxRecords || [];
      parseFn = parseStablecoinRecord;
    } else {
      rawRecords = usadRecords || [];
      parseFn = parseStablecoinRecord;
    }

    const parsed: ParsedTokenRecord[] = [];
    for (const r of rawRecords) {
      const raw = r as Record<string, unknown>;
      if (raw.spent === true) continue;
      const record = parseFn(raw);
      if (record) parsed.push(record);
    }
    parsed.sort((a, b) => b.amount - a.amount);
    setPrivateRecords(parsed);
    setSelectedRecordIdx(0);
  }, [creditsRecords, usdcxRecords, usadRecords, selectedToken]);

  // Fetch public balance for the selected token
  const fetchPublicBalance = useCallback(async () => {
    if (!wallet.connected || !wallet.address) return;
    try {
      let url: string;
      if (selectedToken === 'ALEO') {
        url = `${ALEO_TESTNET_API}/program/credits.aleo/mapping/account/${wallet.address}`;
      } else if (selectedToken === 'USDCx') {
        url = `${ALEO_TESTNET_API}/program/${USDCX_PROGRAM}/mapping/balances/${wallet.address}`;
      } else {
        url = `${ALEO_TESTNET_API}/program/${USAD_PROGRAM}/mapping/balances/${wallet.address}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        setWalletBalance(0);
        return;
      }
      const text = await response.text();
      if (!text || text === 'null' || text === '') {
        setWalletBalance(0);
        return;
      }
      const cleaned = text.replace(/"/g, '').replace(/u(64|128)/, '').trim();
      const val = parseInt(cleaned, 10);
      setWalletBalance(isNaN(val) ? 0 : val);
    } catch {
      setWalletBalance(null);
    }
  }, [wallet.connected, wallet.address, selectedToken]);

  useEffect(() => {
    fetchPublicBalance();
  }, [fetchPublicBalance]);

  const selectedRecord = privateRecords[selectedRecordIdx];
  const totalPrivateBalance = privateRecords.reduce((sum, r) => sum + r.amount, 0);
  const amountInMicrocredits = Math.floor(parseFloat(amount || '0') * 1_000_000);
  const isValidAmount = amountInMicrocredits >= 100_000;
  const hasPrivateRecords = privateRecords.length > 0;
  const selectedRecordHasEnough = selectedRecord && selectedRecord.amount >= amountInMicrocredits;

  const handleMax = () => {
    if (selectedRecord) {
      setAmount((selectedRecord.amount / 1_000_000).toFixed(6));
    } else if (walletBalance) {
      setAmount((walletBalance / 1_000_000).toFixed(6));
    }
  };

  const handleConvertToPrivate = async () => {
    if (!walletBalance || walletBalance <= 0) {
      toast.error('No public credits to convert');
      return;
    }
    // Convert the amount user wants to supply (or full balance)
    const convertAmount = amountInMicrocredits > 0 ? amountInMicrocredits : walletBalance;
    setConvertStep(true);
    try {
      const txId = await convertCreditsToPrivate(convertAmount);
      if (txId) {
        toast.success('Credits converted! They will appear as private records shortly.');
        setTimeout(() => refetch(), 3000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Conversion failed';
      toast.error(message);
    }
    setConvertStep(false);
  };

  const handleSubmit = async () => {
    if (!isValidAmount) {
      toast.error(`Minimum supply is 0.1 ${selectedToken}`);
      return;
    }
    if (!hasPrivateRecords || !selectedRecord) {
      toast.error(`You need private ${selectedToken} token records.`);
      return;
    }
    if (!selectedRecordHasEnough) {
      toast.error('Selected record does not have enough balance');
      return;
    }

    // Generate cryptographically secure nonce
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    const nonce = Array.from(randomBytes).reduce((acc, b) => acc * 256 + b, 0);

    try {
      let txId: string | null = null;
      if (selectedToken === 'ALEO') {
        txId = await supplyCollateral(selectedRecord.plaintext, amountInMicrocredits, nonce);
      } else if (selectedToken === 'USDCx') {
        txId = await supplyUsdcxCollateral(selectedRecord.plaintext, amountInMicrocredits, nonce);
      } else {
        txId = await supplyUsadCollateral(selectedRecord.plaintext, amountInMicrocredits, nonce);
      }
      if (txId) {
        fetchPublicBalance();
        refetch();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to supply collateral';
      toast.error(message);
    }
  };

  return (
    <div className="max-w-[480px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="rounded-xl glass-panel p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <LockIcon size={16} className="text-primary" />
          </div>
          <div>
            <h2 className="font-headline text-lg text-text-primary">
              Supply Collateral
            </h2>
            <p className="text-xs text-text-secondary">
              Lock assets as encrypted collateral
            </p>
          </div>
        </div>

        {/* Asset Selector */}
        <div className="mb-4">
          <label className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] block mb-2">
            Asset
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['ALEO', 'USDCx', 'USAD'] as TokenType[]).map((token) => (
              <button
                key={token}
                onClick={() => setSelectedToken(token)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  selectedToken === token
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-white/[0.03] border-white/[0.06] text-text-secondary hover:text-text-primary'
                }`}
              >
                <TokenIcon token={token} size={18} />
                {token}
              </button>
            ))}
          </div>
          <span className="mt-1.5 block text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-full w-fit">PRIVATE</span>
        </div>

        {/* Private Record Selector */}
        {hasPrivateRecords && privateRecords.length > 1 && (
          <div className="mb-4">
            <label className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] block mb-2">
              Select Private Record
            </label>
            <select
              value={selectedRecordIdx}
              onChange={(e) => setSelectedRecordIdx(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-text-primary text-sm focus:outline-none focus:border-primary/30"
            >
              {privateRecords.map((r, i) => (
                <option key={i} value={i}>
                  Record #{i + 1} — {formatCredits(r.amount)} {selectedToken}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Convert to Private — shown for ALEO when no private records */}
        {selectedToken === 'ALEO' && !hasPrivateRecords && (walletBalance ?? 0) > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-accent-warning/5 border border-accent-warning/20">
            <p className="text-xs text-text-secondary mb-2">
              Your credits are in public balance. Convert to private records first for privacy-preserving supply.
            </p>
            <button
              onClick={handleConvertToPrivate}
              disabled={transactionPending || convertStep}
              className="w-full py-2 rounded-lg bg-accent-warning/20 text-accent-warning text-sm font-medium hover:bg-accent-warning/30 transition-colors disabled:opacity-40"
            >
              {convertStep ? 'Converting...' : 'Convert Credits to Private'}
            </button>
          </div>
        )}

        {/* Amount Input */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em]">
              Amount
            </label>
            <button
              onClick={handleMax}
              className="text-[11px] font-label uppercase tracking-[0.1em] text-primary hover:text-secondary transition-colors"
            >
              MAX
            </button>
          </div>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0.1"
              step="0.01"
              className="w-full px-4 py-4 rounded-lg bg-white/[0.03] border border-white/[0.06] text-text-primary font-mono text-xl tabular-nums placeholder:text-text-muted focus:outline-none focus:border-primary/30 transition-colors"
              aria-label="Supply amount in ALEO"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-muted">
              {selectedToken}
            </span>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-text-muted">Min: 0.1 {selectedToken}</span>
            <div className="text-right">
              {hasPrivateRecords && (
                <span className="text-xs text-primary block">
                  Private: {formatCredits(totalPrivateBalance)} {selectedToken}
                </span>
              )}
              <span className="text-xs text-text-secondary">
                Public: {walletBalance !== null ? formatCredits(walletBalance) : '—'} {selectedToken}
              </span>
            </div>
          </div>
        </div>

        {/* Privacy Info */}
        <div className="mb-6 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-start gap-2">
            <ShieldIcon size={14} className="text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-text-secondary leading-relaxed">
              Your collateral is supplied from a private credits record. No one on the 
              network can see who deposited or how much — only aggregate TVL is public.
            </p>
          </div>
        </div>

        {/* Transaction Flow */}
        {transactionPending && (
          <div className="mb-6">
            <TransactionFlow currentStep={transactionStep} txId={transactionId} />
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!wallet.connected || !isValidAmount || transactionPending || !hasPrivateRecords || !selectedRecordHasEnough}
          className="w-full py-4 rounded-lg btn-signature text-[15px] font-label uppercase tracking-[0.1em] disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
        >
          {transactionPending
            ? 'Processing...'
            : !wallet.connected
            ? 'Connect Wallet'
            : !hasPrivateRecords
            ? `No Private ${selectedToken} Records`
            : !selectedRecordHasEnough
            ? 'Insufficient Record Balance'
            : 'Supply Collateral (Private)'}
        </button>

        {transactionStep === 'confirmed' && (
          <button
            onClick={resetTransaction}
            className="w-full mt-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            New Supply
          </button>
        )}
      </motion.div>
    </div>
  );
}
