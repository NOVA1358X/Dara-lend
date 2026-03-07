import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldIcon } from '@/components/icons/ShieldIcon';
import { ArrowRightIcon } from '@/components/icons/ArrowRightIcon';
import { StatsBar } from './StatsBar';

const wordVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      type: 'spring' as const,
      stiffness: 120,
      damping: 20,
    },
  }),
};

const headlineWords = ['Borrow', 'Without', 'Being', 'Watched.'];

export function HeroSection() {
  return (
    <section className="relative min-h-[700px] h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="/images/bg.png"
          alt=""
          className="w-full h-full object-cover object-center"
          loading="eager"
        />
        <div className="absolute inset-0 hero-gradient" />
      </div>

      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 pb-32">
        <div className="max-w-[620px]">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="flex items-center gap-2 mb-6"
          >
            <ShieldIcon size={12} className="text-accent" />
            <span className="text-label uppercase text-accent tracking-[0.12em]">
              Privacy-First Lending on Aleo
            </span>
          </motion.div>

          <h1 className="font-heading text-hero-mobile md:text-hero text-text-primary mb-5">
            {headlineWords.map((word, i) => (
              <motion.span
                key={word}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={wordVariants}
                className="inline-block mr-[0.3em]"
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 120, damping: 20 }}
            className="text-[17px] leading-relaxed text-text-secondary max-w-[480px] mb-9"
          >
            Your collateral, debt, and liquidation price — encrypted inside zero-knowledge
            proofs. MEV bots can't target what they can't see.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, type: 'spring', stiffness: 120, damping: 20 }}
            className="flex flex-wrap items-center gap-4"
          >
            <Link
              to="/app"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-accent text-bg-primary text-[15px] font-medium hover:bg-accent-hover hover:-translate-y-px transition-all duration-200 focus-ring"
            >
              Launch App
              <ArrowRightIcon size={16} />
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center px-7 py-3.5 rounded-lg border border-[rgba(255,255,255,0.12)] text-text-primary text-[15px] font-medium hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.03)] transition-all duration-200 focus-ring"
            >
              Documentation
            </Link>
          </motion.div>
        </div>
      </div>

      <StatsBar />
    </section>
  );
}
