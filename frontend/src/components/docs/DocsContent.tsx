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
          All collateral deposits, borrowing positions, and liquidation thresholds are encrypted
          as private Aleo records. Only the position owner can view their details, while the protocol
          publishes aggregate statistics and a BHP256 solvency commitment hash that anyone can verify.
        </p>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="p-4 rounded-lg bg-bg-tertiary border border-border-default">
            <p className="text-accent font-mono text-2xl font-bold mb-1">100%</p>
            <p className="text-sm text-text-secondary">Private Positions</p>
          </div>
          <div className="p-4 rounded-lg bg-bg-tertiary border border-border-default">
            <p className="text-accent font-mono text-2xl font-bold mb-1">0</p>
            <p className="text-sm text-text-secondary">MEV Attack Surface</p>
          </div>
          <div className="p-4 rounded-lg bg-bg-tertiary border border-border-default">
            <p className="text-accent font-mono text-2xl font-bold mb-1">70%</p>
            <p className="text-sm text-text-secondary">Max LTV Ratio</p>
          </div>
          <div className="p-4 rounded-lg bg-bg-tertiary border border-border-default">
            <p className="text-accent font-mono text-2xl font-bold mb-1">80%</p>
            <p className="text-sm text-text-secondary">Liquidation Threshold</p>
          </div>
        </div>
      </section>

      {/* Privacy Model */}
      <section id="privacy-model">
        <h2 className="font-heading text-2xl font-bold text-text-primary mb-4">
          Privacy Model
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          DARA Lend divides data into two categories: private (encrypted in records) and public
          (stored in mappings). This split ensures that individual position details remain
          confidential while protocol-level health is verifiable by anyone.
        </p>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          What&apos;s Private (Encrypted)
        </h3>
        <ul className="space-y-2 mb-6">
          {[
            'Individual collateral amounts',
            'Borrowing positions and debt amounts',
            'Liquidation prices and thresholds',
            'Transaction amounts and counterparties',
            'Position ownership and wallet associations',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          What&apos;s Public (Verifiable)
        </h3>
        <ul className="space-y-2 mb-6">
          {[
            'Total Value Locked (aggregate collateral)',
            'Total amount borrowed (aggregate debt)',
            'Number of active loans',
            'Solvency commitment hash (BHP256)',
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
        <p className="text-text-secondary leading-relaxed">
          Because liquidation prices are encrypted inside private records, MEV bots cannot scan
          the mempool or blockchain state to identify positions approaching liquidation. This
          eliminates sandwich attacks, front-running, and targeted liquidation sniping that plague
          transparent DeFi protocols like Aave and Compound.
        </p>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          Dual-Record Architecture
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          When a user borrows, two private records are created: a <strong className="text-text-primary">DebtPosition</strong> owned
          by the borrower (for repayment) and a <strong className="text-text-primary">LiquidationAuth</strong> owned by the
          orchestrator (for liquidation). This separation ensures borrowers control their funds
          while the protocol has a mechanism to enforce solvency — without exposing either
          party&apos;s position data publicly.
        </p>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          Known Limitations &amp; Roadmap
        </h3>
        <p className="text-text-secondary leading-relaxed mb-3">
          Like all Aleo DeFi projects in the current ecosystem, DARA Lend uses public token
          transfers via <code className="text-accent text-xs">credits.aleo/transfer_public_as_signer</code> and{' '}
          <code className="text-accent text-xs">test_usdcx_stablecoin.aleo/transfer_public</code>. These public transfer
          methods expose participant addresses and amounts on-chain during supply, borrow, and repay
          operations.
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          This is a known ecosystem-wide limitation — the Aleo SDK does not yet provide
          documentation for private stablecoin transfers. When private USDCx transfer support
          becomes available, DARA Lend will migrate to fully private token flows to eliminate
          this remaining information leakage.
        </p>
        <ul className="space-y-2 mb-6">
          {[
            'Individual position data (collateral, debt, liquidation price) — ENCRYPTED in records',
            'Protocol aggregates (TVL, total borrowed) — PUBLIC for solvency verification',
            'Token transfers (supply, borrow, repay) — PUBLIC addresses visible (ecosystem limitation)',
            'No user addresses stored in any public mapping — only aggregate values',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-warning mt-1.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Getting Started */}
      <section id="getting-started">
        <h2 className="font-heading text-2xl font-bold text-text-primary mb-4">
          Getting Started
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          Follow these steps to start using DARA Lend on Aleo Testnet.
        </p>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          1. Install Shield Wallet
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          Download and install the Shield Wallet browser extension. Create a new wallet and
          switch to the Aleo Testnet network.
        </p>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          2. Get Testnet ALEO
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          Use the Aleo faucet to receive testnet credits. You will need these to supply
          collateral and pay transaction fees.
        </p>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          3. Supply Collateral
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          Navigate to the Supply page and deposit ALEO credits. Your deposit will be encrypted
          as a zero-knowledge proof and stored as a private record in your wallet. No one
          else can see how much you deposited.
        </p>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          4. Borrow Against Collateral
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          Once you have collateral supplied, navigate to Borrow. You can borrow up to 70% of
          your collateral value. Your liquidation price will be encrypted — invisible to MEV bots.
        </p>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          5. Repay Debt
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          Navigate to the Repay page to view your active loans. Repaying a loan returns your
          encrypted collateral as a <code className="text-accent text-xs">RepaymentReceipt</code> record.
          Full debt amount is repaid in a single transaction.
        </p>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          6. Withdraw Collateral
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          If you have collateral that is not used as backing for any loan, navigate to the
          Withdraw page to reclaim your ALEO credits. Only the record owner can initiate
          a withdrawal — the encrypted receipt proves ownership.
        </p>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          7. Liquidation
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          The Liquidate page shows any <code className="text-accent text-xs">LiquidationAuth</code> records
          in your wallet. If the oracle price drops below a position&apos;s liquidation price,
          the position becomes &quot;underwater&quot; and can be liquidated — seizing collateral and
          clearing the debt from the protocol.
        </p>
      </section>

      {/* Smart Contract */}
      <section id="smart-contract">
        <h2 className="font-heading text-2xl font-bold text-text-primary mb-4">
          Smart Contract
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          The DARA Lend protocol is powered by a single Leo program deployed at{' '}
          <a
            href="https://testnet.explorer.provable.com/program/dara_lend_v2.aleo"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-accent hover:underline"
          >dara_lend_v2.aleo</a>. The contract
          manages all lending operations using Aleo&apos;s native encryption.
        </p>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          Record Types
        </h3>
        <p className="text-text-secondary leading-relaxed mb-2">
          Five private record types store encrypted position data:
        </p>
        <CodeBlock>{`record CollateralReceipt {
    owner: address,
    collateral_amount: u64,
    deposit_block: u32,
    nonce_hash: field,  // bound to caller via BHP256::commit
}

record DebtPosition {
    owner: address,
    collateral_amount: u64,
    debt_amount: u128,
    liquidation_price: u64,
    loan_id: field,
}

record LiquidationAuth {
    owner: address,
    loan_id: field,
    collateral_amount: u64,
    debt_amount: u128,
    liquidation_price: u64,
    borrower_hash: field,  // hashed address — no raw address leak
}`}</CodeBlock>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          Key Transitions
        </h3>
        <div className="space-y-4">
          {[
            {
              name: 'supply_collateral',
              desc: 'Deposits ALEO credits as encrypted collateral via credits.aleo cross-program call. Returns a CollateralReceipt record.',
            },
            {
              name: 'borrow',
              desc: 'Takes a CollateralReceipt, validates LTV ratio, creates DebtPosition and LiquidationAuth records. Applies 0.5% origination fee. Enforces oracle freshness and max debt circuit breaker. Transfers net amount via test_usdcx_stablecoin.aleo.',
            },
            {
              name: 'repay',
              desc: 'Consumes a DebtPosition, accepts credit payment, returns collateral. Generates a RepaymentReceipt record.',
            },
            {
              name: 'liquidate',
              desc: 'Consumes a LiquidationAuth, verifies oracle price against liquidation threshold. Seizes collateral + 5% bonus incentive and generates LiquidationReceipt. Oracle freshness validated.',
            },
            {
              name: 'withdraw_collateral',
              desc: 'Returns deposited collateral to the owner. Burns the CollateralReceipt record.',
            },
          ].map((t) => (
            <div key={t.name} className="p-4 rounded-lg bg-bg-tertiary border border-border-default">
              <p className="font-mono text-sm text-accent mb-1">{t.name}</p>
              <p className="text-sm text-text-secondary">{t.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          Solvency Verification
        </h3>
        <p className="text-text-secondary leading-relaxed mb-2">
          After every state-changing operation, the contract recalculates a solvency commitment:
        </p>
        <CodeBlock>{`let solvency: field = BHP256::hash_to_field(
    (total_collateral, total_borrowed)
);
Mapping::set(solvency_commitment, 1field, solvency);`}</CodeBlock>
        <p className="text-text-secondary leading-relaxed">
          Anyone can read the public aggregate values and verify that the hash matches,
          proving protocol solvency without revealing individual positions.
        </p>
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
          <div className="p-4 rounded-lg bg-bg-tertiary border border-border-default">
            <p className="font-heading font-semibold text-text-primary mb-1">
              Leo Smart Contract
            </p>
            <p className="text-sm text-text-secondary">
              The core protocol logic deployed on Aleo. Handles collateral management, borrowing,
              repayment, and liquidation — all with encrypted records.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-bg-tertiary border border-border-default">
            <p className="font-heading font-semibold text-text-primary mb-1">
              React Frontend
            </p>
            <p className="text-sm text-text-secondary">
              A responsive web application that connects to Shield Wallet, builds private
              transactions, and displays position data from encrypted records.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-bg-tertiary border border-border-default">
            <p className="font-heading font-semibold text-text-primary mb-1">
              Backend Services
            </p>
            <p className="text-sm text-text-secondary">
              Express API for protocol statistics, oracle price updater (CoinGecko),
              and liquidation monitoring.
            </p>
          </div>
        </div>

        <h3 className="font-heading text-lg font-semibold text-text-primary mt-6 mb-3">
          Transaction Flow
        </h3>
        <ol className="space-y-3">
          {[
            'User initiates action in the frontend (e.g., Supply)',
            'Frontend builds a private transaction with encrypted inputs',
            'Shield Wallet generates a zero-knowledge proof',
            'Proof is broadcast to the Aleo network',
            'Validators verify the proof and update state',
            'Encrypted record is returned to the user\'s wallet',
          ].map((step, idx) => (
            <li key={idx} className="flex items-start gap-3 text-text-secondary text-sm">
              <span className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold">
                {idx + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      {/* Roadmap */}
      <section id="roadmap">
        <h2 className="font-heading text-2xl font-bold text-text-primary mb-4">
          Roadmap
        </h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          DARA Lend is actively evolving. Here is our planned roadmap for upcoming features and
          privacy improvements.
        </p>

        <div className="space-y-4">
          {[
            {
              phase: 'Wave 3 (Current)',
              items: [
                'Privacy leak fix — borrower address hashed in LiquidationAuth',
                'Oracle price freshness validation (100 block staleness window)',
                '0.5% origination fee on borrow',
                '5% liquidation incentive for liquidators',
                'Max debt circuit breaker (100K USDCx cap)',
                'Nonce bound to caller address (grief attack prevention)',
                'Transaction history with explorer links',
                'Health factor color alerts (client-side, privacy-preserving)',
              ],
            },
            {
              phase: 'Wave 4 (Planned)',
              items: [
                'Private USDCx transfers when SDK supports it (eliminate address exposure)',
                'Record join/split for partial withdrawals and flexible positions',
                'Block-based interest rate accrual',
                'Multi-collateral support',
                'Automated backend liquidation monitor',
              ],
            },
            {
              phase: 'Future',
              items: [
                'Cross-chain collateral bridges',
                'Governance token and decentralized admin',
                'Variable interest rate models',
                'Flash loan protection',
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
              a: 'No. All individual position data is encrypted inside Aleo records. Only you (the record owner) can decrypt and view your collateral amount, debt, and liquidation price.',
            },
            {
              q: 'How can I trust the protocol is solvent if data is private?',
              a: 'The protocol publishes aggregate totals (total collateral, total borrowed) and a BHP256 solvency commitment hash on-chain. Anyone can verify that the hash matches the aggregates, proving solvency without revealing individual positions.',
            },
            {
              q: 'What happens if I get liquidated?',
              a: 'If the oracle price drops below your liquidation price, a liquidator holding your LiquidationAuth record can trigger liquidation. Your collateral is seized to cover the debt, and any excess is returned. The liquidator cannot see your liquidation price — they only learn if liquidation succeeds or fails upon execution.',
            },
            {
              q: 'What wallet do I need?',
              a: 'DARA Lend works with the Shield Wallet browser extension, which supports Aleo\'s private record model and zero-knowledge proof generation.',
            },
            {
              q: 'What network is DARA Lend deployed on?',
              a: 'Currently on Aleo Testnet (TestnetBeta). Mainnet deployment will follow after security audits and community review.',
            },
            {
              q: 'Are there any fees?',
              a: 'DARA Lend charges a 0.5% origination fee on borrowed amounts. Liquidators receive a 5% bonus on seized collateral as incentive. Transaction fees are paid to the Aleo network for proof verification.',
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
