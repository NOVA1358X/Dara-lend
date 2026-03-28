import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { AnimatedCounter } from '@/components/shared/AnimatedCounter';
import { FloatingParticles } from '@/components/shared/FloatingParticles';
import { Aurora } from '@/components/shared/Aurora';

export function CrossChainSection() {
  const { ref, inView } = useScrollReveal({ threshold: 0.3 });

  const numbers = [
    { value: 100, label: 'Privacy Score', suffix: '%', decimals: 0 },
    { value: 5, label: 'Independent Price Sources', suffix: '', decimals: 0 },
    { value: 3, label: 'Supported Collateral Types', suffix: '', decimals: 0 },
    { value: 0, label: 'Data Leaked — Ever', suffix: '', decimals: 0 },
  ];

  return (
    <section id="numbers" ref={ref} className="relative py-section-mobile md:py-section overflow-hidden">
      {/* Video background */}
      <div className="absolute inset-0">
        <video
          autoPlay muted loop playsInline
          className="w-full h-full object-cover opacity-20"
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_024928_1efd0b0d-6c02-45a8-8847-1030900c4f63.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/70" />
        <Aurora colorStops={['#1a3a5c', '#2a1a4c', '#0a2a3c']} amplitude={1.2} blend={0.7} speed={0.6} />
        <FloatingParticles count={30} maxSize={1.5} speed={0.15} color="214, 197, 161" />
      </div>

      <div className="relative z-10 max-w-[1280px] mx-auto px-6">
        <div className="text-center mb-20">
          <span className="font-label text-label uppercase tracking-[0.3em] text-secondary mb-4 block">
            By the Numbers
          </span>
          <h2 className="font-headline text-section-mobile md:text-section text-text-primary">
            Privacy You Can Measure
          </h2>
          <p className="text-[17px] text-text-secondary font-light mt-4 max-w-[500px] mx-auto">
            Real metrics from a real protocol — not promises, not paper designs.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {numbers.map((num, i) => (
            <motion.div
              key={num.label}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-center"
            >
              <div className="font-headline text-stat-mobile md:text-stat signature-text-gradient stat-glow mb-2">
                <AnimatedCounter
                  value={num.value}
                  decimals={num.decimals}
                  suffix={num.suffix}
                  duration={1500}
                  className="font-headline signature-text-gradient"
                />
              </div>
              <p className="font-label text-[10px] uppercase tracking-[0.25em] text-text-muted">
                {num.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
