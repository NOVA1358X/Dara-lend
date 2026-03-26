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
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-text-secondary text-sm font-label uppercase tracking-[0.1em] cursor-wait"
      >
        <div className="w-4 h-4 border-2 border-text-muted border-t-primary rounded-full animate-spin" />
        Connecting...
      </button>
    );
  }

  if (connected && address) {
    const color = generateAddressColor(address);
    return (
      <button
        onClick={onDisconnect}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-text-primary text-sm font-label hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300 focus-ring"
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
      className="btn-signature flex items-center gap-2 px-5 py-2.5 text-sm font-label uppercase tracking-[0.1em] focus-ring"
      aria-label="Connect wallet"
    >
      <WalletIcon size={16} />
      Connect Wallet
    </button>
  );
}
