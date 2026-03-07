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
      <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-5 text-text-muted">
        {icon || <ShieldIcon size={28} />}
      </div>
      <h3 className="font-heading text-lg font-semibold text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-sm text-text-secondary max-w-sm mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 rounded-lg bg-accent text-bg-primary text-sm font-medium hover:bg-accent-hover transition-colors duration-200 focus-ring"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
