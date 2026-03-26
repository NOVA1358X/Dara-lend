import { config } from './config.js';

/**
 * Build and broadcast a transaction by calling the Aleo API execute endpoint.
 * Uses the admin private key for oracle auto-push and liquidation bot.
 */
export async function buildAndBroadcastTransaction(
  programId: string,
  transition: string,
  inputs: string[],
  fee: number = 500_000,
): Promise<string | null> {
  if (!config.privateKey) {
    console.warn('[tx-builder] No PRIVATE_KEY configured');
    return null;
  }

  try {
    // Use the Aleo SDK for transaction building
    const sdk = await import('@provablehq/sdk');
    const account = new sdk.Account({ privateKey: config.privateKey });
    const pm = new sdk.ProgramManager(
      config.aleoRpcUrl,
      undefined,
      undefined,
    );
    pm.setAccount(account);

    const txId = await pm.execute({
      programName: programId,
      functionName: transition,
      inputs: inputs,
      fee: fee,
      privateFee: false,
    } as any);

    if (txId) {
      console.log(`[tx-builder] Broadcast ${programId}/${transition} → ${txId}`);
      return typeof txId === 'string' ? txId : String(txId);
    }
    return null;
  } catch (err) {
    console.error(`[tx-builder] Failed to execute ${transition}:`, err);
    return null;
  }
}

/**
 * Legacy export for backwards compat
 */
export async function executeTransition(
  transition: string,
  inputs: string[],
): Promise<string> {
  const txId = await buildAndBroadcastTransaction(config.programId, transition, inputs);
  if (!txId) throw new Error('Transaction broadcast failed');
  return txId;
}
