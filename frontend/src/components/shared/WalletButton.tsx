import { truncateAddress, generateAddressColor } from '@/utils/formatting';
import { WalletIcon } from '@/components/icons/WalletIcon';

interface WalletButtonProps {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WalletButton({
  address,
  connected,
  connecting,
  onConnect,
  onDisconnect,
}: WalletButtonProps) {
  if (connecting) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface border border-border-default text-text-secondary text-sm font-medium cursor-wait"
      >
        <div className="w-4 h-4 border-2 border-text-muted border-t-accent rounded-full animate-spin" />
        Connecting...
      </button>
    );
  }

  if (connected && address) {
    const color = generateAddressColor(address);
    return (
      <button
        onClick={onDisconnect}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-surface border border-border-default text-text-primary text-sm font-medium hover:bg-surface-hover hover:border-border-hover transition-all duration-200 focus-ring"
        aria-label="Disconnect wallet"
      >
        <div
          className="w-5 h-5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="font-mono text-[13px] tabular-nums">
          {truncateAddress(address)}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onConnect}
      className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border-default text-text-primary text-sm font-medium hover:bg-surface hover:border-border-hover transition-all duration-200 focus-ring"
      aria-label="Connect wallet"
    >
      <WalletIcon size={16} />
      Connect Wallet
    </button>
  );
}
