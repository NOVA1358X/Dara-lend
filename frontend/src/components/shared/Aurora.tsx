import { useEffect, useRef } from 'react';

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  speed?: number;
  className?: string;
}

export function Aurora({
  colorStops = ['#5227FF', '#66ffa1', '#5227FF'],
  amplitude = 1,
  blend = 0.5,
  speed = 1,
  className = '',
}: AuroraProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.style.setProperty('--aurora-speed', `${8 / speed}s`);
    el.style.setProperty('--aurora-blend', `${blend * 100}px`);
    el.style.setProperty('--aurora-amp', `${amplitude * 30}%`);

    colorStops.forEach((color, i) => {
      el.style.setProperty(`--aurora-c${i}`, color);
    });
  }, [colorStops, amplitude, blend, speed]);

  const blobCount = colorStops.length;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ isolation: 'isolate' }}
    >
      <div
        className="absolute inset-0"
        style={{ filter: `blur(${blend * 120}px)` }}
      >
        {Array.from({ length: blobCount }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              background: `radial-gradient(circle, ${colorStops[i]} 0%, transparent 70%)`,
              width: `${50 + amplitude * 20}%`,
              height: `${50 + amplitude * 20}%`,
              left: `${(i / blobCount) * 60 + 10}%`,
              top: `${30 + (i % 2 === 0 ? -1 : 1) * amplitude * 15}%`,
              transform: 'translate(-50%, -50%)',
              opacity: 0.6,
              animation: `aurora-drift-${i % 3} ${8 / speed}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes aurora-drift-0 {
          0% { transform: translate(-50%, -50%) scale(1); }
          100% { transform: translate(calc(-50% + var(--aurora-amp, 30%)), calc(-50% - var(--aurora-amp, 30%))) scale(1.2); }
        }
        @keyframes aurora-drift-1 {
          0% { transform: translate(-50%, -50%) scale(1.1); }
          100% { transform: translate(calc(-50% - var(--aurora-amp, 30%)), calc(-50% + var(--aurora-amp, 30%))) scale(0.9); }
        }
        @keyframes aurora-drift-2 {
          0% { transform: translate(-50%, -50%) scale(0.9); }
          100% { transform: translate(calc(-50% + var(--aurora-amp, 15%)), calc(-50% + var(--aurora-amp, 15%))) scale(1.15); }
        }
      `}</style>
    </div>
  );
}
