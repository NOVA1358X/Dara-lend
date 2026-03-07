import { useRef, useState, type ReactNode, type MouseEvent } from 'react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlowCard({
  children,
  className = '',
  glowColor = 'rgba(0, 229, 204, 0.06)',
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setGlowPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-card bg-bg-tertiary border border-transparent hover:border-border-default transition-all duration-200 hover:-translate-y-0.5 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <div
          className="absolute pointer-events-none w-[300px] h-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-300"
          style={{
            left: glowPos.x,
            top: glowPos.y,
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            opacity: isHovered ? 1 : 0,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
