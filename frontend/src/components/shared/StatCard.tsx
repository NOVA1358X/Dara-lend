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
  return (
    <div
      className={`rounded-card bg-bg-tertiary p-5 hover:border hover:border-border-default border border-transparent transition-all duration-200 ${className}`}
    >
      <p className="text-label uppercase text-text-muted tracking-widest mb-2">
        {label}
      </p>
      {loading ? (
        <LoadingSkeleton width="80%" height={32} />
      ) : (
        <div className="flex items-end gap-2">
          <p
            className={`text-2xl font-semibold text-text-primary ${
              mono ? 'font-mono tabular-nums' : 'font-heading'
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
  );
}
