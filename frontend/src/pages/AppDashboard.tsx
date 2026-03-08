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
import { WithdrawForm } from '@/components/app/WithdrawForm';
import { LiquidateForm } from '@/components/app/LiquidateForm';

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
    decrypt,
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
    decrypt,
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
        <Route path="withdraw" element={<WithdrawForm wallet={walletProps} />} />
        <Route path="liquidate" element={<LiquidateForm wallet={walletProps} />} />
        <Route path="stats" element={<ProtocolStats wallet={walletProps} />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </AppLayout>
  );
}
