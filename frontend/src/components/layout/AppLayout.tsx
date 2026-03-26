import { type ReactNode, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { NoiseOverlay } from '@/components/shared/NoiseOverlay';
import { useAppStore } from '@/stores/appStore';

interface AppLayoutProps {
  children: ReactNode;
  address: string | null;
  connected: boolean;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function AppLayout({
  children,
  address,
  connected,
  connecting,
  onConnect,
  onDisconnect,
}: AppLayoutProps) {
  const { sidebarCollapsed } = useAppStore();

  const handleConnect = useCallback(() => {
    onConnect();
  }, [onConnect]);

  const handleDisconnect = useCallback(() => {
    onDisconnect();
  }, [onDisconnect]);

  return (
    <div className="min-h-screen bg-bg-primary">
      <NoiseOverlay />
      <Sidebar />

      <div
        className={`transition-all duration-300 lg:pb-0 pb-16 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
        }`}
      >
        <TopBar
          address={address}
          connected={connected}
          connecting={connecting}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />

        <main className="p-6 lg:p-8 max-w-[1200px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
