import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { ArrowRightIcon } from '@/components/icons/ArrowRightIcon';

export function CTASection() {
  const { ref, inView } = useScrollReveal();

  return (
    <section className="py-section-mobile md:py-[100px] bg-bg-primary" ref={ref}>
      <div className="max-w-[1280px] mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className="font-heading text-[32px] md:text-cta-headline text-text-primary mb-4"
        >
          Your collateral. Your debt. Your secret.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 20 }}
          className="text-base text-text-secondary mb-10"
        >
          Start borrowing privately on DARA Lend.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 20 }}
        >
          <Link
            to="/app"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-accent text-bg-primary text-base font-medium hover:bg-accent-hover hover:-translate-y-px transition-all duration-200 focus-ring"
          >
            Launch App
            <ArrowRightIcon size={16} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
