import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PROGRAM_ID, ALEO_TESTNET_API, MAPPINGS } from '@/utils/constants';

/**
 * Interactive two-slope kink interest rate curve visualization.
 * Fetches on-chain rate parameters and renders the borrow/supply APY curves.
 */

async function fetchMapping(mapping: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(`${ALEO_TESTNET_API}/program/${PROGRAM_ID}/mapping/${mapping}/${key}`);
    if (!res.ok) return null;
    const text = await res.text();
    return text.replace(/"/g, '').trim() || null;
  } catch {
    return null;
  }
}

function parseU64(raw: string | null, fallback: number = 0): number {
  if (!raw) return fallback;
  return parseInt(raw.replace(/u64|\.public|\.private/g, '').trim(), 10) || fallback;
}

interface RateParams {
  baseRate: number;
  slope1: number;
  slope2: number;
  optimalUtil: number;
}

interface CurvePoint {
  utilization: number;
  borrowRate: number;
  supplyRate: number;
}

const RESERVE_FACTOR = 0.10; // 10%

function computeCurve(params: RateParams): CurvePoint[] {
  const points: CurvePoint[] = [];
  const optimal = params.optimalUtil / 10000;

  for (let u = 0; u <= 100; u++) {
    const util = u / 100;
    let borrowRate: number;

    if (util <= optimal) {
      // Below kink: gentle slope
      borrowRate = params.baseRate + (util / optimal) * params.slope1;
    } else {
      // Above kink: steep slope
      const excess = (util - optimal) / (1 - optimal);
      borrowRate = params.baseRate + params.slope1 + excess * params.slope2;
    }

    const supplyRate = borrowRate * util * (1 - RESERVE_FACTOR);

    points.push({
      utilization: u,
      borrowRate: borrowRate / 100, // Convert BPS to %
      supplyRate: supplyRate / 100,
    });
  }

  return points;
}

