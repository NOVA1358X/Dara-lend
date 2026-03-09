import { useCallback } from 'react';
import { PROGRAM_ID, TX_FEE, TX_FEE_HIGH, TRANSITIONS, USDCX_PROGRAM, PROTOCOL_ADDRESS, CREDITS_PROGRAM } from '@/utils/constants';
import { microCreditsToInput, microCreditsToU128Input, fieldToInput } from '@/utils/formatting';
import { useAppStore } from '@/stores/appStore';
import { saveTxToHistory } from '@/components/app/TransactionHistory';
import toast from 'react-hot-toast';

interface WalletExecute {
  requestTransaction?: (transaction: unknown) => Promise<{ transactionId: string } | undefined>;
  transactionStatus?: (txId: string) => Promise<{ status: string }>;
  connected: boolean;
  address?: string | null;
}

interface TransactionParams {
  program: string;
  function: string;
  inputs: string[];
  fee: number;
  privateFee: boolean;
}

function createAleoTransaction(programId: string, functionName: string, inputs: string[], fee: number): TransactionParams {
  return {
    program: programId,
    function: functionName,
    inputs,
    fee,
    privateFee: false,
  };
}

export function useTransaction(wallet: WalletExecute) {
  const { setTransactionPending, setTransactionStep, setTransactionId, resetTransaction } =
    useAppStore();

  const executeTransaction = useCallback(
    async (functionName: string, inputs: string[], fee: number = TX_FEE) => {
      if (!wallet.connected || !wallet.requestTransaction) {
        toast.error('Please connect your wallet first');
        return null;
      }

      try {
        setTransactionPending(true);
        setTransactionStep('encrypting');

        const tx = createAleoTransaction(PROGRAM_ID, functionName, inputs, fee);

        setTransactionStep('proving');

        const result = await wallet.requestTransaction(tx);
        const txId = result?.transactionId ?? '';
        if (!txId) {
          throw new Error('No transaction ID returned');
        }
        setTransactionId(txId);
        setTransactionStep('broadcasting');

        toast.success('Transaction submitted');

        const pollResult = await pollTransactionStatus(txId, wallet);
        const historyTxId = pollResult.realTxId || txId;
        if (pollResult.confirmed === true) {
          setTransactionStep('confirmed');
          toast.success('Transaction confirmed on-chain!');
          saveTxToHistory({ type: functionName, txId: historyTxId, timestamp: Date.now(), status: 'confirmed' });
        } else if (pollResult.confirmed === false) {
          setTransactionStep('failed');
          toast.error('Transaction rejected on-chain. Check if the protocol has sufficient USDCx liquidity.');
          saveTxToHistory({ type: functionName, txId: historyTxId, timestamp: Date.now(), status: 'failed' });
        } else {
          // null = polling timed out, transaction may still be processing
          setTransactionStep('confirmed');
          toast.success(`Transaction broadcast. Check explorer: ${historyTxId}`);
          saveTxToHistory({ type: functionName, txId: historyTxId, timestamp: Date.now(), status: 'pending' });
        }

        setTransactionPending(false);
        return txId;
      } catch (error) {
        setTransactionStep('failed');
        setTransactionPending(false);
        const message = error instanceof Error ? error.message : 'Transaction failed';
        toast.error(message);
        return null;
      }
    },
    [wallet, setTransactionPending, setTransactionStep, setTransactionId],
  );

  const supplyCollateral = useCallback(
    async (creditsRecord: string, amount: number, nonce: number) => {
      return executeTransaction(TRANSITIONS.SUPPLY_COLLATERAL, [
        creditsRecord,
        microCreditsToInput(amount),
        fieldToInput(nonce),
      ], TX_FEE_HIGH);
    },
    [executeTransaction],
  );

  const borrow = useCallback(
    async (
      collateralRecord: string,
      borrowAmount: number,
      currentPrice: number,
      orchestrator: string,
    ) => {
      return executeTransaction(TRANSITIONS.BORROW, [
        collateralRecord,
        microCreditsToU128Input(borrowAmount),
        microCreditsToInput(currentPrice),
        orchestrator,
      ]);
    },
    [executeTransaction],
  );

  const repay = useCallback(
    async (debtRecord: string) => {
      return executeTransaction(TRANSITIONS.REPAY, [debtRecord]);
    },
    [executeTransaction],
  );

  /** Approve the lending protocol to spend USDCx (required before repay) */
  const approveUSDCx = useCallback(
    async (amount: number) => {
      if (!wallet.connected || !wallet.requestTransaction) {
        toast.error('Please connect your wallet first');
        return null;
      }

      try {
        setTransactionPending(true);
        setTransactionStep('encrypting');

        const tx = createAleoTransaction(
          USDCX_PROGRAM,
          'approve_public',
          [PROTOCOL_ADDRESS, `${amount}u128`],
          TX_FEE,
        );

        setTransactionStep('proving');
        const result = await wallet.requestTransaction(tx);
        const txId = result?.transactionId ?? '';
        if (!txId) throw new Error('No transaction ID returned');
        setTransactionId(txId);
        setTransactionStep('broadcasting');
        toast.success('Approval transaction submitted');

        const pollResult = await pollTransactionStatus(txId, wallet);
        if (pollResult.confirmed === true) {
          setTransactionStep('confirmed');
          toast.success('USDCx spending approved!');
        } else if (pollResult.confirmed === false) {
          setTransactionStep('failed');
          toast.error('Approval rejected on-chain.');
        } else {
          setTransactionStep('confirmed');
          toast.success(`Approval broadcast. Check explorer: ${txId}`);
        }

        setTransactionPending(false);
        return txId;
      } catch (error) {
        setTransactionStep('failed');
        setTransactionPending(false);
        const message = error instanceof Error ? error.message : 'Approval failed';
        toast.error(message);
        return null;
      }
    },
    [wallet, setTransactionPending, setTransactionStep, setTransactionId],
  );

  const liquidate = useCallback(
    async (authRecord: string, oraclePrice: number) => {
      return executeTransaction(TRANSITIONS.LIQUIDATE, [
        authRecord,
        microCreditsToInput(oraclePrice),
      ]);
    },
    [executeTransaction],
  );

  const withdrawCollateral = useCallback(
    async (receiptRecord: string) => {
      return executeTransaction(TRANSITIONS.WITHDRAW_COLLATERAL, [receiptRecord]);
    },
    [executeTransaction],
  );

  const updateOraclePrice = useCallback(
    async (priceMicro: number, round: number) => {
      return executeTransaction(TRANSITIONS.UPDATE_ORACLE_PRICE, [
        microCreditsToInput(priceMicro),
        `${round}u64`,
      ]);
    },
    [executeTransaction],
  );

  /** Convert public credits to a private record (needed before supply_collateral) */
  const convertCreditsToPrivate = useCallback(
    async (amountMicro: number) => {
      if (!wallet.connected || !wallet.requestTransaction) {
        toast.error('Please connect your wallet first');
        return null;
      }

      try {
        setTransactionPending(true);
        setTransactionStep('encrypting');

        const tx = createAleoTransaction(
          CREDITS_PROGRAM,
          'transfer_public_to_private',
          [`${wallet.address ?? ''}`, microCreditsToInput(amountMicro)],
          TX_FEE,
        );

        setTransactionStep('proving');
        const result = await wallet.requestTransaction(tx);
        const txId = result?.transactionId ?? '';
        if (!txId) throw new Error('No transaction ID returned');
        setTransactionId(txId);
        setTransactionStep('broadcasting');
        toast.success('Converting credits to private record...');

        const pollResult = await pollTransactionStatus(txId, wallet);
        if (pollResult.confirmed === true) {
          setTransactionStep('confirmed');
          toast.success('Credits converted to private record!');
        } else if (pollResult.confirmed === false) {
          setTransactionStep('failed');
          toast.error('Conversion failed on-chain.');
        } else {
          setTransactionStep('confirmed');
          toast.success(`Conversion broadcast. Check explorer: ${txId}`);
        }

        setTransactionPending(false);
        return txId;
      } catch (error) {
        setTransactionStep('failed');
        setTransactionPending(false);
        const message = error instanceof Error ? error.message : 'Conversion failed';
        toast.error(message);
        return null;
      }
    },
    [wallet, setTransactionPending, setTransactionStep, setTransactionId],
  );

  /** Transfer USDCx from user to the lending protocol address */
  const fundProtocol = useCallback(
    async (amountMicro: number) => {
      if (!wallet.connected || !wallet.requestTransaction) {
        toast.error('Please connect your wallet first');
        return null;
      }

      try {
        setTransactionPending(true);
        setTransactionStep('encrypting');

        const tx = createAleoTransaction(
          USDCX_PROGRAM,
          'transfer_public',
          [PROTOCOL_ADDRESS, `${amountMicro}u128`],
          TX_FEE,
        );

        setTransactionStep('proving');
        const result = await wallet.requestTransaction(tx);
        const txId = result?.transactionId ?? '';
        if (!txId) throw new Error('No transaction ID returned');
        setTransactionId(txId);
        setTransactionStep('broadcasting');
        toast.success('Fund protocol transaction submitted');

        const pollResult = await pollTransactionStatus(txId, wallet);
        if (pollResult.confirmed === true) {
          setTransactionStep('confirmed');
          toast.success('Protocol funded with USDCx!');
        } else if (pollResult.confirmed === false) {
          setTransactionStep('failed');
          toast.error('Fund transaction rejected. Check your USDCx balance.');
        } else {
          setTransactionStep('confirmed');
          toast.success(`Fund transaction broadcast. Check explorer: ${txId}`);
        }

        setTransactionPending(false);
        return txId;
      } catch (error) {
        setTransactionStep('failed');
        setTransactionPending(false);
        const message = error instanceof Error ? error.message : 'Fund transaction failed';
        toast.error(message);
        return null;
      }
    },
    [wallet, setTransactionPending, setTransactionStep, setTransactionId],
  );

  return {
    executeTransaction,
    supplyCollateral,
    borrow,
    repay,
    approveUSDCx,
    liquidate,
    withdrawCollateral,
    updateOraclePrice,
    convertCreditsToPrivate,
    fundProtocol,
    resetTransaction,
  };
}

