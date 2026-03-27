import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  opacity: number;
  twinklePhase: number;
  twinkleSpeed: number;
  hue: number;
}

interface GalaxyProps {
  density?: number;
  speed?: number;
  starSpeed?: number;
  hueShift?: number;
  saturation?: number;
  glowIntensity?: number;
  twinkleIntensity?: number;
  rotationSpeed?: number;
  mouseRepulsion?: boolean;
  repulsionStrength?: number;
  transparent?: boolean;
}

export function Galaxy({
  density = 0.7,
  speed = 1,
  starSpeed = 0.4,
  hueShift = 140,
  saturation = 0,
  glowIntensity = 0.05,
  twinkleIntensity = 0.3,
  rotationSpeed = 0.1,
  mouseRepulsion = true,
  repulsionStrength = 2,
  transparent = false,
}: GalaxyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const starsRef = useRef<Star[]>([]);
  const frameRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStars();
    };

    const initStars = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const count = Math.floor((w * h * density) / 2000);
      starsRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random(),
        size: Math.random() * 1.8 + 0.3,
        opacity: Math.random() * 0.6 + 0.2,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        hue: hueShift + (Math.random() - 0.5) * 30,
      }));
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      timeRef.current += speed * 0.016;

      if (!transparent) {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.clearRect(0, 0, w, h);
      }

      // Subtle nebula glow
      if (glowIntensity > 0) {
        const cx = w * 0.5 + Math.sin(timeRef.current * 0.1) * w * 0.1;
        const cy = h * 0.5 + Math.cos(timeRef.current * 0.08) * h * 0.1;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.5);
        grad.addColorStop(0, `hsla(${hueShift}, ${saturation}%, 70%, ${glowIntensity})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      const cosR = Math.cos(timeRef.current * rotationSpeed * 0.01);
      const sinR = Math.sin(timeRef.current * rotationSpeed * 0.01);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const star of starsRef.current) {
        // Slow drift
        star.x += starSpeed * speed * (0.5 + star.z * 0.5) * 0.3;
        star.y += starSpeed * speed * star.z * 0.1;

        // Wrap
        if (star.x > w + 5) star.x = -5;
        if (star.x < -5) star.x = w + 5;
        if (star.y > h + 5) star.y = -5;
        if (star.y < -5) star.y = h + 5;

        // Subtle rotation around center
        const dx = star.x - w * 0.5;
        const dy = star.y - h * 0.5;
        const rx = dx * cosR - dy * sinR + w * 0.5;
        const ry = dx * sinR + dy * cosR + h * 0.5;

        let drawX = rx;
        let drawY = ry;

        // Mouse repulsion
        if (mouseRepulsion) {
          const mdx = drawX - mx;
          const mdy = drawY - my;
          const dist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (dist < 120) {
            const force = ((120 - dist) / 120) * repulsionStrength;
            drawX += (mdx / dist) * force;
            drawY += (mdy / dist) * force;
          }
        }

        // Twinkle
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = 1 + Math.sin(star.twinklePhase) * twinkleIntensity;
        const alpha = star.opacity * twinkle;

        const color = saturation > 0
          ? `hsla(${star.hue}, ${saturation}%, 85%, ${alpha})`
          : `rgba(210, 216, 230, ${alpha})`;

        ctx.beginPath();
        ctx.arc(drawX, drawY, star.size * (0.6 + star.z * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    if (mouseRepulsion) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseleave', handleMouseLeave);
    }
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
      if (mouseRepulsion) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [density, speed, starSpeed, hueShift, saturation, glowIntensity, twinkleIntensity, rotationSpeed, mouseRepulsion, repulsionStrength, transparent]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-auto"
      style={{ zIndex: 0 }}
    />
  );
}
