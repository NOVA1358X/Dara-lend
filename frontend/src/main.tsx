import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const wallets = [
  new LeoWalletAdapter({ appName: 'DARA' }),
  new ShieldWalletAdapter({ appName: 'DARA' }),
];

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AleoWalletProvider
        wallets={wallets}
        decryptPermission={DecryptPermission.AutoDecrypt}
        network={Network.TESTNET}
        programs={['dara_lend_v8.aleo', 'dara_lend_v8_vault.aleo', 'dara_lend_v8_credits.aleo', 'dara_lend_v8_gov_v3.aleo', 'credits.aleo', 'test_usdcx_stablecoin.aleo', 'test_usad_stablecoin.aleo', 'dara_dark_pool_v3.aleo', 'dara_dp_btc_v4.aleo', 'dara_dp_eth_v4.aleo', 'dara_dp_sol_v4.aleo', 'test_btc_v1.aleo', 'test_eth_v1.aleo', 'test_sol_v1.aleo', 'dara_auction_v1.aleo', 'dara_flash_v1.aleo']}
      >
        <WalletModalProvider>
          <App />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#131313',
                color: '#F0F0F0',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                fontSize: '14px',
              },
              duration: 4000,
            }}
          />
        </WalletModalProvider>
      </AleoWalletProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