export function RateCurveChart() {
  const [params, setParams] = useState<RateParams>({
    baseRate: 200,
    slope1: 400,
    slope2: 7500,
    optimalUtil: 8000,
  });
  const [currentUtil, setCurrentUtil] = useState<number | null>(null);
  const [currentBorrowApy, setCurrentBorrowApy] = useState<number | null>(null);
  const [currentSupplyApy, setCurrentSupplyApy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchParams() {
      setLoading(true);
      const [baseRaw, slope1Raw, slope2Raw, optimalRaw, borrowApyRaw, supplyApyRaw] = await Promise.all([
        fetchMapping(MAPPINGS.RATE_BASE_BPS, '0u8'),
        fetchMapping(MAPPINGS.RATE_SLOPE1_BPS, '0u8'),
        fetchMapping(MAPPINGS.RATE_SLOPE2_BPS, '0u8'),
        fetchMapping(MAPPINGS.RATE_OPTIMAL_UTIL, '0u8'),
        fetchMapping(MAPPINGS.BORROW_APY_BPS, '0u8'),
        fetchMapping(MAPPINGS.SUPPLY_APY_BPS, '0u8'),
      ]);

      setParams({
        baseRate: parseU64(baseRaw, 200),
        slope1: parseU64(slope1Raw, 400),
        slope2: parseU64(slope2Raw, 7500),
        optimalUtil: parseU64(optimalRaw, 8000),
      });

      const borrowApy = parseU64(borrowApyRaw);
      const supplyApy = parseU64(supplyApyRaw);
      if (borrowApy > 0) setCurrentBorrowApy(borrowApy / 100);
      if (supplyApy > 0) setCurrentSupplyApy(supplyApy / 100);

      setLoading(false);
    }

    fetchParams();
    const interval = setInterval(fetchParams, 60_000);
    return () => clearInterval(interval);
  }, []);

  const curve = useMemo(() => computeCurve(params), [params]);
  const maxRate = useMemo(() => Math.max(...curve.map(p => p.borrowRate), 10), [curve]);

  // SVG dimensions
  const W = 600;
  const H = 300;
  const PAD = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const toX = (util: number) => PAD.left + (util / 100) * chartW;
  const toY = (rate: number) => PAD.top + chartH - (rate / maxRate) * chartH;

  const borrowPath = curve.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${toX(p.utilization).toFixed(1)} ${toY(p.borrowRate).toFixed(1)}`
  ).join(' ');

  const supplyPath = curve.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${toX(p.utilization).toFixed(1)} ${toY(p.supplyRate).toFixed(1)}`
  ).join(' ');

  const kinkX = toX(params.optimalUtil / 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 rounded-xl p-6 border border-white/10"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Interest Rate Curve</h3>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-400 inline-block rounded" /> Borrow APY
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-emerald-400 inline-block rounded" /> Supply APY
          </span>
        </div>
      </div>

      {/* Parameter pills */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <span className="bg-white/10 text-gray-300 px-2 py-1 rounded">
          Base: {(params.baseRate / 100).toFixed(1)}%
        </span>
        <span className="bg-white/10 text-gray-300 px-2 py-1 rounded">
          Slope₁: {(params.slope1 / 100).toFixed(1)}%
        </span>
        <span className="bg-white/10 text-gray-300 px-2 py-1 rounded">
          Slope₂: {(params.slope2 / 100).toFixed(1)}%
        </span>
        <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
          Kink: {(params.optimalUtil / 100).toFixed(0)}%
        </span>
        {currentBorrowApy !== null && (
          <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
            Current Borrow: {currentBorrowApy.toFixed(2)}%
          </span>
        )}
        {currentSupplyApy !== null && (
          <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded">
            Current Supply: {currentSupplyApy.toFixed(2)}%
          </span>
        )}
      </div>

      {/* SVG Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 300 }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(u => (
          <line
            key={`grid-v-${u}`}
            x1={toX(u)} y1={PAD.top}
            x2={toX(u)} y2={PAD.top + chartH}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
          const rate = frac * maxRate;
          return (
            <g key={`grid-h-${frac}`}>
              <line
                x1={PAD.left} y1={toY(rate)}
                x2={PAD.left + chartW} y2={toY(rate)}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={toY(rate) + 4}
                textAnchor="end"
                fill="rgba(255,255,255,0.4)"
                fontSize={10}
              >
                {rate.toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* Kink line */}
        <line
          x1={kinkX} y1={PAD.top}
          x2={kinkX} y2={PAD.top + chartH}
          stroke="rgba(96,165,250,0.3)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <text
          x={kinkX}
          y={PAD.top - 4}
          textAnchor="middle"
          fill="rgba(96,165,250,0.6)"
          fontSize={9}
        >
          Kink {(params.optimalUtil / 100).toFixed(0)}%
        </text>

        {/* Supply curve (filled area) */}
        <path
          d={`${supplyPath} L ${toX(100).toFixed(1)} ${toY(0).toFixed(1)} L ${toX(0).toFixed(1)} ${toY(0).toFixed(1)} Z`}
          fill="rgba(52,211,153,0.08)"
        />
        <path
          d={supplyPath}
          fill="none"
          stroke="#34D399"
          strokeWidth={2}
        />

        {/* Borrow curve */}
        <path
          d={borrowPath}
          fill="none"
          stroke="#60A5FA"
          strokeWidth={2}
        />

        {/* X axis labels */}
        {[0, 25, 50, 75, 100].map(u => (
          <text
            key={`label-${u}`}
            x={toX(u)}
            y={PAD.top + chartH + 20}
            textAnchor="middle"
            fill="rgba(255,255,255,0.4)"
            fontSize={10}
          >
            {u}%
          </text>
        ))}
        <text
          x={PAD.left + chartW / 2}
          y={H - 4}
          textAnchor="middle"
          fill="rgba(255,255,255,0.3)"
          fontSize={11}
        >
          Utilization Rate
        </text>
        <text
          x={12}
          y={PAD.top + chartH / 2}
          textAnchor="middle"
          fill="rgba(255,255,255,0.3)"
          fontSize={11}
          transform={`rotate(-90, 12, ${PAD.top + chartH / 2})`}
        >
          APY (%)
        </text>
      </svg>

      {loading && (
        <p className="text-xs text-gray-500 mt-2 text-center">Loading on-chain parameters...</p>
      )}
    </motion.div>
  );
}
