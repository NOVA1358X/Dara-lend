import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react';
import { motion, useAnimationFrame } from 'framer-motion';

interface VelocityScrollProps {
  children: ReactNode;
  baseVelocity?: number;
  className?: string;
  damping?: number;
}

function wrap(min: number, max: number, v: number) {
  const range = max - min;
  const mod = ((v - min) % range + range) % range;
  return mod + min;
}

export function VelocityScroll({
  children,
  baseVelocity = -2,
  className = '',
  damping = 0.95,
}: VelocityScrollProps) {
  const baseX = useRef(0);
  const scrollVelocity = useRef(0);
  const lastScroll = useRef(0);
  const directionFactor = useRef(1);
  const [translateX, setTranslateX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const currentScroll = window.scrollY;
    const delta = currentScroll - lastScroll.current;
    lastScroll.current = currentScroll;
    scrollVelocity.current = delta;
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useAnimationFrame((_, delta) => {
    const dt = delta / 1000;

    // Apply scroll velocity as a gentle boost (capped)
    const rawBoost = scrollVelocity.current * 0.008;
    const scrollInfluence = Math.max(-3, Math.min(3, rawBoost));
    scrollVelocity.current *= damping;

    // Track direction
    if (baseVelocity + scrollInfluence < 0) {
      directionFactor.current = -1;
    } else if (baseVelocity + scrollInfluence > 0) {
      directionFactor.current = 1;
    }

    const moveBy = (baseVelocity + scrollInfluence) * dt * 2.5;
    baseX.current += moveBy;

    // Wrap around at -50% (since we duplicate content 4x)
    baseX.current = wrap(-25, 0, baseX.current);
    setTranslateX(baseX.current);
  });

  return (
    <div className="overflow-hidden" ref={containerRef}>
      <motion.div
        className={`flex whitespace-nowrap ${className}`}
        style={{ x: `${translateX}%` }}
      >
        {/* Repeat content 4 times for seamless wrap */}
        <span className="flex items-center gap-8 shrink-0 pr-8">{children}</span>
        <span className="flex items-center gap-8 shrink-0 pr-8">{children}</span>
        <span className="flex items-center gap-8 shrink-0 pr-8">{children}</span>
        <span className="flex items-center gap-8 shrink-0 pr-8">{children}</span>
      </motion.div>
    </div>
  );
}
