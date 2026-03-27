import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const techPoints = [
  { title: '31 Transitions · 2 Programs', desc: 'Dual-program architecture: 21 lending + 10 vault transitions. 2,805,091 compiled variables on Aleo Testnet.' },
  { title: '5-Source Oracle', desc: 'CoinGecko, CryptoCompare, Coinbase, Binance.us, CoinMarketCap — median aggregated with outlier rejection.' },
  { title: '7 Private Record Types', desc: 'CollateralReceipt, DebtPosition, LiquidationAuth, RepaymentReceipt, LiquidationReceipt, PoolShare, PrivateTransferReceipt.' },
  { title: 'Yield Vault + Privacy Relay', desc: 'Earn yield on stablecoin deposits. ZK-shielded transfers break sender-recipient links completely.' },
];

export function TechnicalEdge() {
  const { ref, inView } = useScrollReveal({ threshold: 0.2 });

  return (
    <section ref={ref} className="py-section-mobile md:py-section bg-bg-primary">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="font-label text-label uppercase tracking-[0.3em] text-secondary mb-4 block">
              Technical Edge
            </span>
            <h2 className="font-headline text-section-mobile md:text-section text-text-primary mb-6">
              Engineered for<br />Institutional Privacy
            </h2>
            <p className="text-[17px] leading-relaxed text-text-secondary font-light max-w-[440px]">
              Two deployed programs. 31 on-chain transitions. Every transaction path fully private.
              Borrower addresses are BHP256-hashed — solvency is enforceable without exposing position data.
            </p>
          </div>

          <div className="space-y-4">
            {techPoints.map((point, i) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, x: 20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="glass-panel-sm p-6 flex gap-5 items-start"
              >
                <div className="w-8 h-8 rounded-full signature-gradient flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-on-primary">{i + 1}</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-1">{point.title}</h3>
                  <p className="text-sm text-text-secondary font-light">{point.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
