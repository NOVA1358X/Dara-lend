import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const pipeline = [
  { label: 'Encrypted Collateral Deposit (3 token types)', icon: 'lock' },
  { label: 'Private Debt Issuance with Dual-Record Pattern', icon: 'visibility_off' },
  { label: 'ZK Yield Vault — Earn Without Exposure', icon: 'trending_up' },
  { label: 'Private Transfer Relay — Zero Trace', icon: 'link_off' },
  { label: 'Automated Liquidation Sentinel', icon: 'shield' },
  { label: 'Private Withdrawal — Invisible to MEV', icon: 'logout' },
];

export function PrivacyArchitecture() {
  const { ref, inView } = useScrollReveal({ threshold: 0.2 });

  return (
    <section id="protocol" ref={ref} className="py-section-mobile md:py-section bg-bg-secondary">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7 }}
            className="relative aspect-video rounded-card overflow-hidden glass-panel"
          >
            <video
              autoPlay muted loop playsInline
              className="w-full h-full object-cover opacity-60"
              poster="/images/bg.png"
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
              End-to-End Privacy
            </span>
            <h2 className="font-headline text-section-mobile md:text-section text-text-primary mb-8">
              Every Step Encrypted
            </h2>

            <div className="space-y-4">
              {pipeline.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                  className="flex items-center gap-4"
                >
                  <span className="material-symbols-outlined text-lg text-primary">
                    {item.icon}
                  </span>
                  <span className="text-[15px] text-text-secondary font-light">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
