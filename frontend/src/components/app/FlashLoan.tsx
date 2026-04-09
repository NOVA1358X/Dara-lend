import { useState, useEffect, useCallback } from 'react';
import { useTransaction } from '@/hooks/useTransaction';
import {
  FLASH_PROGRAM_ID, FLASH_TRANSITIONS, FLASH_MAPPINGS,
  BACKEND_API, PRECISION, TX_FEE, TX_FEE_HIGH,
} from '@/utils/constants';
import { SpotlightCard } from '@/components/shared/SpotlightCard';
import { FadeInView } from '@/components/shared/FadeInView';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import toast from 'react-hot-toast';

interface FlashLoanProps {
  wallet: {
    requestRecords?: (program: string, all?: boolean) => Promise<unknown[]>;
    requestTransaction?: (tx: unknown) => Promise<{ transactionId: string } | undefined>;
    transactionStatus?: (txId: string) => Promise<{ status: string }>;
    decrypt?: (cipherText: string) => Promise<string>;
    connected: boolean;
    address?: string | null;
  };
}

interface FlashStats {
  totalLoans: string;
  totalVolume: string;
  totalFees: string;
  activeLoans: string;
  oraclePrice: string;
  paused: boolean;
  feeBps: number;
  collateralRatio: number;
}

const FREEZE_LIST_PROOF = `[{siblings: [0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field], leaf_index: 1u32}, {siblings: [0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field], leaf_index: 1u32}]`;

