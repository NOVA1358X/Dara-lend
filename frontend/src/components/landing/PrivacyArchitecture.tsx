import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const pipeline = [
  { label: 'Your deposit amount is encrypted the moment you submit', icon: 'lock' },
  { label: 'Your loan details are invisible to everyone except you', icon: 'visibility_off' },
  { label: 'Yield earnings compound privately — no one sees your balance', icon: 'trending_up' },
  { label: 'Transfers break all links between sender and receiver', icon: 'link_off' },
  { label: 'Automated safeguards protect your collateral 24/7', icon: 'shield' },
  { label: 'Withdraw anytime — no trace, no trail, no exposure', icon: 'logout' },
];

export function PrivacyArchitecture() {
  const { ref, inView } = useScrollReveal({ threshold: 0.2 });

  return (
    <section id="protocol" ref={ref} className="py-section-mobile md:py-section bg-bg-secondary">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Visual panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7 }}
            className="relative aspect-video rounded-card overflow-hidden glass-panel"
          >
            <video
              autoPlay muted loop playsInline
              className="w-full h-full object-cover opacity-60"
            >
              <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_024928_1efd0b0d-6c02-45a8-8847-1030900c4f63.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-6 left-6">
              <span className="font-label text-[10px] uppercase tracking-[0.3em] text-primary">Privacy Pipeline</span>
            </div>
          </motion.div>

          <div>
            <span className="font-label text-label uppercase tracking-[0.3em] text-secondary mb-4 block">
              Complete Privacy
            </span>
            <h2 className="font-headline text-section-mobile md:text-section text-text-primary mb-4">
              Every Step<br />Is Encrypted
            </h2>
            <p className="text-[17px] text-text-secondary font-light mb-8 max-w-[440px]">
              From the moment you deposit until you withdraw, every action is protected by zero-knowledge cryptography. Your financial data never touches the public ledger.
            </p>

            <div className="space-y-3">
              {pipeline.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: 30 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 transition-all duration-300 group-hover:bg-primary/20 group-hover:shadow-[0_0_20px_rgba(201,221,255,0.1)]">
                    <span className="material-symbols-outlined text-lg text-primary">
                      {item.icon}
                    </span>
                  </div>
                  <span className="text-[15px] text-text-secondary font-light group-hover:text-text-primary transition-colors duration-300">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
