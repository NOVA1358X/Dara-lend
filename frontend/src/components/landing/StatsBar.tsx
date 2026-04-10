import { VelocityScroll } from '@/components/shared/VelocityScroll';

const marqueeItems = [
  'PRIVATE LENDING', '·', 'ZERO-KNOWLEDGE', '·', 'ALEO', '·',
  'DARK POOL TRADING', '·', 'SEALED-BID AUCTIONS', '·', 'FLASH LOANS', '·',
  'MEV PROTECTED', '·', 'MULTI-COLLATERAL', '·',
];

export function StatsBar() {
  return (
    <section className="py-6 border-y border-white/[0.06] bg-bg-primary overflow-hidden relative">
      {/* Fade masks */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-bg-primary to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-bg-primary to-transparent z-10 pointer-events-none" />

      <VelocityScroll baseVelocity={-0.6} damping={0.92}>
        {marqueeItems.map((item, i) => (
          <span
            key={i}
            className={`font-label text-[11px] uppercase tracking-[0.35em] whitespace-nowrap select-none ${
              item === '·' ? 'text-secondary/40 text-[8px]' : 'text-text-muted hover:text-text-secondary transition-colors duration-300'
            }`}
          >
            {item}
          </span>
        ))}
      </VelocityScroll>

      <div className="mt-2" />

      <VelocityScroll baseVelocity={0.4} damping={0.92}>
        {['7 CONTRACTS', '·', '76 TRANSITIONS', '·', 'YIELD VAULT', '·', 'PRIVATE GOVERNANCE', '·',
          'ENCRYPTED POSITIONS', '·', 'INVISIBLE TRANSFERS', '·', 'ORACLE SECURED', '·',
        ].map((item, i) => (
          <span
            key={i}
            className={`font-label text-[11px] uppercase tracking-[0.35em] whitespace-nowrap select-none ${
              item === '·' ? 'text-secondary/40 text-[8px]' : 'text-text-muted/60 hover:text-text-secondary transition-colors duration-300'
            }`}
          >
            {item}
          </span>
        ))}
      </VelocityScroll>
    </section>
  );
}
