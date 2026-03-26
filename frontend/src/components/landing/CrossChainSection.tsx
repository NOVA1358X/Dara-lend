import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useProtocolStats } from '@/hooks/useProtocolStats';
import { formatCredits } from '@/utils/formatting';

export function CrossChainSection() {
  const { ref, inView } = useScrollReveal({ threshold: 0.3 });
  const { data: stats } = useProtocolStats();

  const numbers = [
    { value: stats?.totalCollateral ? formatCredits(stats.totalCollateral) : '0', label: 'Total Value Locked', suffix: ' ALEO' },
    { value: stats?.loanCount?.toString() ?? '0', label: 'Active Loans', suffix: '' },
    { value: '0.5', label: 'Protocol Fee', suffix: '%' },
    { value: '70', label: 'Max Borrow LTV', suffix: '%' },
  ];

  return (
    <section id="numbers" ref={ref} className="relative py-section-mobile md:py-section overflow-hidden">
      {/* Video background */}
      <div className="absolute inset-0">
        <video
          autoPlay muted loop playsInline
          className="w-full h-full object-cover opacity-20"
          poster="/images/bg.png"
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_024928_1efd0b0d-6c02-45a8-8847-1030900c4f63.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/70" />
      </div>

      <div className="relative z-10 max-w-[1280px] mx-auto px-6">
        <div className="text-center mb-20">
          <span className="font-label text-label uppercase tracking-[0.3em] text-secondary mb-4 block">
            The Numbers
          </span>
          <h2 className="font-headline text-section-mobile md:text-section text-text-primary">
            Protocol at a Glance
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {numbers.map((num, i) => (
            <motion.div
              key={num.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <div className="font-headline text-stat-mobile md:text-stat signature-text-gradient stat-glow mb-2">
                {num.value}{num.suffix}
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