export function FlashLoan({ wallet }: FlashLoanProps) {
  const tx = useTransaction(wallet as any);
  const [stats, setStats] = useState<FlashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState<'borrow_usdcx' | 'borrow_aleo'>('borrow_usdcx');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'borrow' | 'claim' | 'repay' | 'withdraw'>('borrow');

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, availRes] = await Promise.all([
        fetch(`${BACKEND_API}/flash/stats`).then(r => r.json()).catch(() => null),
        fetch(`${BACKEND_API}/flash/available`).then(r => r.json()).catch(() => null),
      ]);
      setStats({
        totalLoans: statsRes?.totalLoans ?? '0',
        totalVolume: statsRes?.totalVolume ?? '0',
        totalFees: statsRes?.totalFees ?? '0',
        activeLoans: statsRes?.activeLoans ?? '0',
        oraclePrice: availRes?.oraclePrice ?? '0',
        paused: availRes?.paused ?? false,
        feeBps: availRes?.feeBps ?? 9,
        collateralRatio: availRes?.collateralRatio ?? 10200,
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

  const handleBorrow = async () => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) { toast.error('Enter a valid amount'); return; }

    const microAmount = Math.floor(parsedAmount * PRECISION);

    if (direction === 'borrow_usdcx') {
      // Borrow USDCx — lock ALEO as collateral
      await tx.executeTransaction(
        FLASH_TRANSITIONS.FLASH_BORROW_USDCX,
        ['credits_record_placeholder', `${microAmount}u64`],
        TX_FEE_HIGH,
        FLASH_PROGRAM_ID,
      );
    } else {
      // Borrow ALEO — lock USDCx as collateral
      await tx.executeTransaction(
        FLASH_TRANSITIONS.FLASH_BORROW_ALEO,
        [
          'usdcx_record_placeholder',
          FREEZE_LIST_PROOF,
          `${microAmount}u128`,
        ],
        TX_FEE_HIGH,
        FLASH_PROGRAM_ID,
      );
    }

    setStep('claim');
    setTimeout(fetchStats, 5000);
  };

  const handleClaim = async () => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }

    const transition = direction === 'borrow_usdcx'
      ? FLASH_TRANSITIONS.FLASH_CLAIM_USDCX
      : FLASH_TRANSITIONS.FLASH_CLAIM_ALEO;

    await tx.executeTransaction(
      transition,
      ['flash_loan_receipt_placeholder'],
      TX_FEE,
      FLASH_PROGRAM_ID,
    );

    setStep('repay');
    setTimeout(fetchStats, 5000);
  };

  const handleRepay = async () => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }

    if (direction === 'borrow_usdcx') {
      await tx.executeTransaction(
        FLASH_TRANSITIONS.FLASH_REPAY_USDCX,
        [
          'usdcx_record_placeholder',
          FREEZE_LIST_PROOF,
          'flash_loan_receipt_placeholder',
        ],
        TX_FEE_HIGH,
        FLASH_PROGRAM_ID,
      );
    } else {
      await tx.executeTransaction(
        FLASH_TRANSITIONS.FLASH_REPAY_ALEO,
        ['credits_record_placeholder', 'flash_loan_receipt_placeholder'],
        TX_FEE_HIGH,
        FLASH_PROGRAM_ID,
      );
    }

    setStep('withdraw');
    setTimeout(fetchStats, 5000);
  };

  const handleWithdraw = async () => {
    if (!wallet.connected) { toast.error('Connect wallet first'); return; }

    const transition = direction === 'borrow_usdcx'
      ? FLASH_TRANSITIONS.FLASH_WITHDRAW_ALEO
      : FLASH_TRANSITIONS.FLASH_WITHDRAW_USDCX;

    await tx.executeTransaction(
      transition,
      ['flash_repay_receipt_placeholder'],
      TX_FEE,
      FLASH_PROGRAM_ID,
    );

    setStep('borrow');
    setAmount('');
    setTimeout(fetchStats, 5000);
  };

  const fee = parseFloat(amount || '0') * (stats?.feeBps ?? 9) / 10000;
  const oraclePrice = Number(stats?.oraclePrice || 0) / PRECISION;
  const totalVol = Number(stats?.totalVolume || 0) / PRECISION;
  const totalFees = Number(stats?.totalFees || 0) / PRECISION;
  const activeLoans = Number(stats?.activeLoans || 0);

  const stepLabels = ['borrow', 'claim', 'repay', 'withdraw'] as const;

  return (
    <div className="space-y-6">
      <FadeInView>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-2xl text-text-primary tracking-wide">Flash Loans</h1>
            <p className="text-text-muted text-sm mt-1">
              Instant collateral-backed flash lending — 0.09% fee, 102% collateral ratio
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Oracle Price</p>
            {loading ? <LoadingSkeleton className="h-6 w-20 mt-1" /> : (
              <p className="text-xl font-headline text-primary mt-1">${oraclePrice.toFixed(4)}</p>
            )}
          </SpotlightCard>
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Active Loans</p>
            {loading ? <LoadingSkeleton className="h-6 w-12 mt-1" /> : (
              <p className="text-xl font-headline text-accent-warning mt-1">{activeLoans}</p>
            )}
          </SpotlightCard>
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Total Volume</p>
            {loading ? <LoadingSkeleton className="h-6 w-24 mt-1" /> : (
              <p className="text-xl font-headline text-text-primary mt-1">${totalVol.toFixed(2)}</p>
            )}
          </SpotlightCard>
          <SpotlightCard className="p-4">
            <p className="text-text-muted text-xs font-label uppercase tracking-wider">Fees Earned</p>
            {loading ? <LoadingSkeleton className="h-6 w-20 mt-1" /> : (
              <p className="text-xl font-headline text-accent-success mt-1">${totalFees.toFixed(2)}</p>
            )}
          </SpotlightCard>
        </div>
      </FadeInView>

      {/* Step Progress */}
      <FadeInView delay={0.15}>
        <div className="flex items-center gap-2 justify-center">
          {stepLabels.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-label ${
                step === s ? 'bg-primary text-bg-primary' :
                stepLabels.indexOf(step) > i ? 'bg-accent-success/20 text-accent-success' :
                'bg-white/[0.05] text-text-muted'
              }`}>
                {stepLabels.indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`w-8 h-0.5 ${stepLabels.indexOf(step) > i ? 'bg-accent-success/30' : 'bg-white/[0.06]'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-6 text-xs text-text-muted mt-1">
          {stepLabels.map((s) => (
            <span key={s} className={step === s ? 'text-primary' : ''}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
          ))}
        </div>
      </FadeInView>

      {/* Flash Loan Form */}
      <FadeInView delay={0.2}>
        <SpotlightCard className="p-6">
          {step === 'borrow' && (
            <>
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setDirection('borrow_usdcx')}
                  className={`flex-1 py-2.5 rounded-lg font-label text-xs uppercase tracking-wider transition-all ${
                    direction === 'borrow_usdcx' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/[0.03] text-text-muted hover:text-text-secondary'
                  }`}
                >
                  Borrow USDCx (Lock ALEO)
                </button>
                <button
                  onClick={() => setDirection('borrow_aleo')}
                  className={`flex-1 py-2.5 rounded-lg font-label text-xs uppercase tracking-wider transition-all ${
                    direction === 'borrow_aleo' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/[0.03] text-text-muted hover:text-text-secondary'
                  }`}
                >
                  Borrow ALEO (Lock USDCx)
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-text-muted text-xs font-label uppercase tracking-wider block mb-2">
                    {direction === 'borrow_usdcx' ? 'ALEO Collateral Amount' : 'USDCx Collateral Amount'}
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={direction === 'borrow_usdcx' ? 'ALEO to lock as collateral' : 'USDCx to lock as collateral'}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-primary/30 transition-colors"
                  />
                </div>

                <div className="bg-white/[0.02] rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Fee</span>
                    <span>0.09% ({fee.toFixed(4)} tokens)</span>
                  </div>
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Collateral Ratio</span>
                    <span>102%</span>
                  </div>
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Flow</span>
                    <span>Borrow → Claim → Repay+Fee → Withdraw</span>
                  </div>
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Privacy</span>
                    <span className="text-accent-success">All records private</span>
                  </div>
                </div>

                <button
                  onClick={handleBorrow}
                  disabled={!wallet.connected || !amount}
                  className="w-full py-3 rounded-lg font-label text-sm uppercase tracking-wider transition-all bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {!wallet.connected ? 'Connect Wallet' : 'Lock Collateral & Borrow'}
                </button>
              </div>
            </>
          )}

          {step === 'claim' && (
            <div className="space-y-4 text-center">
              <h3 className="font-headline text-lg text-text-primary">Step 2: Claim Borrowed Tokens</h3>
              <p className="text-text-muted text-sm">Your collateral is locked. Claim your borrowed tokens now.</p>
              <button
                onClick={handleClaim}
                disabled={!wallet.connected}
                className="w-full py-3 rounded-lg font-label text-sm uppercase tracking-wider transition-all bg-accent-success/10 text-accent-success border border-accent-success/20 hover:bg-accent-success/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Claim {direction === 'borrow_usdcx' ? 'USDCx' : 'ALEO'} Tokens
              </button>
            </div>
          )}

          {step === 'repay' && (
            <div className="space-y-4 text-center">
              <h3 className="font-headline text-lg text-text-primary">Step 3: Repay Loan + Fee</h3>
              <p className="text-text-muted text-sm">Return the borrowed tokens plus 0.09% fee to unlock your collateral.</p>
              <button
                onClick={handleRepay}
                disabled={!wallet.connected}
                className="w-full py-3 rounded-lg font-label text-sm uppercase tracking-wider transition-all bg-accent-warning/10 text-accent-warning border border-accent-warning/20 hover:bg-accent-warning/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Repay {direction === 'borrow_usdcx' ? 'USDCx' : 'ALEO'} + Fee
              </button>
            </div>
          )}

          {step === 'withdraw' && (
            <div className="space-y-4 text-center">
              <h3 className="font-headline text-lg text-text-primary">Step 4: Withdraw Collateral</h3>
              <p className="text-text-muted text-sm">Loan repaid! Withdraw your collateral back to your wallet.</p>
              <button
                onClick={handleWithdraw}
                disabled={!wallet.connected}
                className="w-full py-3 rounded-lg font-label text-sm uppercase tracking-wider transition-all bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Withdraw {direction === 'borrow_usdcx' ? 'ALEO' : 'USDCx'} Collateral
              </button>
            </div>
          )}
        </SpotlightCard>
      </FadeInView>

      {/* How It Works */}
      <FadeInView delay={0.3}>
        <SpotlightCard className="p-6">
          <h3 className="font-headline text-lg text-text-primary mb-4">How Flash Loans Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">1</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Lock Collateral</h4>
              <p className="text-text-muted text-xs">Deposit 102% collateral. Locked in contract until full repayment.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">2</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Claim Tokens</h4>
              <p className="text-text-muted text-xs">Receive borrowed tokens as private records. Use for arbitrage or liquidation.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">3</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Repay + Fee</h4>
              <p className="text-text-muted text-xs">Return the tokens plus 0.09% fee. Contract verifies exact repayment.</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <div className="text-primary font-headline text-lg mb-2">4</div>
              <h4 className="text-text-primary text-sm font-medium mb-1">Get Collateral Back</h4>
              <p className="text-text-muted text-xs">Withdraw your collateral privately. Complete cycle in 4 transactions.</p>
            </div>
          </div>
        </SpotlightCard>
      </FadeInView>

      {/* Footer */}
      <FadeInView delay={0.4}>
        <div className="text-center text-text-muted text-xs">
          Fee: <span className="text-primary">0.09%</span> &middot; Collateral: <span className="text-primary">102%</span> &middot; Program: <span className="text-text-secondary font-mono text-[10px]">{FLASH_PROGRAM_ID}</span>
        </div>
      </FadeInView>
    </div>
  );
}
