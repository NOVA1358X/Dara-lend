/**
 * Transaction builder — DEPRECATED.
 *
 * On-chain writes are now handled by the frontend wallet (Shield wallet handles proving).
 * The backend is a read-only price aggregation service.
 * This file is kept for reference but is not imported anywhere.
 */

export async function executeTransition(
  _transition: string,
  _inputs: string[],
): Promise<string> {
  throw new Error(
    'Backend no longer handles on-chain writes. ' +
    'Oracle updates are submitted via the frontend wallet.',
  );
}
