import { useMemo } from 'react';

interface HealthFactorGaugeProps {
  value: number;
  size?: number;
  className?: string;
}

export function HealthFactorGauge({ value, size = 120, className = '' }: HealthFactorGaugeProps) {
  const { color, label, percentage } = useMemo(() => {
    const clamped = Math.min(Math.max(value, 0), 5);
    const pct = Math.min(clamped / 3, 1);

    let c: string;
    let l: string;

    if (value >= 2.0) {
      c = '#34D399';
      l = 'Safe';
    } else if (value >= 1.5) {
      c = '#00E5CC';
      l = 'Moderate';
    } else if (value >= 1.2) {
      c = '#F59E0B';
      l = 'At Risk';
    } else {
      c = '#EF4444';
      l = 'Danger';
    }

    return { color: c, label: l, percentage: pct };
  }, [value]);

  const radius = (size - 12) / 2;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage);
  const centerX = size / 2;
  const centerY = size / 2 + 4;

  const displayValue = value === Infinity ? '∞' : value.toFixed(2);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
        <path
          d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={8}
          strokeLinecap="round"
        />
        <path
          d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.3s ease' }}
        />
        <text
          x={centerX}
          y={centerY - 8}
          textAnchor="middle"
          fill="#F0F0F0"
          fontSize={size * 0.2}
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="600"
        >
          {displayValue}
        </text>
      </svg>
      <span
        className="text-[11px] font-medium uppercase tracking-wider mt-1"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}
