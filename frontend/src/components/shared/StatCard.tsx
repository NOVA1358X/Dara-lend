import { useRef, useState, type MouseEvent } from 'react';
import { LoadingSkeleton } from './LoadingSkeleton';

interface StatCardProps {
  label: string;
  value: string;
  loading?: boolean;
  trend?: { direction: 'up' | 'down'; value: string };
  className?: string;
  mono?: boolean;
}

export function StatCard({
  label,
  value,
  loading = false,
  trend,
  className = '',
  mono = true,
}: StatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-card glass-panel-sm p-5 transition-all duration-400 hover:-translate-y-0.5 hover:border-white/[0.12] card-shine ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Spotlight effect */}
      {hovered && (
        <div
          className="absolute pointer-events-none w-[300px] h-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-500"
          style={{
            left: mousePos.x,
            top: mousePos.y,
            background: 'radial-gradient(circle, rgba(201, 221, 255, 0.06) 0%, transparent 70%)',
          }}
        />
      )}
      <div className="relative z-10">
        <p className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] mb-2">
          {label}
        </p>
        {loading ? (
          <LoadingSkeleton width="80%" height={32} />
        ) : (
          <div className="flex items-end gap-2">
            <p
              className={`text-2xl font-semibold text-text-primary ${
                mono ? 'font-mono tabular-nums' : 'font-headline'
              }`}
            >
              {value}
            </p>
            {trend && (
              <span
                className={`text-xs font-medium mb-1 ${
                  trend.direction === 'up'
                    ? 'text-accent-success'
                    : 'text-accent-danger'
                }`}
              >
                {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
