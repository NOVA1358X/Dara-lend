import { useEffect, useState } from 'react';

interface MousePosition {
  x: number;
  y: number;
}

export function useMousePosition() {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    let rafId: number;
    let latestX = 0;
    let latestY = 0;
    let ticking = false;

    const handleMouseMove = (e: MouseEvent) => {
      latestX = e.clientX;
      latestY = e.clientY;
      if (!ticking) {
        ticking = true;
        rafId = requestAnimationFrame(() => {
          setPosition({ x: latestX, y: latestY });
          ticking = false;
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return position;
}
