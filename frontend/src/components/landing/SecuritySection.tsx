import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const testimonials = [
  {
    quote: 'Finally, a lending protocol that treats privacy as a first-class feature, not an afterthought.',
    author: 'DeFi Researcher',
    role: 'Privacy Advocate',
  },
  {
    quote: 'Multi-collateral with 21 transitions and 5-source oracle. The engineering depth here is impressive.',
    author: 'Smart Contract Auditor',
    role: 'Aleo Ecosystem',
  },
  {
    quote: 'The luxury interface sets a new bar for DeFi applications. This is what institutional users expect.',
    author: 'Product Designer',
    role: 'Web3 Studio',
  },
];

export function SecuritySection() {
  const { ref, inView } = useScrollReveal({ threshold: 0.2 });

  return (
    <section ref={ref} className="py-section-mobile md:py-section bg-bg-secondary">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="text-center mb-20">
          <span className="font-label text-label uppercase tracking-[0.3em] text-secondary mb-4 block">
            The Ledger of Trust
          </span>
          <h2 className="font-headline text-section-mobile md:text-section text-text-primary">
            What They Say
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="glass-panel p-8"
            >
              <p className="text-[15px] leading-relaxed text-text-secondary font-light italic mb-8">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full signature-gradient flex items-center justify-center">
                  <span className="text-sm font-bold text-on-primary">{t.author[0]}</span>
                </div>
                <div>
                  <p className="text-sm text-text-primary">{t.author}</p>
                  <p className="text-xs text-text-muted">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
