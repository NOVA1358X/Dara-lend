import { useEffect, useRef } from 'react';

interface DocsContentProps {
  onSectionVisible: (id: string) => void;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-4 mb-6 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06] overflow-x-auto">
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
        <h1 className="font-headline text-3xl font-bold text-text-primary mb-2">
          DARA Lend — The Obsidian Ledger
        </h1>
        <p className="font-label text-[10px] uppercase tracking-[0.2em] text-primary mb-8">
          Protocol Documentation &middot; v6
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          DARA Lend is a privacy-first, multi-collateral lending protocol built on the Aleo blockchain.
          It leverages zero-knowledge proofs to encrypt individual lending positions while maintaining
          verifiable protocol solvency — protecting borrowers from MEV attacks and front-running
          without sacrificing transparency at the protocol level.
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          Users supply ALEO credits, USDCx, or USAD stablecoins as collateral and borrow against them
          — with all position data (collateral amount, debt size, liquidation price, participant
          identities) encrypted inside private Aleo records. The protocol publishes only aggregate
          statistics that anyone can verify for solvency without revealing individual positions.
        </p>

        <div className="grid grid-cols-2 gap-4 mt-8">
          {[
            { value: '100%', label: 'Private Positions', desc: 'All positions encrypted by default' },
            { value: '0', label: 'MEV Attack Surface', desc: 'Liquidation prices invisible to bots' },
            { value: '3', label: 'Collateral Types', desc: 'ALEO, USDCx, USAD multi-collateral vaults' },
            { value: '21', label: 'On-Chain Transitions', desc: 'Supply, Borrow, Repay, Liquidate, Withdraw, Oracle, Admin' },
            { value: '5', label: 'Oracle Sources', desc: 'CoinGecko, CryptoCompare, Coinbase, Binance, CMC' },
            { value: '812', label: 'Leo Statements', desc: '~800+ lines, 1.98M variables compiled' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-lg glass-panel-sm">
              <p className="text-primary font-mono text-2xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm text-text-secondary">{stat.label}</p>
              <p className="text-[11px] text-text-muted mt-1">{stat.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-sm text-text-secondary">
            <strong className="text-primary">Program ID:</strong>{' '}
            <a
              href="https://testnet.explorer.provable.com/program/dara_lend_v7.aleo"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-primary hover:underline"
            >dara_lend_v7.aleo</a>
            {' · '}
            <strong className="text-text-primary">Network:</strong> Aleo Testnet
            {' · '}
            <strong className="text-text-primary">Language:</strong> Leo 3.4.0
            {' · '}
            <strong className="text-text-primary">Deploy TX:</strong>{' '}
            <span className="font-mono text-xs text-text-muted">at1awvn7ge...slxjfk3</span>
          </p>
        </div>
      </section>

      {/* Privacy Model */}
      <section id="privacy-model">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Privacy Model
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          DARA Lend implements a two-layer privacy model separating individual positions (private)
          from protocol health metrics (public). This ensures every borrower&apos;s position remains
          confidential while the protocol&apos;s overall solvency is verifiable by anyone.
        </p>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          What&apos;s Private (Encrypted in Records)
        </h3>
        <ul className="space-y-2 mb-6">
          {[
            'Collateral amounts — stored in CollateralReceipt records (supports ALEO, USDCx, USAD)',
            'Debt sizes — stored in DebtPosition records with collateral_token & debt_token fields',
            'Liquidation prices — stored in DebtPosition + LiquidationAuth records',
            'Health factors — computed client-side only, never touches the chain',
            'Supplier identity — hidden via private transfer functions per token type',
            'Borrower identity — hashed via BHP256 in LiquidationAuth',
            'Liquidator identity — hidden via private outflow transfers',
            'Wallet ↔ Loan links — no on-chain mapping between addresses and loans',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          What&apos;s Public (Verifiable Mappings)
        </h3>
        <ul className="space-y-2 mb-6">
          {[
            'Vault collateral per token type (ALEO, USDCx, USAD — separate mappings)',
            'Total amount borrowed per debt type (USDCx, USAD, ALEO — keyed by token ID)',
            'Oracle prices per asset (ALEO, USDCx, USAD)',
            'Interest rate parameters (base rate, slope, supply/borrow APY in BPS)',
            'Circuit breaker status (protocol_paused mapping)',
            'Privacy version counter',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted mt-1.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
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

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
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

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Multi-Collateral Private Transfers
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          v6 supports three collateral types, each using private transfer functions to hide
          participant identities:
        </p>
        <div className="space-y-3 mb-6">
          {[
            { op: 'Supply ALEO', method: 'credits.aleo/transfer_private_to_public', privacy: 'Supplier identity hidden — consumes private credits record' },
            { op: 'Supply USDCx', method: 'test_usdcx_stablecoin.aleo/transfer_from_public', privacy: 'Stablecoin deposited with MerkleProof freeze-list compliance' },
            { op: 'Supply USAD', method: 'test_usad_stablecoin.aleo/transfer_from_public', privacy: 'Privacy-preserving deposit with proof verification' },
            { op: 'Borrow USDCx', method: 'test_usdcx_stablecoin.aleo/transfer_public_to_private', privacy: 'Borrower receives USDCx as private Token record' },
            { op: 'Borrow USAD', method: 'test_usad_stablecoin.aleo/transfer_public_to_private', privacy: 'USAD disbursed as encrypted private record' },
            { op: 'Borrow Credits', method: 'credits.aleo/transfer_public_to_private', privacy: 'ALEO credits returned as private record — identity hidden' },
            { op: 'Liquidate (per type)', method: 'Per-token transfer_public_to_private', privacy: 'Liquidator identity hidden — receives seized collateral + 5% bonus' },
          ].map((item) => (
            <div key={item.op} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="font-mono text-xs text-primary mb-1">{item.op}</p>
              <p className="text-xs text-text-muted font-mono mb-1">{item.method}</p>
              <p className="text-xs text-text-secondary">{item.privacy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Getting Started */}
      <section id="getting-started">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
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
              desc: 'Navigate to the Supply page and deposit ALEO credits (minimum 0.1 ALEO), USDCx, or USAD stablecoin. Your deposit is encrypted inside a CollateralReceipt record with a token_type field identifying the collateral kind.',
            },
            {
              step: '4',
              title: 'Borrow Against Collateral',
              desc: 'Once you have collateral, go to the Borrow page. You can borrow USDCx, USAD, or ALEO credits up to 70% of your collateral value. A 0.5% origination fee is applied. You receive a private DebtPosition record — your debt and liquidation price are invisible to everyone.',
            },
            {
              step: '5',
              title: 'Repay Debt',
              desc: 'Go to the Repay page to view your active loans. v6 supports repayment across all debt types — USDCx, USAD, and credits. Repaying returns your encrypted collateral and generates a RepaymentReceipt.',
            },
            {
              step: '6',
              title: 'Withdraw Collateral',
              desc: 'If you have collateral that is not backing any loan, go to Withdraw to reclaim your tokens. Separate withdraw transitions exist for each collateral type (ALEO, USDCx, USAD).',
            },
            {
              step: '7',
              title: 'Liquidation',
              desc: 'The Liquidate page shows any LiquidationAuth records in your wallet. If the oracle price triggers an underwater position, you can liquidate — seizing collateral + 5% bonus. Separate liquidation transitions handle each collateral type.',
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-mono text-sm font-bold">
                {item.step}
              </span>
              <div>
                <h3 className="font-headline text-base font-semibold text-text-primary mb-1">
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
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Smart Contract
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          The DARA Lend protocol is powered by two linked Leo smart contracts deployed on Aleo Testnet:{' '}
          <a
            href="https://testnet.explorer.provable.com/program/dara_lend_v7.aleo"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-primary hover:underline"
          >dara_lend_v7.aleo</a>
          {' '}(21 transitions — lending, oracle, liquidation) and{' '}
          <a
            href="https://testnet.explorer.provable.com/program/dara_lend_v7_vault.aleo"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-primary hover:underline"
          >dara_lend_v7_vault.aleo</a>
          {' '}(10 transitions — yield vault, private transfers). Combined 31 transitions
          managing multi-collateral lending, yield pools, private transfers, interest rate accrual, and emergency controls.
        </p>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Record Types (5 Private)
        </h3>
        <p className="text-text-secondary leading-relaxed mb-2">
          All position data is stored in encrypted private records — only the record owner
          can decrypt and view their contents:
        </p>
        <CodeBlock>{`record CollateralReceipt {
    owner: address,
    token_type: u8,              // 0=ALEO, 1=USDCx, 2=USAD
    collateral_amount: u64,      // ALEO microcredits
    collateral_amount_u128: u128, // stablecoin amounts
    deposit_block: u32,
    nonce_hash: field,
}

record DebtPosition {
    owner: address,
    collateral_token: u8,        // which collateral backs this debt
    debt_token: u8,              // which token was borrowed
    collateral_amount: u64,
    debt_amount: u128,
    liquidation_price: u64,
    loan_id: field,
}

record LiquidationAuth {
    owner: address,              // orchestrator, NOT the borrower
    collateral_token: u8,
    debt_token: u8,
    loan_id: field,
    collateral_amount: u64,
    debt_amount: u128,
    liquidation_price: u64,
    borrower_hash: field,        // BHP256 hash
}

record RepaymentReceipt { owner, amount_repaid, collateral_returned, loan_id }
record LiquidationReceipt { owner, loan_id, collateral_seized, debt_covered }`}</CodeBlock>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Transitions (21)
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          v6 expanded from 6 to 21 transitions to support multi-collateral vaults, multiple borrow
          types, interest rate accrual, and emergency admin controls:
        </p>
        <div className="space-y-3">
          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-primary mt-4 mb-2">Admin &amp; Oracle</p>
          {[
            { name: 'update_oracle_price(new_price, round)', desc: 'Updates ALEO/USD price with round-based replay protection, 15% deviation cap, 5-block minimum interval.' },
            { name: 'set_rate_params(base_bps, slope_bps)', desc: 'Admin sets interest rate model parameters — base rate and slope in BPS.' },
            { name: 'emergency_pause()', desc: 'Circuit breaker — halts all supply/borrow/withdraw operations.' },
            { name: 'resume_protocol()', desc: 'Admin resumes protocol after emergency pause.' },
            { name: 'accrue_interest()', desc: 'Updates supply_apy_bps and borrow_apy_bps based on utilization.' },
          ].map((t) => (
            <div key={t.name} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="font-mono text-xs text-primary mb-1">{t.name}</p>
              <p className="text-xs text-text-secondary">{t.desc}</p>
            </div>
          ))}

          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-primary mt-6 mb-2">Supply (3 collateral types)</p>
          {[
            { name: 'supply_collateral(credits, amount, nonce)', desc: 'ALEO credits — private inflow via credits.aleo/transfer_private_to_public.' },
            { name: 'supply_usdcx_collateral(amount, proof, nonce)', desc: 'USDCx stablecoin — with MerkleProof for freeze-list compliance.' },
            { name: 'supply_usad_collateral(amount, proof, nonce)', desc: 'USAD stablecoin — with MerkleProof verification.' },
          ].map((t) => (
            <div key={t.name} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="font-mono text-xs text-primary mb-1">{t.name}</p>
              <p className="text-xs text-text-secondary">{t.desc}</p>
            </div>
          ))}

          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-primary mt-6 mb-2">Borrow (3 debt types)</p>
          {[
            { name: 'borrow(receipt, amount, price, orchestrator)', desc: 'Borrow USDCx against collateral — 70% LTV, 0.5% fee, circuit breaker.' },
            { name: 'borrow_usad(receipt, amount, price, orchestrator)', desc: 'Borrow USAD stablecoin against collateral.' },
            { name: 'borrow_credits(receipt, amount, price, orchestrator)', desc: 'Borrow ALEO credits against stablecoin collateral.' },
          ].map((t) => (
            <div key={t.name} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="font-mono text-xs text-primary mb-1">{t.name}</p>
              <p className="text-xs text-text-secondary">{t.desc}</p>
            </div>
          ))}

          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-primary mt-6 mb-2">Repay (3 types)</p>
          {[
            { name: 'repay(debt_position)', desc: 'Repay USDCx debt, return ALEO collateral as private record.' },
            { name: 'repay_usad(debt_position)', desc: 'Repay USAD debt, return collateral.' },
            { name: 'repay_credits_usdcx / repay_credits_usad', desc: 'Repay ALEO credit debt, return stablecoin collateral.' },
          ].map((t) => (
            <div key={t.name} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="font-mono text-xs text-primary mb-1">{t.name}</p>
              <p className="text-xs text-text-secondary">{t.desc}</p>
            </div>
          ))}

          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-primary mt-6 mb-2">Liquidate &amp; Withdraw (6 types)</p>
          {[
            { name: 'liquidate / liquidate_usdcx / liquidate_usad', desc: 'Seize collateral + 5% bonus per collateral type when position is underwater.' },
            { name: 'withdraw_collateral / withdraw_usdcx / withdraw_usad', desc: 'Return collateral to owner per token type — record burned on withdrawal.' },
          ].map((t) => (
            <div key={t.name} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="font-mono text-xs text-primary mb-1">{t.name}</p>
              <p className="text-xs text-text-secondary">{t.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Public Mappings
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {[
            { name: 'vault_collateral_aleo', desc: 'Total ALEO collateral in microcredits' },
            { name: 'vault_collateral_usdcx', desc: 'Total USDCx collateral deposited' },
            { name: 'vault_collateral_usad', desc: 'Total USAD collateral deposited' },
            { name: 'pool_total_borrowed[0|1|2]', desc: 'Total borrowed per type: 0=USDCx, 1=USAD, 2=ALEO' },
            { name: 'oracle_price[0|1|2]', desc: 'Price per asset: 0=ALEO, 1=USDCx, 2=USAD' },
            { name: 'rate_base_bps / rate_slope_bps', desc: 'Interest rate model parameters' },
            { name: 'supply_apy_bps / borrow_apy_bps', desc: 'Current APY rates in basis points' },
            { name: 'protocol_paused', desc: 'Circuit breaker flag (true = paused)' },
            { name: 'privacy_version', desc: 'Privacy counter for version tracking' },
            { name: 'protocol_admin', desc: 'Admin address set at deployment' },
            { name: 'used_nonces', desc: 'Replay protection for supply deposits' },
          ].map((m) => (
            <div key={m.name} className="flex items-start gap-2 p-2 rounded bg-white/[0.03]">
              <code className="text-xs text-primary font-mono flex-shrink-0">{m.name}</code>
              <span className="text-xs text-text-secondary">— {m.desc}</span>
            </div>
          ))}
        </div>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
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
            <div key={p.param} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-text-muted mb-0.5">{p.param}</p>
              <p className="text-sm font-semibold text-text-primary">{p.value}</p>
              <p className="text-[11px] text-text-muted">{p.detail}</p>
            </div>
          ))}
        </div>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          External Program Integration
        </h3>
        <CodeBlock>{`credits.aleo
├── transfer_private_to_public   → Supply ALEO (private inflow)
├── transfer_public_to_private   → Withdraw / Liquidate / Repay / Borrow credits (private outflow)

test_usdcx_stablecoin.aleo (+ MerkleProof freeze-list)
├── transfer_public_to_private   → Borrow USDCx (private token to borrower)
├── transfer_from_public         → Supply / Repay USDCx (approval-based)

test_usad_stablecoin.aleo (+ MerkleProof freeze-list)
├── transfer_public_to_private   → Borrow USAD / Withdraw / Liquidate USAD
├── transfer_from_public         → Supply / Repay USAD

merkle_tree.aleo                 → Freeze-list compliance verification`}</CodeBlock>
      </section>

      {/* Architecture */}
      <section id="architecture">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Architecture
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          DARA Lend consists of three main components working together:
        </p>

        <div className="space-y-4 mb-6">
          {[
            {
              title: 'Leo Smart Contracts (dara_lend_v7.aleo + vault)',
              items: ['Main: 812 statements, 1.98M variables — Vault: 274 statements, 822K variables', '31 total transitions (21 lending + 10 vault), 7 private records', 'Imports credits.aleo + test_usdcx_stablecoin.aleo + test_usad_stablecoin.aleo + merkle_tree.aleo', 'Yield vault pools, private transfers, auto liquidation bot, circuit breaker'],
            },
            {
              title: 'React Frontend (Vite + TypeScript)',
              items: ['Shield Wallet integration (@provablehq/aleo-wallet-adaptor)', 'Private record decryption and display', 'Real-time analytics dashboard with multi-collateral composition', 'Luxury "Obsidian Ledger" design system (Gilda Display + Inter + Space Grotesk)'],
            },
            {
              title: 'Express Backend — Sentinel (TypeScript)',
              items: ['5-source oracle price aggregation with outlier rejection', 'Manual on-chain price updates via admin wallet', 'Analytics API with TVL time-series, interest rates, and borrow history', 'Liquidation monitoring (Sentinel) with circuit breaker awareness'],
            },
          ].map((section) => (
            <div key={section.title} className="p-4 rounded-lg glass-panel-sm">
              <p className="font-headline font-semibold text-text-primary mb-2">{section.title}</p>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
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
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold">
                {idx + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Admin Access
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          The protocol admin (set during contract deployment via <code className="text-primary text-xs">protocol_admin</code> mapping)
          has a limited set of capabilities:
        </p>
        <ul className="space-y-2 mb-4">
          {[
            'Update oracle price — must pass deviation cap (15%), round-based replay protection, and minimum block interval',
            'Set interest rate parameters — base rate and slope in BPS',
            'Emergency pause/resume — circuit breaker halts all operations',
            'Accrue interest — updates supply/borrow APY based on utilization',
            'Fund protocol with USDCx/USAD — transfer stablecoin liquidity for borrowers',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 flex-shrink-0" />
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
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Oracle System
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          DARA Lend runs a production-grade 5-source oracle aggregation system that automatically
          keeps on-chain pricing accurate without manual intervention — a critical advancement over
          hardcoded or admin-panel-only approaches.
        </p>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Five-Source Price Aggregation
        </h3>
        <div className="space-y-2 mb-6">
          {[
            { source: 'CoinGecko', role: 'Primary source (free tier)', color: 'text-primary' },
            { source: 'CryptoCompare', role: 'Secondary source (free tier)', color: 'text-text-primary' },
            { source: 'Coinbase', role: 'Exchange direct (free tier)', color: 'text-text-primary' },
            { source: 'Binance', role: 'Exchange direct (free tier)', color: 'text-text-primary' },
            { source: 'CoinMarketCap', role: 'Tertiary source (API key authenticated)', color: 'text-text-primary' },
          ].map((s, idx) => (
            <div key={s.source} className="flex items-center gap-3 p-2 rounded bg-white/[0.03]">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono text-[10px] font-bold">
                {idx + 1}
              </span>
              <span className={`text-sm font-medium ${s.color}`}>{s.source}</span>
              <span className="text-xs text-text-muted ml-auto">{s.role}</span>
            </div>
          ))}
        </div>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
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
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          On-Chain Validation
        </h3>
        <CodeBlock>{`// Smart contract oracle guard rails
const MAX_PRICE_DEVIATION_BPS: u64 = 1_500u64;  // 15% max change per update
const MIN_UPDATE_INTERVAL: u32 = 5u32;           // min blocks between updates

// Enforced in finalize_update_oracle_price:
assert(round > current_round);                   // replay protection
assert(elapsed >= MIN_UPDATE_INTERVAL);           // rate limiting
assert(deviation_bps <= MAX_PRICE_DEVIATION_BPS); // manipulation guard`}</CodeBlock>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
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
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Roadmap
        </h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          DARA Lend is actively evolving. Here is our development roadmap:
        </p>

        <div className="space-y-4">
          {[
            {
              phase: 'Wave 4 — Current Release (v6)',
              items: [
                'Multi-collateral vaults — ALEO, USDCx, USAD as collateral types',
                'Multi-borrow — borrow USDCx, USAD, or ALEO credits against any collateral',
                'Interest rate model — on-chain base rate, slope, supply/borrow APY in BPS',
                'Emergency circuit breaker — admin can pause/resume all operations',
                'MerkleProof freeze-list compliance for stablecoin operations',
                '21 transitions expanded from original 6 (3.5× complexity)',
                '812 statements, 1.98M variables, 1.5M constraints compiled',
                'Sentinel liquidation monitor with circuit breaker awareness',
                'Analytics dashboard — TVL time-series, interest rates, collateral composition',
                'Luxury "Obsidian Ledger" design system — Gilda Display, glass panels, signature gradients',
              ],
            },
            {
              phase: 'Wave 3 — Previous Release (v5)',
              items: [
                'End-to-end private token flows — 5/6 transitions using private transfers',
                'Dual-record architecture — DebtPosition + LiquidationAuth with hashed borrower',
                '5-source oracle aggregation with automated on-chain updates',
                'Oracle deviation cap (15%) + round-based replay protection',
                '0.5% origination fee + 5% liquidation incentive',
                'Circuit breaker cap (100K USDCx)',
              ],
            },
            {
              phase: 'Future Vision',
              items: [
                'Cross-chain collateral via Shield Wallet NEAR Intents',
                'Governance token and decentralized admin transition',
                'Flash loan protection mechanisms',
                'Multi-oracle per asset (not just ALEO/USD)',
                'Mainnet deployment after security audit',
              ],
            },
          ].map((section) => (
            <div key={section.phase} className="p-4 rounded-lg glass-panel-sm">
              <p className="font-headline font-semibold text-primary mb-3">{section.phase}</p>
              <ul className="space-y-1.5">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
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
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          FAQ
        </h2>
        <div className="space-y-6">
          {[
            {
              q: 'Is my collateral amount visible to others?',
              a: 'No. All individual position data is encrypted inside Aleo records. Only you (the record owner) can decrypt and view your collateral amount, debt, and liquidation price. The protocol only publishes aggregate totals per collateral type.',
            },
            {
              q: 'How can I trust the protocol is solvent if data is private?',
              a: 'The protocol publishes aggregate totals (vault_collateral_aleo, vault_collateral_usdcx, vault_collateral_usad, pool_total_borrowed) as public mappings on-chain. Anyone can read these values and verify that total collateral exceeds total debt, proving solvency without revealing individual positions.',
            },
            {
              q: 'What collateral types are supported?',
              a: 'v6 supports three collateral types: ALEO credits (native), USDCx stablecoin, and USAD stablecoin. Each has dedicated supply, withdraw, and liquidation transitions. Stablecoin operations use MerkleProof for freeze-list compliance.',
            },
            {
              q: 'What can I borrow?',
              a: 'You can borrow USDCx or USAD stablecoins against ALEO collateral, or borrow ALEO credits against stablecoin collateral. Each borrow type has its own transition with the same LTV/fee parameters.',
            },
            {
              q: 'What happens if I get liquidated?',
              a: 'If the oracle price drops below your liquidation price, a liquidator holding your LiquidationAuth record can trigger liquidation. Your collateral is seized (plus a 5% bonus to the liquidator) and the debt is cleared. The liquidator cannot see your exact liquidation price beforehand.',
            },
            {
              q: 'What wallet do I need?',
              a: 'DARA Lend works with the Shield Wallet browser extension, which supports Aleo\'s private record model, zero-knowledge proof generation, and direct transaction signing.',
            },
            {
              q: 'What network is DARA Lend deployed on?',
              a: 'Currently on Aleo Testnet. Main program: dara_lend_v7.aleo (TX: at17alxm45te8xjcuc8n4h6zajjf8ke5s0sa6tvvp4umwrwlmje4q8sjrnesl). Vault program: dara_lend_v7_vault.aleo (TX: at16d0eejg60l3xatmxl6uyrvyajyuy3h6808d225dsac48chgf2yzsaxvdge). Mainnet deployment will follow after security audits.',
            },
            {
              q: 'What is the interest rate model?',
              a: 'v6 introduces an on-chain interest rate model with configurable base rate and slope parameters (in BPS). The admin can set these via set_rate_params, and accrue_interest computes supply/borrow APY based on current utilization.',
            },
            {
              q: 'What is the circuit breaker?',
              a: 'The admin can call emergency_pause() to halt all protocol operations (supply, borrow, withdraw) if anomalies are detected. resume_protocol() re-enables operations. The Sentinel monitor also tracks pause status.',
            },
            {
              q: 'How does the oracle prevent manipulation?',
              a: 'The oracle aggregates prices from 5 independent sources, rejects outliers, and uses median filtering. On-chain, the smart contract enforces a 15% deviation cap per update, a minimum 5-block interval between updates, and monotonic round counters to prevent replay attacks.',
            },
          ].map((item, idx) => (
            <div key={idx}>
              <h3 className="font-headline text-base font-semibold text-text-primary mb-2">
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
