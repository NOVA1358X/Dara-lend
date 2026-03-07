import { LockIcon } from '@/components/icons/LockIcon';
import { ShieldIcon } from '@/components/icons/ShieldIcon';

interface PrivacyBadgeProps {
  variant?: 'encrypted' | 'private' | 'verified';
  className?: string;
}

export function PrivacyBadge({ variant = 'private', className = '' }: PrivacyBadgeProps) {
  const configs = {
    encrypted: {
      text: 'Encrypted',
      icon: <LockIcon size={12} />,
      colors: 'bg-accent/5 text-accent border-accent/10',
    },
    private: {
      text: 'Private Record',
      icon: <ShieldIcon size={12} />,
      colors: 'bg-accent/5 text-accent border-accent/10',
    },
    verified: {
      text: 'Verifiable On-Chain',
      icon: <ShieldIcon size={12} />,
      colors: 'bg-accent-success/5 text-accent-success border-accent-success/10',
    },
  };

  const config = configs[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium uppercase tracking-wider border ${config.colors} ${className}`}
    >
      {config.icon}
      {config.text}
    </span>
  );
}
