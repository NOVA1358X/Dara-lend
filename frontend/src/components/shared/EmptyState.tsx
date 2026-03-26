import type { ReactNode } from 'react';
import { ShieldIcon } from '@/components/icons/ShieldIcon';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-5 text-text-muted">
        {icon || <ShieldIcon size={28} />}
      </div>
      <h3 className="font-headline text-lg text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-sm text-text-secondary max-w-sm mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-signature px-5 py-2.5 text-sm font-label uppercase tracking-[0.1em] focus-ring"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
