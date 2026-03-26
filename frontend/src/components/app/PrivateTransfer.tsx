import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTransaction } from '@/hooks/useTransaction';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import { useVaultStats } from '@/hooks/useVaultStats';
import { useAppStore } from '@/stores/appStore';
import { TransactionFlow } from '@/components/shared/TransactionFlow';
import { StatCard } from '@/components/shared/StatCard';
import { TokenIcon } from '@/components/shared/TokenIcon';
import { EyeOffIcon } from '@/components/icons/EyeOffIcon';
import { ShieldIcon } from '@/components/icons/ShieldIcon';
import { formatCredits, truncateAddress } from '@/utils/formatting';
import { PRECISION } from '@/utils/constants';
import toast from 'react-hot-toast';

type TransferToken = 'USDCx' | 'USAD';

interface PrivateTransferProps {
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

export function PrivateTransfer({ wallet }: PrivateTransferProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<TransferToken>('USDCx');
  const [selectedRecordIdx, setSelectedRecordIdx] = useState(0);
  const [tokenRecords, setTokenRecords] = useState<ParsedTokenRecord[]>([]);

  const { transactionStep, transactionId, transactionPending } = useAppStore();
  const { privateTransferUsdcx, privateTransferUsad, resetTransaction } = useTransaction(wallet);
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

  const selectedRecord = tokenRecords[selectedRecordIdx];

  const handleTransfer = useCallback(async () => {
    if (!wallet.connected) {
      toast.error('Connect wallet first');
      return;
    }
    if (!selectedRecord) {
      toast.error(`No private ${selectedToken} records found`);
      return;
    }
    if (!recipient.startsWith('aleo1') || recipient.length < 50) {
      toast.error('Enter a valid Aleo address');
      return;
    }
    const amountMicro = Math.floor(parseFloat(amount) * PRECISION);
    if (isNaN(amountMicro) || amountMicro <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amountMicro > selectedRecord.amount) {
      toast.error('Amount exceeds selected record balance');
      return;
    }
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    const nonce = Array.from(randomBytes).reduce((acc, b) => acc * 256 + b, 0);
    if (selectedToken === 'USDCx') {
      await privateTransferUsdcx(selectedRecord.plaintext, recipient, amountMicro, nonce);
    } else {
      await privateTransferUsad(selectedRecord.plaintext, recipient, amountMicro, nonce);
    }
    setAmount('');
    refetch();
  }, [wallet.connected, recipient, amount, selectedToken, selectedRecord, privateTransferUsdcx, privateTransferUsad, refetch]);

  if (transactionPending) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <EyeOffIcon size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-headline text-2xl text-text-primary">Private Transfer In Progress</h1>
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
          <EyeOffIcon size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-headline text-2xl text-text-primary">Private Transfer</h1>
          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-text-muted">
            Send tokens with zero-knowledge privacy
          </p>
        </div>
      </div>

      {/* Privacy Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      >
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Private Transfers"
            value={`${vaultStats?.transferCount ?? 0}`}
            loading={isLoading}
          />
          <StatCard
            label="Total Volume"
            value={`$${formatCredits(vaultStats?.totalVolume ?? 0)}`}
            loading={isLoading}
          />
          <StatCard
            label="Privacy Level"
            value="ZK-Shielded"
            loading={false}
          />
        </div>
      </motion.div>

      {/* Transfer Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 20 }}
        className="rounded-xl glass-panel p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <ShieldIcon size={18} className="text-primary" />
          <h3 className="font-headline text-base text-text-primary">Send Privately</h3>
        </div>

        <div className="space-y-4">
          {/* Token Selector */}
          <div>
            <label className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-2">
              Token
            </label>
            <div className="flex gap-2">
              {(['USDCx', 'USAD'] as TransferToken[]).map((token) => (
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
                No private {selectedToken} records found. You need a private token record to transfer.
              </p>
            </div>
          )}

          {/* Recipient */}
          <div>
            <label className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="aleo1..."
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary font-mono text-sm placeholder-text-muted focus:border-primary/40 focus:outline-none transition-colors"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-2">
              Amount ({selectedToken})
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
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

          {/* Summary */}
          <div className="p-3 rounded-lg bg-white/[0.02] text-xs text-text-muted space-y-1">
            <div className="flex justify-between">
              <span>Sending</span>
              <span className="text-text-secondary">{amount || '0'} {selectedToken}</span>
            </div>
            <div className="flex justify-between">
              <span>To</span>
              <span className="text-text-secondary font-mono">
                {recipient ? truncateAddress(recipient, 10, 6) : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Privacy</span>
              <span className="text-accent-success">Fully shielded via ZK relay</span>
            </div>
          </div>

          <button
            onClick={handleTransfer}
            disabled={!wallet.connected || !amount || !recipient || !selectedRecord}
            className="w-full py-3 rounded-lg font-label text-sm uppercase tracking-[0.12em] transition-all bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {!wallet.connected ? 'Connect Wallet' : !selectedRecord ? 'No Records Available' : `Send ${selectedToken} Privately`}
          </button>
        </div>
      </motion.div>

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 20 }}
        className="rounded-xl glass-panel p-6"
      >
        <h3 className="font-headline text-base text-text-primary mb-3">How Private Transfers Work</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <span className="material-symbols-outlined text-primary text-lg mb-1 block">upload</span>
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-primary mb-1">1. Deposit</p>
            <p className="text-[11px] text-text-muted">Your tokens are deposited to the privacy relay contract with a ZK proof.</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <span className="material-symbols-outlined text-primary text-lg mb-1 block">shuffle</span>
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-primary mb-1">2. Relay</p>
            <p className="text-[11px] text-text-muted">The vault contract atomically relays funds, breaking the on-chain link between sender and recipient.</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <span className="material-symbols-outlined text-primary text-lg mb-1 block">download</span>
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-primary mb-1">3. Receive</p>
            <p className="text-[11px] text-text-muted">Recipient receives a private PrivateTransferReceipt record — no public link to sender.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
