const marqueeItems = [
  'ALEO', 'PROVABLE', 'SHIELD', 'USDCx', 'USAD', 'LEO', 'ZERO-KNOWLEDGE',
  'ALEO', 'PROVABLE', 'SHIELD', 'USDCx', 'USAD', 'LEO', 'ZERO-KNOWLEDGE',
];

export function StatsBar() {
  return (
    <section className="py-8 border-y border-white/[0.06] bg-bg-primary overflow-hidden">
      <div className="marquee-track">
        {marqueeItems.map((item, i) => (
          <span
            key={i}
            className="font-label text-[11px] uppercase tracking-[0.35em] text-text-muted whitespace-nowrap select-none"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
