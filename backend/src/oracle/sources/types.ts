export interface PriceResult {
  source: string;
  price: number;
  timestamp: number;
}

export type PriceFetcher = (symbol?: string) => Promise<PriceResult>;
