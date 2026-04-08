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
  new LeoWalletAdapter({ appName: 'DARA Lend' }),
  new ShieldWalletAdapter({ appName: 'DARA Lend' }),
];

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AleoWalletProvider
        wallets={wallets}
        decryptPermission={DecryptPermission.AutoDecrypt}
        network={Network.TESTNET}
        programs={['dara_lend_v8.aleo', 'dara_lend_v8_vault.aleo', 'dara_lend_v8_credits.aleo', 'dara_lend_v8_gov.aleo', 'credits.aleo', 'test_usdcx_stablecoin.aleo', 'test_usad_stablecoin.aleo']}
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
