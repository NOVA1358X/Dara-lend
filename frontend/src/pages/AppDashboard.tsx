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
import { TransactionHistory } from '@/components/app/TransactionHistory';
import { Analytics } from '@/components/app/Analytics';
import { YieldVault } from '@/components/app/YieldVault';
import { PrivateTransfer } from '@/components/app/PrivateTransfer';
import { AdminPanel } from '@/components/app/AdminPanel';
import { GovernancePanel } from '@/components/app/GovernancePanel';
import { RateCurveChart } from '@/components/app/RateCurveChart';
import { SolvencyProof } from '@/components/app/SolvencyProof';
import { DarkPool } from '@/components/app/DarkPool';
import { Auctions } from '@/components/app/Auctions';
import { FlashLoan } from '@/components/app/FlashLoan';
import { PageTransition } from '@/components/shared/PageTransition';

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
        <Route index element={<PageTransition><Dashboard wallet={walletProps} /></PageTransition>} />
        <Route path="supply" element={<PageTransition><SupplyForm wallet={walletProps} /></PageTransition>} />
        <Route path="borrow" element={<PageTransition><BorrowForm wallet={walletProps} /></PageTransition>} />
        <Route path="repay" element={<PageTransition><RepayForm wallet={walletProps} /></PageTransition>} />
        <Route path="positions" element={<PageTransition><PositionsList wallet={walletProps} /></PageTransition>} />
        <Route path="withdraw" element={<PageTransition><WithdrawForm wallet={walletProps} /></PageTransition>} />
        <Route path="liquidate" element={<PageTransition><LiquidateForm wallet={walletProps} /></PageTransition>} />
        <Route path="yield" element={<PageTransition><YieldVault wallet={walletProps} /></PageTransition>} />
        <Route path="transfer" element={<PageTransition><PrivateTransfer wallet={walletProps} /></PageTransition>} />
        <Route path="history" element={<PageTransition><TransactionHistory /></PageTransition>} />
        <Route path="analytics" element={<PageTransition><Analytics /></PageTransition>} />
        <Route path="stats" element={<PageTransition><ProtocolStats wallet={walletProps} /></PageTransition>} />
        <Route path="admin" element={<PageTransition><AdminPanel wallet={walletProps} /></PageTransition>} />
        <Route path="governance" element={<PageTransition><GovernancePanel wallet={walletProps} /></PageTransition>} />
        <Route path="rates" element={<PageTransition><RateCurveChart /></PageTransition>} />
        <Route path="solvency" element={<PageTransition><SolvencyProof /></PageTransition>} />
        <Route path="darkpool" element={<PageTransition><DarkPool wallet={walletProps} /></PageTransition>} />
        <Route path="auctions" element={<PageTransition><Auctions wallet={walletProps} /></PageTransition>} />
        <Route path="flash" element={<PageTransition><FlashLoan wallet={walletProps} /></PageTransition>} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </AppLayout>
  );
}
