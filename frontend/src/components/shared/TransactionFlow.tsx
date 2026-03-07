import { motion } from 'framer-motion';
import { CheckIcon } from '@/components/icons/CheckIcon';
import { LockIcon } from '@/components/icons/LockIcon';
import { ZapIcon } from '@/components/icons/ZapIcon';
import { LinkIcon } from '@/components/icons/LinkIcon';
import type { TransactionStep } from '@/stores/appStore';

interface TransactionFlowProps {
  currentStep: TransactionStep;
  txId?: string | null;
  className?: string;
}

const steps = [
  { key: 'encrypting', label: 'Encrypting inputs', icon: LockIcon },
  { key: 'proving', label: 'Generating ZK proof', icon: ZapIcon },
  { key: 'broadcasting', label: 'Broadcasting transaction', icon: LinkIcon },
  { key: 'confirmed', label: 'Confirmed on-chain', icon: CheckIcon },
] as const;

const stepOrder = ['encrypting', 'proving', 'broadcasting', 'confirmed'] as const;

export function TransactionFlow({ currentStep, txId, className = '' }: TransactionFlowProps) {
  if (currentStep === 'idle') return null;

  const currentIdx = stepOrder.indexOf(currentStep as typeof stepOrder[number]);

  return (
    <div className={`space-y-1 ${className}`}>
      {steps.map((step, idx) => {
        const isActive = step.key === currentStep;
        const isComplete = currentIdx > idx || currentStep === 'confirmed';
        const isFailed = currentStep === 'failed' && idx === currentIdx;
        const Icon = step.icon;

        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1, type: 'spring', stiffness: 120, damping: 20 }}
            className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-colors duration-200 ${
              isActive
                ? 'bg-accent/5 border border-accent/10'
                : isComplete
                ? 'bg-accent-success/5 border border-transparent'
                : isFailed
                ? 'bg-accent-danger/5 border border-accent-danger/10'
                : 'border border-transparent opacity-40'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isComplete
                  ? 'bg-accent-success/10 text-accent-success'
                  : isActive
                  ? 'bg-accent/10 text-accent'
                  : isFailed
                  ? 'bg-accent-danger/10 text-accent-danger'
                  : 'bg-surface text-text-muted'
              }`}
            >
              {isActive && !isComplete ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isComplete ? (
                <CheckIcon size={16} />
              ) : (
                <Icon size={16} />
              )}
            </div>
            <span
              className={`text-sm font-medium ${
                isActive
                  ? 'text-accent'
                  : isComplete
                  ? 'text-accent-success'
                  : isFailed
                  ? 'text-accent-danger'
                  : 'text-text-muted'
              }`}
            >
              {isFailed ? 'Transaction failed' : step.label}
            </span>
          </motion.div>
        );
      })}

      {txId && (
        <div className="mt-3 px-4">
          <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
            Transaction ID
          </p>
          <p className="font-mono text-xs text-text-secondary break-all">{txId}</p>
        </div>
      )}
    </div>
  );
}
