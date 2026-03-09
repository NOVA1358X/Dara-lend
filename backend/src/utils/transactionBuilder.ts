import {
  ProgramManager,
  AleoNetworkClient,
  Account,
  AleoKeyProvider,
  NetworkRecordProvider,
} from '@provablehq/sdk';
import { config } from './config.js';

let programManager: InstanceType<typeof ProgramManager> | null = null;

function getProgramManager(): InstanceType<typeof ProgramManager> {
  if (!programManager) {
    const networkClient = new AleoNetworkClient(config.aleoRpcUrl);
    const account = new Account({ privateKey: config.privateKey });
    const keyProvider = new AleoKeyProvider();
    keyProvider.useCache(true);
    const recordProvider = new NetworkRecordProvider(account, networkClient);
    programManager = new ProgramManager(config.aleoRpcUrl, keyProvider, recordProvider);
    programManager.setAccount(account);
  }
  return programManager;
}

/**
 * Execute a transition on the dara_lend_v4 program.
 *
 * Uses delegated proving via the Provable API when an API key is configured,
 * falling back to local WASM proving (slower first run, cached after).
 */
export async function executeTransition(
  transition: string,
  inputs: string[],
): Promise<string> {
  const pm = getProgramManager();

  // Delegated proving path — fast (~15s) via Provable API
  if (config.provableApiKey) {
    console.log(`[tx] Using delegated proving for ${transition}`);
    const provingReq = await pm.provingRequest({
      programName: config.programId,
      functionName: transition,
      inputs,
      priorityFee: 0.5,
      privateFee: false,
      broadcast: true,
    });
    const response = await pm.networkClient.submitProvingRequest({
      provingRequest: provingReq,
      apiKey: config.provableApiKey,
      consumerId: config.provableConsumerId,
    });
    const txId = response?.transaction?.id;
    if (!txId) throw new Error('Delegated proving returned no transaction ID');
    return txId;
  }

  // Local WASM proving is not viable for dara_lend_v4.aleo — it has 5 imported
  // programs which causes WASM key synthesis to hang indefinitely.
  // Require PROVABLE_API_KEY and PROVABLE_CONSUMER_ID in .env for delegated proving.
  throw new Error(
    'Local proving is not supported for programs with 4+ imports (WASM hang). ' +
    'Set PROVABLE_API_KEY and PROVABLE_CONSUMER_ID in .env to use delegated proving.',
  );
}
