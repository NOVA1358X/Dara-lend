export interface PriceResult {
  source: string;
  price: number;
  timestamp: number;
}

export type PriceFetcher = () => Promise<PriceResult>;