interface PollResult {
  confirmed: boolean | null;
  realTxId?: string;
}

async function pollTransactionStatus(
  txId: string,
  wallet: WalletExecute,
  maxAttempts = 60,
  interval = 5000,
): Promise<PollResult> {
  // Also try the public API as a fallback
  const apiBase = 'https://api.explorer.provable.com/v1/testnet';

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    // Try wallet adapter status first
    if (wallet.transactionStatus) {
      try {
        const response = await wallet.transactionStatus(txId);
        const status = (response.status || '').toLowerCase();
        // Extract real Aleo transaction ID from wallet response
        const resp = response as Record<string, unknown>;
        const realId = (resp.transactionId ?? resp.transaction_id ?? resp.id ?? '') as string;
        const realTxId = (typeof realId === 'string' && realId.startsWith('at1')) ? realId : undefined;
        console.log(`[DARA] Poll ${i + 1}/${maxAttempts} wallet status: ${status}${realTxId ? ` realTxId: ${realTxId}` : ''}`);
        if (status === 'finalized' || status === 'accepted' || status === 'confirmed' || status === 'completed') {
          return { confirmed: true, realTxId };
        }
        if (status === 'failed' || status === 'rejected') {
          return { confirmed: false, realTxId };
        }
      } catch {
        // Wallet status check failed, try API
      }
    }

    // Fallback: check the explorer API
    try {
      const cleanId = txId.trim();
      const res = await fetch(`${apiBase}/transaction/${cleanId}`);
      if (res.ok) {
        const data = await res.json();
        const txType = data?.type;
        const realTxId = (typeof data?.id === 'string' && data.id.startsWith('at1')) ? data.id : undefined;
        console.log(`[DARA] Poll ${i + 1}/${maxAttempts} API type: ${txType}`);
        if (txType === 'execute' || txType === 'accepted') return { confirmed: true, realTxId };
        if (txType === 'rejected') return { confirmed: false, realTxId };
      }
    } catch {
      // API check failed, continue polling
    }
  }
  // Timed out — transaction status unknown
  return { confirmed: null };
}
