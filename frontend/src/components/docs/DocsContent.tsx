import { useEffect, useRef } from 'react';

interface DocsContentProps {
  onSectionVisible: (id: string) => void;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-4 mb-6 p-4 rounded-lg bg-bg-tertiary border border-border-default overflow-x-auto">
      <code className="text-sm font-mono text-text-primary leading-relaxed whitespace-pre">
        {children}
      </code>
    </pre>
  );
}

export function DocsContent({ onSectionVisible }: DocsContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sectionIds = [
      'overview',
      'privacy-model',
      'getting-started',
      'smart-contract',
      'architecture',
      'oracle',
      'roadmap',
      'faq',
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onSectionVisible(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 },
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [onSectionVisible]);

  return (
    <div ref={containerRef} className="space-y-16">
      {/* Overview */}
      <section id="overview">
        <h1 className="font-heading text-3xl font-bold text-text-primary mb-6">
          DARA Lend Documentation
        </h1>
        <p className="text-text-secondary leading-relaxed mb-4">
          DARA Lend is a privacy-first decentralized lending protocol built on the Aleo blockchain.
          It leverages zero-knowledge proofs to encrypt individual lending positions while maintaining
          verifiable protocol solvency — protecting borrowers from MEV attacks and front-running
          without sacrificing transparency at the protocol level.
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          Users supply ALEO credits as collateral and borrow USDCx stablecoin — with all position
          data (collateral amount, debt size, liquidation price, participant identities) encrypted
          inside private Aleo records. The protocol publishes only aggregate statistics that
          anyone can verify for solvency without revealing individual positions.
        </p>

        <div className="grid grid-cols-2 gap-4 mt-8">
          {[
            { value: '100%', label: 'Private Positions', desc: 'All positions encrypted by default' },
            { value: '0', label: 'MEV Attack Surface', desc: 'Liquidation prices invisible to bots' },
            { value: '70%', label: 'Max LTV Ratio', desc: 'Borrow up to 70% of collateral value' },
            { value: '80%', label: 'Liquidation Threshold', desc: 'Positions liquidatable at 80% ratio' },
            { value: '5', label: 'Oracle Sources', desc: 'CMC, CoinGecko, CryptoCompare, Coinbase, Binance' },
            { value: '6', label: 'On-Chain Transitions', desc: 'Supply, Borrow, Repay, Liquidate, Withdraw, Oracle' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-lg bg-bg-tertiary border border-border-default">
              <p className="text-accent font-mono text-2xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm text-text-secondary">{stat.label}</p>
              <p className="text-[11px] text-text-muted mt-1">{stat.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-accent/5 border border-accent/10">
          <p className="text-sm text-text-secondary">
            <strong className="text-accent">Program ID:</strong>{' '}
            <a
              href="https://testnet.explorer.provable.com/program/dara_lend_v5.aleo"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-accent hover:underline"
            >dara_lend_v5.aleo</a>
            {' · '}
            <strong className="text-text-primary">Network:</strong> Aleo Testnet
            {' · '}
            <strong className="text-text-primary">Language:</strong> Leo 3.4.0
          </p>
        </div>
      </section>

      {/* Privacy Model */}
      <section id="privacy-model">
        <h2 className="font-heading text-2xl font-bold text-text-primary mb-4">
          Privacy Model
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          DARA Lend implements a two-layer privacy model separating individual positions (private)
          from protocol health metrics (public). This ensures every borrower&apos;s position remains
          confidential while the protocol&apos;s overall solvency is verifiable by anyone.
        </p>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          What&apos;s Private (Encrypted in Records)
        </h3>
        <ul className="space-y-2 mb-6">
          {[
            'Collateral amounts — stored in CollateralReceipt records',
            'Debt sizes — stored in DebtPosition records',
            'Liquidation prices — stored in DebtPosition + LiquidationAuth records',
            'Health factors — computed client-side only, never touches the chain',
            'Supplier identity — hidden via credits.aleo/transfer_private_to_public',
            'Borrower identity — hashed via BHP256 in LiquidationAuth',
            'Liquidator identity — hidden via credits.aleo/transfer_public_to_private',
            'Wallet ↔ Loan links — no on-chain mapping between addresses and loans',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          What&apos;s Public (Verifiable Mappings)
        </h3>
        <ul className="space-y-2 mb-6">
          {[
            'Total Value Locked (aggregate collateral across all positions)',
            'Total amount borrowed (aggregate USDCx debt)',
            'Number of active loans',
            'Oracle price (ALEO/USD, updated every 2 minutes)',
            'Total fees collected',
            'Price round counter (replay protection)',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted mt-1.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          MEV Protection
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          Because liquidation prices are encrypted inside private records, MEV bots cannot scan
          the mempool or blockchain state to identify positions approaching liquidation. This
          eliminates sandwich attacks, front-running, and targeted liquidation sniping that plague
          transparent DeFi protocols like Aave and Compound. On Ethereum, MEV bots extracted
          over $600M in 2023 by targeting visible liquidation thresholds — on DARA Lend, that
          attack surface is zero.
        </p>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          Dual-Record Architecture
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          When a user borrows, two private records are created simultaneously: a{' '}
          <strong className="text-text-primary">DebtPosition</strong> owned by the borrower (for repayment)
          and a <strong className="text-text-primary">LiquidationAuth</strong> owned by the orchestrator
          (for liquidation enforcement). The borrower&apos;s address is hashed via BHP256 inside
          the LiquidationAuth — preventing raw address leaks while maintaining the protocol&apos;s
          ability to enforce solvency.
        </p>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          Private Transfer Architecture
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          5 out of 6 transitions use private token transfer functions, hiding participant
          identities at the transfer layer — not just in mappings and records:
        </p>
        <div className="space-y-3 mb-6">
          {[
            { op: 'Supply Collateral', method: 'credits.aleo/transfer_private_to_public', privacy: 'Supplier identity hidden — consumes private credits record, observer sees deposit but not who made it' },
            { op: 'Borrow USDCx', method: 'test_usdcx_stablecoin.aleo/transfer_public_to_private', privacy: 'Borrower receives USDCx as private Token record — address not exposed on-chain' },
            { op: 'Repay (USDCx)', method: 'test_usdcx_stablecoin.aleo/transfer_from_public', privacy: 'Uses approval pattern — repayer pre-approves the debt amount' },
            { op: 'Repay (Collateral Return)', method: 'credits.aleo/transfer_public_to_private', privacy: 'ALEO collateral returned as encrypted private credits record' },
            { op: 'Withdraw Collateral', method: 'credits.aleo/transfer_public_to_private', privacy: 'Withdrawer identity hidden — receives private credits record' },
            { op: 'Liquidate (Collateral Seizure)', method: 'credits.aleo/transfer_public_to_private', privacy: 'Liquidator identity hidden — receives seized collateral + 5% bonus as private record' },
          ].map((item) => (
            <div key={item.op} className="p-3 rounded-lg bg-bg-tertiary border border-border-default">
              <p className="font-mono text-xs text-accent mb-1">{item.op}</p>
              <p className="text-xs text-text-muted font-mono mb-1">{item.method}</p>
              <p className="text-xs text-text-secondary">{item.privacy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Getting Started */}
      <section id="getting-started">
        <h2 className="font-heading text-2xl font-bold text-text-primary mb-4">
          Getting Started
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          Follow these steps to start using DARA Lend on Aleo Testnet.
        </p>

        <div className="space-y-6">
          {[
            {
              step: '1',
              title: 'Install Shield Wallet',
              desc: 'Download and install the Shield Wallet browser extension from shieldwallet.co. Create a new wallet and switch to the Aleo Testnet network. Shield Wallet is Aleo\'s privacy-native wallet built by Provable — it supports private record management and zero-knowledge proof generation.',
            },
            {
              step: '2',
              title: 'Get Testnet ALEO',
              desc: 'Use the Aleo faucet (faucet.aleo.org) to receive testnet credits. You will need these to supply collateral and pay transaction fees. Credits will arrive as private records in your Shield Wallet.',
            },
            {
              step: '3',
              title: 'Supply Collateral',
              desc: 'Navigate to the Supply page and deposit ALEO credits (minimum 0.1 ALEO). Your deposit is supplied from a private credits record — no one can see who deposited or how much. You\'ll receive an encrypted CollateralReceipt record.',
            },
            {
              step: '4',
              title: 'Borrow USDCx',
              desc: 'Once you have collateral, go to the Borrow page. You can borrow USDCx stablecoin up to 70% of your collateral value. A 0.5% origination fee is applied. You\'ll receive a private USDCx Token record and a DebtPosition record — your debt and liquidation price are invisible to everyone.',
            },
            {
              step: '5',
              title: 'Repay Debt',
              desc: 'Go to the Repay page to view your active loans. Repaying returns your encrypted collateral as a private credits record and generates a RepaymentReceipt. The full debt amount is repaid in a single transaction using the USDCx approval pattern.',
            },
            {
              step: '6',
              title: 'Withdraw Collateral',
              desc: 'If you have collateral that is not backing any loan, go to Withdraw to reclaim your ALEO credits. Only the CollateralReceipt owner can initiate a withdrawal — the encrypted receipt proves ownership.',
            },
            {
              step: '7',
              title: 'Liquidation',
              desc: 'The Liquidate page shows any LiquidationAuth records in your wallet. If the oracle price drops below a position\'s liquidation price, the position is "underwater" and can be liquidated — you seize the collateral + 5% bonus as a private credits record.',
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center flex-shrink-0 font-mono text-sm font-bold">
                {item.step}
              </span>
              <div>
                <h3 className="font-heading text-base font-semibold text-text-primary mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Smart Contract */}
      <section id="smart-contract">
        <h2 className="font-heading text-2xl font-bold text-text-primary mb-4">
          Smart Contract
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          The DARA Lend protocol is powered by a single Leo smart contract deployed at{' '}
          <a
            href="https://testnet.explorer.provable.com/program/dara_lend_v5.aleo"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-accent hover:underline"
          >dara_lend_v5.aleo</a>
          {' '}on Aleo Testnet. The contract is 445 lines of Leo code managing all lending
          operations with Aleo&apos;s native zero-knowledge encryption.
        </p>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          Record Types (5 Private)
        </h3>
        <p className="text-text-secondary leading-relaxed mb-2">
          All position data is stored in encrypted private records — only the record owner
          can decrypt and view their contents:
        </p>
        <CodeBlock>{`record CollateralReceipt {
    owner: address,
    collateral_amount: u64,
    deposit_block: u32,
    nonce_hash: field,    // bound to caller via BHP256 (grief prevention)
}

record DebtPosition {
    owner: address,
    collateral_amount: u64,
    debt_amount: u128,
    liquidation_price: u64,
    loan_id: field,
}

record LiquidationAuth {
    owner: address,          // orchestrator, NOT the borrower
    loan_id: field,
    collateral_amount: u64,
    debt_amount: u128,
    liquidation_price: u64,
    borrower_hash: field,    // BHP256 hash — no raw address leak
}

record RepaymentReceipt { owner, amount_repaid, collateral_returned, loan_id }
record LiquidationReceipt { owner, loan_id, collateral_seized, debt_covered }`}</CodeBlock>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          Transitions (6)
        </h3>
        <div className="space-y-4">
          {[
            {
              name: 'update_oracle_price(new_price, round)',
              desc: 'Admin-only. Updates the on-chain ALEO/USD price with round-based replay protection (monotonic counter), 15% deviation cap per update, and minimum 5-block interval between updates. Rejects manipulated price feeds.',
            },
            {
              name: 'supply_collateral(credits, amount, nonce)',
              desc: 'Accepts a private ALEO credits record, deposits via credits.aleo/transfer_private_to_public. Supplier identity hidden. Returns a CollateralReceipt record. Nonce is bound to caller address via BHP256 to prevent grief attacks. Minimum: 0.1 ALEO.',
            },
            {
              name: 'borrow(collateral_receipt, amount, price, orchestrator)',
              desc: 'Consumes a CollateralReceipt, validates LTV ratio (max 70%), applies 0.5% origination fee, checks oracle freshness, enforces 100K USDCx circuit breaker. Creates DebtPosition (to borrower) + LiquidationAuth (to orchestrator). USDCx disbursed via transfer_public_to_private — borrower receives private token.',
            },
            {
              name: 'repay(debt_position)',
              desc: 'Consumes a DebtPosition, repays USDCx via transfer_from_public (approval pattern), returns ALEO collateral as private credits record via transfer_public_to_private. Generates RepaymentReceipt. Decrements total_borrowed and loan_count.',
            },
            {
              name: 'liquidate(liquidation_auth, oracle_price)',
              desc: 'Consumes a LiquidationAuth. Verifies oracle_price ≤ liquidation_price (position is underwater). Seizes collateral + 5% liquidation bonus via transfer_public_to_private — liquidator identity hidden. Generates LiquidationReceipt.',
            },
            {
              name: 'withdraw_collateral(collateral_receipt)',
              desc: 'Returns collateral to the owner via transfer_public_to_private — withdrawer identity hidden. Burns the CollateralReceipt record. Decrements vault_total_collateral.',
            },
          ].map((t) => (
            <div key={t.name} className="p-4 rounded-lg bg-bg-tertiary border border-border-default">
              <p className="font-mono text-sm text-accent mb-1">{t.name}</p>
              <p className="text-sm text-text-secondary">{t.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          Public Mappings (11)
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {[
            { name: 'vault_total_collateral', desc: 'Aggregate TVL in microcredits' },
            { name: 'total_borrowed', desc: 'Total outstanding USDCx debt (u128)' },
            { name: 'loan_count', desc: 'Number of active loans' },
            { name: 'oracle_price', desc: 'Current ALEO/USD price (6 decimal precision)' },
            { name: 'price_update_block', desc: 'Block height of last oracle update' },
            { name: 'used_nonces', desc: 'Replay protection for supply deposits' },
            { name: 'protocol_admin', desc: 'Admin address (set at deployment)' },
            { name: 'active_loans', desc: 'Boolean flag per loan ID' },
            { name: 'total_fees_collected', desc: 'Accumulated origination fees' },
            { name: 'price_round', desc: 'Monotonic round counter for oracle updates' },
            { name: 'price_history', desc: 'Previous price for deviation checking' },
          ].map((m) => (
            <div key={m.name} className="flex items-start gap-2 p-2 rounded bg-bg-tertiary">
              <code className="text-xs text-accent font-mono flex-shrink-0">{m.name}</code>
              <span className="text-xs text-text-secondary">— {m.desc}</span>
            </div>
          ))}
        </div>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          Protocol Parameters
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { param: 'LTV Ratio', value: '70%', detail: '7,000 / 10,000 BPS' },
            { param: 'Liquidation Threshold', value: '80%', detail: '8,000 / 10,000 BPS' },
            { param: 'Min Collateral', value: '0.1 ALEO', detail: '100,000 microcredits' },
            { param: 'Origination Fee', value: '0.5%', detail: '50 BPS on borrow' },
            { param: 'Liquidation Bonus', value: '5%', detail: '500 BPS incentive' },
            { param: 'Max Total Borrowed', value: '100K USDCx', detail: 'Circuit breaker cap' },
            { param: 'Max Oracle Age', value: '100 blocks', detail: '~5 min freshness' },
            { param: 'Max Price Deviation', value: '15%', detail: '1,500 BPS per update' },
            { param: 'Min Update Interval', value: '5 blocks', detail: 'Between oracle updates' },
            { param: 'Precision', value: '6 decimals', detail: '1,000,000 = 1.0' },
          ].map((p) => (
            <div key={p.param} className="p-3 rounded-lg bg-bg-tertiary border border-border-default">
              <p className="text-xs text-text-muted mb-0.5">{p.param}</p>
              <p className="text-sm font-semibold text-text-primary">{p.value}</p>
              <p className="text-[11px] text-text-muted">{p.detail}</p>
            </div>
          ))}
        </div>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          External Program Integration
        </h3>
        <CodeBlock>{`credits.aleo
├── transfer_private_to_public   → Supply (private inflow)
├── transfer_public_to_private   → Withdraw / Liquidate / Repay collateral (private outflow)

test_usdcx_stablecoin.aleo
├── transfer_public_to_private   → Borrow (private USDCx to borrower)
├── transfer_from_public         → Repay (approval-based USDCx return)`}</CodeBlock>
      </section>

      {/* Architecture */}
      <section id="architecture">
        <h2 className="font-heading text-2xl font-bold text-text-primary mb-4">
          Architecture
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          DARA Lend consists of three main components working together:
        </p>

        <div className="space-y-4 mb-6">
          {[
            {
              title: 'Leo Smart Contract (dara_lend_v5.aleo)',
              items: ['445 lines of Leo 3.4.0 code', '6 transitions, 5 private records, 11 public mappings', 'Imports credits.aleo + test_usdcx_stablecoin.aleo', 'Circuit breaker, oracle validation, nonce binding'],
            },
            {
              title: 'React Frontend (Vite + TypeScript)',
              items: ['Shield Wallet integration (@provablehq/aleo-wallet-adaptor)', 'Private record decryption and display', 'Real-time dashboard with health factor gauges', 'Transaction building with zk-proof generation'],
            },
            {
              title: 'Express Backend (TypeScript)',
              items: ['5-source oracle price aggregation (CoinMarketCap primary)', 'Automated on-chain price updates every 2 minutes', 'Protocol stats API with caching', 'Liquidation monitoring service'],
            },
          ].map((section) => (
            <div key={section.title} className="p-4 rounded-lg bg-bg-tertiary border border-border-default">
              <p className="font-heading font-semibold text-text-primary mb-2">{section.title}</p>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          Transaction Flow
        </h3>
        <ol className="space-y-3">
          {[
            'User initiates action in the frontend (Supply, Borrow, Repay, etc.)',
            'Frontend builds a private transaction with encrypted record inputs',
            'Shield Wallet generates a zero-knowledge proof locally',
            'Signed proof is broadcast to the Aleo network',
            'Validators verify the proof and update on-chain state',
            'Encrypted result records are returned to the user\'s wallet',
            'Frontend decrypts records client-side for display',
          ].map((step, idx) => (
            <li key={idx} className="flex items-start gap-3 text-text-secondary text-sm">
              <span className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold">
                {idx + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          Admin Access
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          The protocol admin (set during contract deployment via <code className="text-accent text-xs">protocol_admin</code> mapping)
          has a limited set of capabilities:
        </p>
        <ul className="space-y-2 mb-4">
          {[
            'Update oracle price — must pass deviation cap (15%), round-based replay protection, and minimum block interval',
            'Fund protocol with USDCx — transfer stablecoin liquidity for borrowers',
            'Emergency pause — circuit breaker prevents new borrows if anomalies detected',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-warning mt-1.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <p className="text-xs text-text-muted">
          The admin cannot access, move, or view any user&apos;s private records. All position data
          remains encrypted and owned exclusively by the record holder.
        </p>
      </section>

      {/* Oracle System */}
      <section id="oracle">
        <h2 className="font-heading text-2xl font-bold text-text-primary mb-4">
          Oracle System
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          DARA Lend runs a production-grade 5-source oracle aggregation system that automatically
          keeps on-chain pricing accurate without manual intervention — a critical advancement over
          hardcoded or admin-panel-only approaches.
        </p>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          Five-Source Price Aggregation
        </h3>
        <div className="space-y-2 mb-6">
          {[
            { source: 'CoinMarketCap', role: 'Primary source (API key authenticated)', color: 'text-accent' },
            { source: 'CoinGecko', role: 'Secondary source (free tier)', color: 'text-text-primary' },
            { source: 'CryptoCompare', role: 'Tertiary source (free tier)', color: 'text-text-primary' },
            { source: 'Coinbase', role: 'Exchange direct (free tier)', color: 'text-text-primary' },
            { source: 'Binance', role: 'Exchange direct (free tier)', color: 'text-text-primary' },
          ].map((s, idx) => (
            <div key={s.source} className="flex items-center gap-3 p-2 rounded bg-bg-tertiary">
              <span className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center font-mono text-[10px] font-bold">
                {idx + 1}
              </span>
              <span className={`text-sm font-medium ${s.color}`}>{s.source}</span>
              <span className="text-xs text-text-muted ml-auto">{s.role}</span>
            </div>
          ))}
        </div>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          Aggregation Pipeline
        </h3>
        <p className="text-text-secondary leading-relaxed mb-2">
          The backend aggregator runs every 2 minutes:
        </p>
        <ul className="space-y-2 mb-6">
          {[
            'Fetches ALEO/USD from all 5 sources in parallel',
            'Rejects outlier prices (>2σ from median) for manipulation resistance',
            'Computes median of remaining valid prices',
            'Compares against current on-chain price — skips update if change < 0.1% (saves gas)',
            'Submits update_oracle_price transaction via @provablehq/sdk',
            'Smart contract enforces additional 15% deviation cap + round-based replay protection',
            'Frontend serves cached prices via /api/price with 5-minute TTL and cascading fallback',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          On-Chain Validation
        </h3>
        <CodeBlock>{`// Smart contract oracle guard rails
const MAX_PRICE_DEVIATION_BPS: u64 = 1_500u64;  // 15% max change per update
const MIN_UPDATE_INTERVAL: u32 = 5u32;           // min blocks between updates

// Enforced in finalize_update_oracle_price:
assert(round > current_round);                   // replay protection
assert(elapsed >= MIN_UPDATE_INTERVAL);           // rate limiting
assert(deviation_bps <= MAX_PRICE_DEVIATION_BPS); // manipulation guard`}</CodeBlock>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          Admin Fallback
        </h3>
        <p className="text-text-secondary leading-relaxed">
          As a safety net, the protocol admin can also trigger an oracle price update via
          the Stats page. The same on-chain validation applies — deviation cap, round counter,
          and minimum interval are enforced regardless of whether the update comes from the
          automated backend or the admin UI.
        </p>
      </section>

      {/* Roadmap */}
      <section id="roadmap">
        <h2 className="font-heading text-2xl font-bold text-text-primary mb-4">
          Roadmap
        </h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          DARA Lend is actively evolving. Here is our development roadmap:
        </p>

        <div className="space-y-4">
          {[
            {
              phase: 'Wave 3 — Current Release',
              items: [
                'End-to-end private token flows — 5/6 transitions use private transfers',
                'Dual-record architecture — DebtPosition + LiquidationAuth with hashed borrower address',
                '5-source oracle aggregation — CoinMarketCap, CoinGecko, CryptoCompare, Coinbase, Binance',
                'Automated on-chain price updates every 2 minutes via backend cron',
                'Oracle deviation cap (15%) + round-based replay protection',
                '0.5% origination fee on borrow + 5% liquidation incentive',
                'Max debt circuit breaker (100K USDCx cap)',
                'Nonce bound to caller address (grief attack prevention)',
                'Private credits record selector with public-to-private conversion',
                'Health factor color alerts (computed client-side, never on-chain)',
                'Transaction history with Aleo explorer links',
                'In-app documentation with privacy model reference',
              ],
            },
            {
              phase: 'Wave 4 — Planned',
              items: [
                'Private USDCx repay flow (requires Merkle proof for freeze-list compliance)',
                'Record join/split for partial withdrawals and flexible positions',
                'Block-based interest rate accrual on outstanding debt',
                'Multi-collateral support (multiple token types)',
                'Automated liquidation bot service',
              ],
            },
            {
              phase: 'Future Vision',
              items: [
                'Cross-chain collateral via Shield Wallet NEAR Intents',
                'Governance token and decentralized admin transition',
                'Variable interest rate models based on utilization',
                'Flash loan protection mechanisms',
                'Mainnet deployment after security audit',
              ],
            },
          ].map((section) => (
            <div key={section.phase} className="p-4 rounded-lg bg-bg-tertiary border border-border-default">
              <p className="font-heading font-semibold text-accent mb-3">{section.phase}</p>
              <ul className="space-y-1.5">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq">
        <h2 className="font-heading text-2xl font-bold text-text-primary mb-4">
          FAQ
        </h2>
        <div className="space-y-6">
          {[
            {
              q: 'Is my collateral amount visible to others?',
              a: 'No. All individual position data is encrypted inside Aleo records. Only you (the record owner) can decrypt and view your collateral amount, debt, and liquidation price. The protocol only publishes aggregate totals.',
            },
            {
              q: 'How can I trust the protocol is solvent if data is private?',
              a: 'The protocol publishes aggregate totals (total collateral, total borrowed, loan count) as public mappings on-chain. Anyone can read these values and verify that total collateral exceeds total debt, proving solvency without revealing individual positions.',
            },
            {
              q: 'What happens if I get liquidated?',
              a: 'If the oracle price drops below your liquidation price, a liquidator holding your LiquidationAuth record can trigger liquidation. Your collateral is seized (plus a 5% bonus to the liquidator) and the debt is cleared. The liquidator cannot see your exact liquidation price beforehand — they only learn the outcome upon execution.',
            },
            {
              q: 'What wallet do I need?',
              a: 'DARA Lend works with the Shield Wallet browser extension, which supports Aleo\'s private record model, zero-knowledge proof generation, and direct transaction signing.',
            },
            {
              q: 'What network is DARA Lend deployed on?',
              a: 'Currently on Aleo Testnet. The program ID is dara_lend_v5.aleo. Mainnet deployment will follow after security audits and community review.',
            },
            {
              q: 'Are there any fees?',
              a: 'DARA Lend charges a 0.5% origination fee on borrowed amounts. Liquidators receive a 5% bonus on seized collateral as incentive. Network transaction fees are paid to Aleo validators for proof verification.',
            },
            {
              q: 'What is the Dual-Record pattern?',
              a: 'When you borrow, two records are created: a DebtPosition (owned by you, for repayment) and a LiquidationAuth (owned by the orchestrator, for liquidation). Your address is hashed in the LiquidationAuth to prevent privacy leaks. This ensures you control your funds while the protocol can enforce solvency.',
            },
            {
              q: 'How does the oracle prevent manipulation?',
              a: 'The oracle aggregates prices from 5 independent sources (CoinMarketCap, CoinGecko, CryptoCompare, Coinbase, Binance), rejects outliers, and uses median filtering. On-chain, the smart contract enforces a 15% deviation cap per update, a minimum 5-block interval between updates, and monotonic round counters to prevent replay attacks.',
            },
          ].map((item, idx) => (
            <div key={idx}>
              <h3 className="font-heading text-base font-semibold text-text-primary mb-2">
                {item.q}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
