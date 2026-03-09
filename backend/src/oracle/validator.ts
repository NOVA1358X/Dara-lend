import type { AggregatedPrice } from './aggregator.js';

const PRICE_FLOOR = 0.001;    // $0.001
const PRICE_CEILING = 1000;    // $1000
const MAX_DEVIATION = 0.20;    // 20% off-chain deviation cap

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validatePrice(
  aggregated: AggregatedPrice,
  currentOnChainPrice: number,
  precision: number,
): ValidationResult {
  // Must have at least 2 agreeing sources
  if (aggregated.confidence === 'none') {
    return { valid: false, reason: 'No price sources available' };
  }
  if (aggregated.confidence === 'low') {
    return { valid: false, reason: 'Only 1 source available — need at least 2' };
  }

  const price = aggregated.medianPrice;

  // Bounds check
  if (price < PRICE_FLOOR || price > PRICE_CEILING) {
    return { valid: false, reason: `Price $${price} outside bounds [$${PRICE_FLOOR}, $${PRICE_CEILING}]` };
  }

  // Off-chain deviation check against current on-chain price
  if (currentOnChainPrice > 0) {
    const onChainUsd = currentOnChainPrice / precision;
    const deviation = Math.abs(price - onChainUsd) / onChainUsd;
    if (deviation > MAX_DEVIATION) {
      return {
        valid: false,
        reason: `Deviation ${(deviation * 100).toFixed(1)}% exceeds off-chain cap of ${MAX_DEVIATION * 100}%`,
      };
    }
  }

  return { valid: true };
}
