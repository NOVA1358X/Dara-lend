import { useState, useEffect, useRef } from 'react';

import { BACKEND_API } from '@/utils/constants';

const PRICE_API_URL = `${BACKEND_API}/price`;
const REFRESH_INTERVAL = 300_000; // 5 minutes

interface MarketPriceResult {
  price: number | null;
  loading: boolean;
  lastUpdated: Date | null;
  refresh: () => void;
}

// Module-level cache so all components share the same price
let cachedPrice: number | null = null;
let cachedAt: Date | null = null;
let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

async function fetchPrice() {
  try {
    const res = await fetch(PRICE_API_URL);
    if (res.ok) {
      const data = await res.json();
      const p = data?.price;
      if (typeof p === 'number' && p > 0) {
        cachedPrice = p;
        cachedAt = new Date();
        notifyListeners();
      }
    }
  } catch {
    // silently fail — keep last known price
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

function startPolling() {
  if (intervalId) return;
  fetchPrice();
  intervalId = setInterval(fetchPrice, REFRESH_INTERVAL);
}

function stopPolling() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function useMarketPrice(): MarketPriceResult {
  const [, forceUpdate] = useState(0);
  const [loading, setLoading] = useState(cachedPrice === null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const listener = () => {
      if (mounted.current) {
        setLoading(false);
        forceUpdate((n) => n + 1);
      }
    };

    listeners.push(listener);
    startPolling();

    // If we already have a cached price, no loading state
    if (cachedPrice !== null) setLoading(false);

    return () => {
      mounted.current = false;
      listeners = listeners.filter((l) => l !== listener);
      if (listeners.length === 0) stopPolling();
    };
  }, []);

  return {
    price: cachedPrice,
    loading,
    lastUpdated: cachedAt,
    refresh: fetchPrice,
  };
}
