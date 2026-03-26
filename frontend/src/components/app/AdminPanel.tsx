import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTransaction } from '@/hooks/useTransaction';
import { ADMIN_ADDRESS } from '@/utils/constants';
import { ShieldIcon } from '@/components/icons/ShieldIcon';
import { ZapIcon } from '@/components/icons/ZapIcon';
import { LockIcon } from '@/components/icons/LockIcon';
import { UnlockIcon } from '@/components/icons/UnlockIcon';
import { TransactionFlow } from '@/components/shared/TransactionFlow';
import { useAppStore } from '@/stores/appStore';

interface AdminPanelProps {
  wallet: {
    requestRecords?: (program: string) => Promise<unknown[]>;
    requestTransaction?: (transaction: any) => Promise<{ transactionId: string } | undefined>;
    transactionStatus?: (txId: string) => Promise<{ status: string }>;
    decrypt?: (cipherText: string) => Promise<string>;
    connected: boolean;
    address?: string | null;
  };
}

type PoolToken = 'USDCx' | 'USAD';

export function AdminPanel({ wallet }: AdminPanelProps) {
  const {
    distributeYield,
    pauseVault,
    resumeVault,
    emergencyPause,
    resumeProtocol,
    accrueInterest,
    resetTransaction,
  } = useTransaction(wallet);

  const { transactionPending, transactionStep, transactionId } = useAppStore();

  const [yieldToken, setYieldToken] = useState<PoolToken>('USDCx');
  const [yieldAmount, setYieldAmount] = useState('');

  const isAdmin = wallet.connected && wallet.address === ADMIN_ADDRESS;

  const handleDistributeYield = useCallback(async () => {
    if (!isAdmin) { toast.error('Admin only'); return; }
    const amount = Math.floor(parseFloat(yieldAmount) * 1_000_000);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return; }
    const tokenType = yieldToken === 'USDCx' ? 0 : 1;
    await distributeYield(tokenType, amount);
    setYieldAmount('');
  }, [isAdmin, yieldAmount, yieldToken, distributeYield]);

  const handlePauseVault = useCallback(async () => {
    if (!isAdmin) return;
    await pauseVault();
  }, [isAdmin, pauseVault]);

  const handleResumeVault = useCallback(async () => {
    if (!isAdmin) return;
    await resumeVault();
  }, [isAdmin, resumeVault]);

  const handlePauseProtocol = useCallback(async () => {
    if (!isAdmin) return;
    await emergencyPause();
  }, [isAdmin, emergencyPause]);

  const handleResumeProtocol = useCallback(async () => {
    if (!isAdmin) return;
    await resumeProtocol();
  }, [isAdmin, resumeProtocol]);

  const handleAccrueInterest = useCallback(async () => {
    if (!isAdmin) return;
    await accrueInterest();
  }, [isAdmin, accrueInterest]);

  if (!wallet.connected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldIcon size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-headline text-2xl text-text-primary">Admin Panel</h1>
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-text-muted">Connect wallet to continue</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <LockIcon size={20} className="text-red-400" />
          </div>
          <div>
            <h1 className="font-headline text-2xl text-text-primary">Access Denied</h1>
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-text-muted">Admin wallet required</p>
          </div>
        </div>
        <div className="rounded-xl glass-panel p-6">
          <p className="text-sm text-text-muted">This panel is restricted to the protocol admin address.</p>
          <p className="font-mono text-xs text-text-muted mt-2 break-all">{ADMIN_ADDRESS}</p>
        </div>
      </div>
    );
  }

  if (transactionPending) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldIcon size={20} className="text-primary" />
          </div>
          <h1 className="font-headline text-2xl text-text-primary">Admin Transaction</h1>
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
          <ShieldIcon size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-headline text-2xl text-text-primary">Admin Panel</h1>
          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-text-muted">Protocol management</p>
        </div>
      </div>

      {/* Distribute Yield */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="rounded-xl glass-panel p-6"
      >
        <h2 className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] mb-4">Distribute Yield</h2>
        <p className="text-xs text-text-muted mb-4">Add yield to the vault pool. Increases pool TVL and share price for depositors.</p>

        <div className="flex gap-2 mb-4">
          {(['USDCx', 'USAD'] as PoolToken[]).map((token) => (
            <button
              key={token}
              onClick={() => setYieldToken(token)}
              className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                yieldToken === token
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-white/[0.06] bg-white/[0.03] text-text-muted hover:text-text-secondary'
              }`}
            >
              {token}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-2">
            Amount ({yieldToken})
          </label>
          <input
            type="number"
            value={yieldAmount}
            onChange={(e) => setYieldAmount(e.target.value)}
            placeholder="0.000001"
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary font-mono text-lg placeholder-text-muted focus:border-primary/40 focus:outline-none transition-colors"
          />
        </div>

        <button
          onClick={handleDistributeYield}
          disabled={!yieldAmount}
          className="w-full py-3 rounded-lg font-label text-sm uppercase tracking-[0.12em] transition-all bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Distribute {yieldToken} Yield
        </button>
      </motion.div>

      {/* Protocol Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 20 }}
        className="rounded-xl glass-panel p-6"
      >
        <h2 className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] mb-4">Protocol Controls</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleAccrueInterest}
            className="flex items-center justify-center gap-2 py-3 rounded-lg font-label text-sm uppercase tracking-[0.12em] transition-all bg-accent/20 text-accent hover:bg-accent/30"
          >
            <ZapIcon size={16} /> Accrue Interest
          </button>

          <button
            onClick={handlePauseProtocol}
            className="flex items-center justify-center gap-2 py-3 rounded-lg font-label text-sm uppercase tracking-[0.12em] transition-all bg-red-500/20 text-red-400 hover:bg-red-500/30"
          >
            <LockIcon size={16} /> Pause Protocol
          </button>

          <button
            onClick={handleResumeProtocol}
            className="flex items-center justify-center gap-2 py-3 rounded-lg font-label text-sm uppercase tracking-[0.12em] transition-all bg-green-500/20 text-green-400 hover:bg-green-500/30"
          >
            <UnlockIcon size={16} /> Resume Protocol
          </button>

          <button
            onClick={handlePauseVault}
            className="flex items-center justify-center gap-2 py-3 rounded-lg font-label text-sm uppercase tracking-[0.12em] transition-all bg-red-500/20 text-red-400 hover:bg-red-500/30"
          >
            <LockIcon size={16} /> Pause Vault
          </button>

          <button
            onClick={handleResumeVault}
            className="flex items-center justify-center gap-2 py-3 rounded-lg font-label text-sm uppercase tracking-[0.12em] transition-all bg-green-500/20 text-green-400 hover:bg-green-500/30"
          >
            <UnlockIcon size={16} /> Resume Vault
          </button>
        </div>
      </motion.div>
    </div>
  );
}
