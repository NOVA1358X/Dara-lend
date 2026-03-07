import { useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Network } from '@provablehq/aleo-types';
import { AppLayout } from '@/components/layout/AppLayout';
import { Dashboard } from '@/components/app/Dashboard';
import { SupplyForm } from '@/components/app/SupplyForm';
import { BorrowForm } from '@/components/app/BorrowForm';
import { RepayForm } from '@/components/app/RepayForm';
import { PositionsList } from '@/components/app/PositionsList';
import { ProtocolStats } from '@/components/app/ProtocolStats';

export default function AppDashboard() {
  const {
    address,
    connected,
    connecting,
    wallet,
    connect,
    disconnect,
    requestRecords,
    executeTransaction,
    transactionStatus,
  } = useWallet();
  const { setVisible } = useWalletModal();

  const handleConnect = useCallback(() => {
    if (wallet) {
      connect(Network.TESTNET);
    } else {
      setVisible(true);
    }
  }, [wallet, connect, setVisible]);

  const walletProps = {
    requestRecords,
    requestTransaction: executeTransaction,
    transactionStatus,
    connected,
    address,
  };

  return (
    <AppLayout
      address={address}
      connected={connected}
      connecting={connecting}
      onConnect={handleConnect}
      onDisconnect={disconnect}
    >
      <Routes>
        <Route index element={<Dashboard wallet={walletProps} />} />
        <Route path="supply" element={<SupplyForm wallet={walletProps} />} />
        <Route path="borrow" element={<BorrowForm wallet={walletProps} />} />
        <Route path="repay" element={<RepayForm wallet={walletProps} />} />
        <Route path="positions" element={<PositionsList wallet={walletProps} />} />
        <Route path="stats" element={<ProtocolStats />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </AppLayout>
  );
}
