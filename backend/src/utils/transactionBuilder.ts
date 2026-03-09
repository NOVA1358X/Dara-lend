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
 * Execute a transition on the dara_lend_v3 program.
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

  // Local proving path — first run synthesizes keys (slow), subsequent runs use cache
  console.log(`[tx] Using local proving for ${transition} (keys will be cached after first run)`);
  const txId = await pm.execute({
    programName: config.programId,
    functionName: transition,
    inputs,
    priorityFee: 0.5,
    privateFee: false,
  });
  if (!txId) throw new Error('Transaction returned no ID');
  return txId;
}
