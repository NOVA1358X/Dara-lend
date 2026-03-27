import { type ReactNode } from 'react';

interface BorderBeamProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  size?: number;
  colorFrom?: string;
  colorTo?: string;
}

export function BorderBeam({
  children,
  className = '',
  duration = 6,
  size = 200,
  colorFrom = '#C9DDFF',
  colorTo = '#D6C5A1',
}: BorderBeamProps) {
  return (
    <div className={`relative overflow-hidden rounded-card ${className}`}>
      {/* Animated border beam */}
      <div
        className="absolute inset-0 rounded-card pointer-events-none"
        style={{
          padding: '1px',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'xor',
          WebkitMaskComposite: 'xor',
        }}
      >
        <div
          className="absolute"
          style={{
            width: size,
            height: size,
            background: `conic-gradient(from 0deg, transparent 0%, ${colorFrom} 10%, ${colorTo} 20%, transparent 30%)`,
            borderRadius: '50%',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            animation: `border-beam-spin ${duration}s linear infinite`,
          }}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
