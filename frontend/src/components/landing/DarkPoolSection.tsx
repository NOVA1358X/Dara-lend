import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';

function DarkPoolDiagram() {
  return (
    <svg viewBox="0 0 600 400" className="w-full h-auto" aria-label="Dark Pool Settlement Pipeline">
      <defs>
        <linearGradient id="dpPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C9DDFF" />
          <stop offset="100%" stopColor="#D6C5A1" />
        </linearGradient>
        <linearGradient id="dpGlow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C9DDFF" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#D6C5A1" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#C9DDFF" stopOpacity="0.6" />
        </linearGradient>
        <filter id="dpBlur">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="dpGlowFilter">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background grid */}
      <g opacity="0.04">
        {Array.from({ length: 13 }, (_, i) => (
          <line key={`vg${i}`} x1={i * 50} y1="0" x2={i * 50} y2="400" stroke="#C9DDFF" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`hg${i}`} x1="0" y1={i * 50} x2="600" y2={i * 50} stroke="#C9DDFF" strokeWidth="0.5" />
        ))}
      </g>

      {/* Market nodes — 4 dark pool markets */}
      {[
        { x: 85, y: 70, label: 'ALEO', sub: 'pool_v3' },
        { x: 225, y: 70, label: 'BTC', sub: 'dp_btc_v5' },
        { x: 365, y: 70, label: 'ETH', sub: 'dp_eth_v5' },
        { x: 505, y: 70, label: 'SOL', sub: 'dp_sol_v5' },
      ].map((m, i) => (
        <motion.g
          key={m.label}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.15, duration: 0.6 }}
        >
          <rect x={m.x - 50} y={m.y - 25} width="100" height="50" rx="8"
            fill="none" stroke="url(#dpPrimary)" strokeWidth="1" opacity="0.6" />
          <text x={m.x} y={m.y - 4} textAnchor="middle" fill="#C9DDFF" fontSize="13" fontFamily="monospace" fontWeight="600">
            {m.label}
          </text>
          <text x={m.x} y={m.y + 12} textAnchor="middle" fill="#9CA3AF" fontSize="8" fontFamily="monospace">
            {m.sub}
          </text>
        </motion.g>
      ))}

      {/* Central settlement engine */}
      <motion.g
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.7 }}
      >
        <rect x="200" y="155" width="200" height="60" rx="12"
          fill="rgba(201,221,255,0.06)" stroke="url(#dpPrimary)" strokeWidth="1.5" />
        <text x="300" y="182" textAnchor="middle" fill="url(#dpPrimary)" fontSize="12" fontFamily="monospace" fontWeight="700">
          BATCH TWAP ENGINE
        </text>
        <text x="300" y="200" textAnchor="middle" fill="#9CA3AF" fontSize="9" fontFamily="monospace">
          2-of-3 threshold operators
        </text>
      </motion.g>

      {/* Connecting lines from markets to engine */}
      {[85, 225, 365, 505].map((x, i) => (
        <motion.line
          key={`conn${i}`}
          x1={x} y1="95" x2={x < 300 ? 250 : 350} y2="155"
          stroke="url(#dpPrimary)" strokeWidth="0.8" opacity="0.3"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
        />
      ))}

      {/* Settlement pipeline steps */}
      {[
        { x: 60, y: 280, icon: '🔮', label: 'Oracle', sub: '7 sources' },
        { x: 170, y: 280, icon: '📋', label: 'Propose', sub: 'Op 1' },
        { x: 280, y: 280, icon: '✓', label: 'Approve', sub: 'Op 2' },
        { x: 390, y: 280, icon: '⚡', label: 'Match', sub: 'Fill orders' },
        { x: 500, y: 280, icon: '→', label: 'Advance', sub: 'Next batch' },
      ].map((step, i) => (
        <motion.g
          key={step.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 + i * 0.15, duration: 0.5 }}
        >
          <circle cx={step.x} cy={step.y} r="22"
            fill="rgba(201,221,255,0.04)" stroke="url(#dpPrimary)" strokeWidth="0.8" />
          <text x={step.x} y={step.y + 4} textAnchor="middle" fontSize="14">
            {step.icon}
          </text>
          <text x={step.x} y={step.y + 40} textAnchor="middle" fill="#C9DDFF" fontSize="10" fontFamily="monospace" fontWeight="500">
            {step.label}
          </text>
          <text x={step.x} y={step.y + 52} textAnchor="middle" fill="#6B7280" fontSize="8" fontFamily="monospace">
            {step.sub}
          </text>
          {/* Connecting arrows between steps */}
          {i < 4 && (
            <motion.line
              x1={step.x + 26} y1={step.y}
              x2={step.x + 80} y2={step.y}
              stroke="url(#dpGlow)" strokeWidth="1" opacity="0.4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 1.2 + i * 0.15, duration: 0.4 }}
            />
          )}
        </motion.g>
      ))}

      {/* Pipeline connection from engine to steps */}
      <motion.path
        d="M 300 215 L 300 245 L 280 258"
        fill="none" stroke="url(#dpPrimary)" strokeWidth="0.8" opacity="0.3"
        strokeDasharray="4 4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
      />

      {/* Encrypted order indicators */}
      {[
        { x: 60, y: 360, label: 'OrderCommitment' },
        { x: 210, y: 360, label: 'OrderAuth' },
        { x: 340, y: 360, label: 'FillReceipt' },
        { x: 490, y: 360, label: 'ResidualOrder' },
      ].map((rec, i) => (
        <motion.g
          key={rec.label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 + i * 0.1, duration: 0.4 }}
        >
          <rect x={rec.x - 55} y={rec.y - 10} width="110" height="20" rx="4"
            fill="rgba(214,197,161,0.05)" stroke="#D6C5A1" strokeWidth="0.5" opacity="0.5" />
          <text x={rec.x} y={rec.y + 4} textAnchor="middle" fill="#D6C5A1" fontSize="7.5" fontFamily="monospace" opacity="0.7">
            🔒 {rec.label}
          </text>
        </motion.g>
      ))}

      {/* Animated pulse on settlement engine */}
      <motion.rect
        x="200" y="155" width="200" height="60" rx="12"
        fill="none" stroke="url(#dpGlow)" strokeWidth="2" filter="url(#dpGlowFilter)"
        animate={{ opacity: [0, 0.4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
}

export function DarkPoolSection() {
  const { ref, inView } = useScrollReveal({ threshold: 0.15 });

  return (
    <section ref={ref} className="py-section-mobile md:py-section bg-bg-secondary">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="text-center mb-16">
          <span className="font-label text-label uppercase tracking-[0.3em] text-secondary mb-4 block">
            Dark Pool Architecture
          </span>
          <h2 className="font-headline text-section-mobile md:text-section text-text-primary mb-4">
            4 Markets. Zero Visibility.
          </h2>
          <p className="text-[17px] text-text-secondary font-light max-w-[560px] mx-auto">
            Fully automated batch settlement across ALEO, BTC, ETH, and SOL markets with TWAP pricing,
            2-of-3 threshold operators, limit orders, and partial fills.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="glass-panel rounded-card p-8 mb-12"
        >
          <DarkPoolDiagram />
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Encrypted Orders', desc: 'OrderCommitment records invisible to validators', icon: 'lock' },
            { label: 'TWAP Settlement', desc: 'Time-weighted average prevents manipulation', icon: 'trending_up' },
            { label: 'Threshold Operators', desc: '2-of-3 approval — no single key settles', icon: 'security' },
            { label: 'Partial Fills', desc: 'Residuals carry forward to next batch', icon: 'swap_horiz' },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
              className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center"
            >
              <span className="material-symbols-outlined text-2xl text-primary mb-2 block">{item.icon}</span>
              <p className="text-sm font-medium text-text-primary mb-1">{item.label}</p>
              <p className="text-xs text-text-secondary">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
