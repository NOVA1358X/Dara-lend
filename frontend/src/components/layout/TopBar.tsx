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
  '/app/withdraw': 'Withdraw',
  '/app/liquidate': 'Liquidate',
  '/app/positions': 'Positions',
  '/app/history': 'Transaction History',
  '/app/stats': 'Protocol Stats',
};

export function TopBar({ address, connected, connecting, onConnect, onDisconnect }: TopBarProps) {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Dashboard';

  return (
    <header className="h-[72px] flex items-center justify-between px-6 bg-black/80 backdrop-blur-[20px] border-b border-white/[0.06] sticky top-0 z-30">
      <div>
        <h1 className="font-headline text-lg text-text-primary">{title}</h1>
        <p className="font-label text-[10px] uppercase tracking-[0.2em] text-text-muted">dara_lend_v6</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-success" />
          <span className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted">Testnet</span>
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
