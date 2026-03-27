import { motion, type Variants } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { type ReactNode } from 'react';

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  threshold?: number;
}

const container: Variants = {
  hidden: {},
  visible: (staggerDelay: number) => ({
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: 0.1,
    },
  }),
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export function StaggerContainer({
  children,
  className = '',
  staggerDelay = 0.1,
  threshold = 0.15,
}: StaggerContainerProps) {
  const { ref, inView } = useScrollReveal({ threshold });

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={container}
      custom={staggerDelay}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
    >
      {children}
    </motion.div>
  );
}
