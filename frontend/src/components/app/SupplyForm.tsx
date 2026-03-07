import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTransaction } from '@/hooks/useTransaction';
import { useAppStore } from '@/stores/appStore';
import { TransactionFlow } from '@/components/shared/TransactionFlow';
import { LockIcon } from '@/components/icons/LockIcon';
import { ShieldIcon } from '@/components/icons/ShieldIcon';
import { formatCredits } from '@/utils/formatting';
import { ALEO_TESTNET_API } from '@/utils/constants';
import toast from 'react-hot-toast';

interface SupplyFormProps {
  wallet: {
    requestRecords?: (program: string) => Promise<unknown[]>;
    requestTransaction?: (transaction: any) => Promise<{ transactionId: string } | undefined>;
    transactionStatus?: (txId: string) => Promise<{ status: string }>;
    connected: boolean;
    address?: string | null;
  };
}

export function SupplyForm({ wallet }: SupplyFormProps) {
  const [amount, setAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const { transactionStep, transactionId, transactionPending } = useAppStore();
  const { supplyCollateral, resetTransaction } = useTransaction(wallet);

  const fetchBalance = useCallback(async () => {
    if (!wallet.connected || !wallet.address) return;
    try {
      // Query public credits balance from on-chain mapping
      const url = `${ALEO_TESTNET_API}/program/credits.aleo/mapping/account/${wallet.address}`;
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
      const cleaned = text.replace(/"/g, '').replace('u64', '').trim();
      const val = parseInt(cleaned, 10);
      setWalletBalance(isNaN(val) ? 0 : val);
    } catch {
      setWalletBalance(null);
    }
  }, [wallet.connected, wallet.address]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const amountInMicrocredits = Math.floor(parseFloat(amount || '0') * 1_000_000);
  const isValidAmount = amountInMicrocredits >= 100_000;

  const handleMax = () => {
    if (walletBalance) {
      setAmount((walletBalance / 1_000_000).toFixed(6));
    }
  };

  const handleSubmit = async () => {
    if (!isValidAmount) {
      toast.error('Minimum supply is 0.1 ALEO');
      return;
    }
    const nonce = Date.now();

    try {
      await supplyCollateral(amountInMicrocredits, nonce);
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
        className="rounded-xl bg-bg-tertiary border border-border-default p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <LockIcon size={16} className="text-accent" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-text-primary">
              Supply Collateral
            </h2>
            <p className="text-xs text-text-secondary">
              Lock ALEO credits as encrypted collateral
            </p>
          </div>
        </div>

        {/* Asset */}
        <div className="mb-4">
          <label className="text-label uppercase text-text-muted tracking-widest block mb-2">
            Asset
          </label>
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-bg-secondary border border-border-default">
            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-[10px] font-bold text-accent">A</span>
            </div>
            <span className="text-sm font-medium text-text-primary">ALEO Credits</span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-label uppercase text-text-muted tracking-widest">
              Amount
            </label>
            <button
              onClick={handleMax}
              className="text-[11px] font-medium text-accent hover:text-accent-hover transition-colors"
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
              className="w-full px-4 py-4 rounded-lg bg-bg-secondary border border-border-default text-text-primary font-mono text-xl tabular-nums placeholder:text-text-muted focus:outline-none focus:border-accent/30 transition-colors"
              aria-label="Supply amount in ALEO"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-muted">
              ALEO
            </span>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-text-muted">Min: 0.1 ALEO</span>
            <span className="text-xs text-text-secondary">
              Balance: {walletBalance !== null ? formatCredits(walletBalance) : '—'} ALEO
            </span>
          </div>
        </div>

        {/* Privacy Info */}
        <div className="mb-6 p-3 rounded-lg bg-accent/5 border border-accent/10">
          <div className="flex items-start gap-2">
            <ShieldIcon size={14} className="text-accent mt-0.5 flex-shrink-0" />
            <p className="text-xs text-text-secondary leading-relaxed">
              Your collateral amount will be encrypted inside a zero-knowledge proof.
              No one on the network can see how much you deposited.
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
          disabled={!wallet.connected || !isValidAmount || transactionPending}
          className="w-full py-4 rounded-lg bg-accent text-bg-primary font-medium text-[15px] hover:bg-accent-hover transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
        >
          {transactionPending
            ? 'Processing...'
            : !wallet.connected
            ? 'Connect Wallet'
            : 'Supply Collateral'}
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
