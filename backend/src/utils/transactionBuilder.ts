import { execFile } from 'node:child_process';
import { config } from './config.js';

export function executeTransition(
  transition: string,
  inputs: string[],
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      'developer',
      'execute',
      config.programId,
      transition,
      ...inputs,
      '--private-key',
      config.privateKey,
      '--query',
      config.aleoRpcUrl,
      '--broadcast',
      `${config.aleoRpcUrl}/transaction/broadcast`,
      '--fee',
      '500000',
    ];

    execFile('snarkos', args, { timeout: 120_000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Transaction failed: ${stderr || error.message}`));
        return;
      }
      const txIdMatch = stdout.match(/at1[a-z0-9]+/);
      resolve(txIdMatch ? txIdMatch[0] : stdout.trim());
    });
  });
}
