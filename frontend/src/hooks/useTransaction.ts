import { useCallback } from 'react';
import { PROGRAM_ID, TX_FEE, TRANSITIONS } from '@/utils/constants';
import { microCreditsToInput, fieldToInput } from '@/utils/formatting';
import { useAppStore } from '@/stores/appStore';
import toast from 'react-hot-toast';

interface WalletExecute {
  requestTransaction?: (transaction: unknown) => Promise<string>;
  transactionStatus?: (txId: string) => Promise<string>;
  connected: boolean;
}

interface TransactionOptions {
  programId: string;
  functionName: string;
  inputs: string[];
  fee: number;
}

function createAleoTransaction(options: TransactionOptions) {
  return {
    type: 'execute',
    programId: options.programId,
    functionName: options.functionName,
    inputs: options.inputs,
    fee: options.fee,
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

        const tx = createAleoTransaction({
          programId: PROGRAM_ID,
          functionName,
          inputs,
          fee,
        });

        setTransactionStep('proving');

        const txId = await wallet.requestTransaction(tx);
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
    async (creditRecord: string, amount: number, nonce: number) => {
      return executeTransaction(TRANSITIONS.SUPPLY_COLLATERAL, [
        creditRecord,
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
        microCreditsToInput(borrowAmount),
        microCreditsToInput(currentPrice),
        orchestrator,
      ]);
    },
    [executeTransaction],
  );

  const repay = useCallback(
    async (debtRecord: string, paymentRecord: string) => {
      return executeTransaction(TRANSITIONS.REPAY, [debtRecord, paymentRecord]);
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
        const status = await wallet.transactionStatus(txId);
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
