import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

function PrivacyGauge() {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = 0.75;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative w-[140px] h-[140px] md:w-[180px] md:h-[180px]">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke="url(#gaugeGradient)" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="animate-gauge-fill"
        />
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C9DDFF" />
            <stop offset="100%" stopColor="#D6C5A1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
        <span className="font-headline text-3xl md:text-4xl signature-text-gradient">75%</span>
        <span className="font-label text-[9px] uppercase tracking-[0.2em] text-text-muted mt-1">Privacy</span>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative min-h-[700px] h-screen flex items-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0">
        <video
          autoPlay muted loop playsInline
          className="w-full h-full object-cover"
          poster="/images/bg.png"
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_024928_1efd0b0d-6c02-45a8-8847-1030900c4f63.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 flex items-center justify-between">
        <div className="max-w-[620px]">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <span className="font-label text-label uppercase text-secondary tracking-[0.3em]">
              The Obsidian Ledger
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.8 }}
            className="font-headline text-hero-mobile md:text-hero text-text-primary mb-6"
          >
            Borrow Without<br />Being Watched.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="text-[17px] leading-relaxed text-text-secondary max-w-[480px] mb-10 font-light"
          >
            The world's first institutional-grade privacy ledger for decentralized lending.
            Multi-collateral. Zero-knowledge. Fully encrypted.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-wrap items-center gap-4"
          >
            <Link to="/app" className="btn-signature">
              Enter the Vault
            </Link>
            <Link to="/docs" className="btn-outline">
              Documentation
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="hidden lg:block"
        >
          <PrivacyGauge />
        </motion.div>
      </div>
    </section>
  );
}
