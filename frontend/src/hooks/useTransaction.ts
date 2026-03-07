import { useCallback } from 'react';
import { PROGRAM_ID, TX_FEE, TRANSITIONS } from '@/utils/constants';
import { microCreditsToInput, microCreditsToU128Input, fieldToInput } from '@/utils/formatting';
import { useAppStore } from '@/stores/appStore';
import toast from 'react-hot-toast';

interface WalletExecute {
  requestTransaction?: (transaction: unknown) => Promise<{ transactionId: string } | undefined>;
  transactionStatus?: (txId: string) => Promise<{ status: string }>;
  connected: boolean;
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

        const confirmed = await pollTransactionStatus(txId, wallet);
        if (confirmed) {
          setTransactionStep('confirmed');
          toast.success('Transaction confirmed');
        } else {
          setTransactionStep('failed');
          toast.error('Transaction may still be processing. Check your wallet.');
        }

        return txId;
      } catch (error) {
        setTransactionStep('failed');
        const message = error instanceof Error ? error.message : 'Transaction failed';
        toast.error(message);
        return null;
      }
    },
    [wallet, setTransactionPending, setTransactionStep, setTransactionId],
  );

  const supplyCollateral = useCallback(
    async (amount: number, nonce: number) => {
      return executeTransaction(TRANSITIONS.SUPPLY_COLLATERAL, [
        microCreditsToInput(amount),
        fieldToInput(nonce),
      ]);
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

  return {
    executeTransaction,
    supplyCollateral,
    borrow,
    repay,
    liquidate,
    withdrawCollateral,
    resetTransaction,
  };
}

async function pollTransactionStatus(
  txId: string,
  wallet: WalletExecute,
  maxAttempts = 20,
  interval = 3000,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    if (wallet.transactionStatus) {
      try {
        const response = await wallet.transactionStatus(txId);
        const status = response.status;
        if (status === 'Finalized' || status === 'Accepted' || status === 'confirmed') {
          return true;
        }
        if (status === 'Failed' || status === 'Rejected') {
          return false;
        }
      } catch {
        continue;
      }
    }
  }
  return false;
}
