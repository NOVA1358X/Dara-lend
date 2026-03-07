import { useLocation } from 'react-router-dom';
import { WalletButton } from '@/components/shared/WalletButton';

interface TopBarProps {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

const pageTitles: Record<string, string> = {
  '/app': 'Dashboard',
  '/app/supply': 'Supply Collateral',
  '/app/borrow': 'Borrow',
  '/app/repay': 'Repay',
  '/app/positions': 'Positions',
  '/app/stats': 'Protocol Stats',
};

export function TopBar({ address, connected, connecting, onConnect, onDisconnect }: TopBarProps) {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Dashboard';

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-[rgba(8,10,18,0.9)] backdrop-blur-[12px] border-b border-[rgba(255,255,255,0.05)] sticky top-0 z-30">
      <h1 className="font-heading text-lg font-semibold text-text-primary">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-success" />
          <span className="text-xs text-text-muted font-medium">Testnet</span>
        </div>

        <WalletButton
          address={address}
          connected={connected}
          connecting={connecting}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
        />
      </div>
    </header>
  );
}
