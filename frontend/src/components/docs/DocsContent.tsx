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
      'dark-pool',
      'auctions',
      'flash-loans',
      'governance',
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
          DARA — The Obsidian Ledger
        </h1>
        <p className="font-label text-[10px] uppercase tracking-[0.2em] text-primary mb-8">
          Protocol Documentation &middot; v8 &middot; Seven-Program DeFi Suite
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          DARA is a privacy-first DeFi suite built on Aleo. It combines multi-collateral lending,
          dark pool trading, sealed-bid auctions, flash loans, yield vaults, private transfers,
          and on-chain governance — all powered by zero-knowledge proofs. Every position, trade,
          and vote is fully encrypted, protecting users from MEV attacks, front-running, and surveillance.
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          v8 deploys seven programs: <strong className="text-text-primary">dara_lend_v8.aleo</strong> (ALEO-collateral lending),{' '}
          <strong className="text-text-primary">dara_lend_v8_credits.aleo</strong> (stablecoin-collateral lending),{' '}
          <strong className="text-text-primary">dara_lend_v8_vault.aleo</strong> (yield vault + private transfers),{' '}
          <strong className="text-text-primary">dara_lend_v8_gov_v3.aleo</strong> (private governance),{' '}
          <strong className="text-text-primary">dara_dark_pool_v1.aleo</strong> (batch dark pool trading),{' '}
          <strong className="text-text-primary">dara_auction_v1.aleo</strong> (sealed-bid auctions), and{' '}
          <strong className="text-text-primary">dara_flash_v1.aleo</strong> (flash loans).
          Together: 76 transitions, ~5M compiled variables, 11+ private record types.
        </p>

        <div className="grid grid-cols-2 gap-4 mt-8">
          {[
            { value: '7', label: 'Smart Contracts', desc: 'Lending, Credits, Vault, Gov, Dark Pool, Auctions, Flash' },
            { value: '76', label: 'On-Chain Transitions', desc: '12+12+10+12+9+10+11 across all programs' },
            { value: '~5M', label: 'Compiled Variables', desc: '1.03M + 1.31M + 822K + 404K + 653K + 679K + 943K' },
            { value: '11+', label: 'Private Record Types', desc: 'Collateral, Debt, Flash, Auction, Trade, Pool, Gov, Transfer' },
            { value: '0', label: 'MEV Attack Surface', desc: 'Sealed bids + dark pool batch = no front-running' },
            { value: '5', label: 'Oracle Sources', desc: 'CoinGecko, CryptoCompare, Coinbase, Gate.io, CMC' },
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
            <strong className="text-primary">Main:</strong>{' '}
            <a
              href="https://testnet.explorer.provable.com/program/dara_lend_v8.aleo"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-primary hover:underline"
            >dara_lend_v8.aleo</a>
            {' · '}
            <strong className="text-primary">Credits:</strong>{' '}
            <a
              href="https://testnet.explorer.provable.com/program/dara_lend_v8_credits.aleo"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-primary hover:underline"
            >dara_lend_v8_credits.aleo</a>
            {' · '}
            <strong className="text-primary">Vault:</strong>{' '}
            <a
              href="https://testnet.explorer.provable.com/program/dara_lend_v8_vault.aleo"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-primary hover:underline"
            >dara_lend_v8_vault.aleo</a>
            {' · '}
            <strong className="text-primary">Gov:</strong>{' '}
            <a
              href="https://testnet.explorer.provable.com/program/dara_lend_v8_gov_v3.aleo"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-primary hover:underline"
            >dara_lend_v8_gov_v3.aleo</a>
            {' · '}
            <strong className="text-primary">Dark Pool:</strong>{' '}
            <a
              href="https://testnet.explorer.provable.com/program/dara_dark_pool_v1.aleo"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-primary hover:underline"
            >dara_dark_pool_v1.aleo</a>
            {' · '}
            <strong className="text-primary">Auctions:</strong>{' '}
            <a
              href="https://testnet.explorer.provable.com/program/dara_auction_v1.aleo"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-primary hover:underline"
            >dara_auction_v1.aleo</a>
            {' · '}
            <strong className="text-primary">Flash:</strong>{' '}
            <a
              href="https://testnet.explorer.provable.com/program/dara_flash_v1.aleo"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-primary hover:underline"
            >dara_flash_v1.aleo</a>
            {' · '}
            <strong className="text-text-primary">Network:</strong> Aleo Testnet
            {' · '}
            <strong className="text-text-primary">Language:</strong> Leo 4.0.0
          </p>
        </div>
      </section>

      {/* Privacy Model */}
      <section id="privacy-model">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Privacy Model
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          DARA implements a two-layer privacy model separating individual positions (private)
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
            'Trade intents — encrypted in TradeIntent records, invisible until epoch settlement',
            'Auction bids — hidden behind BHP256 commitments (double-hash + secret) until reveal phase',
            'Flash loan amounts — encrypted in FlashLoanReceipt and FlashRepayReceipt records',
            'Governance votes — vote() has NO finalize, zero on-chain trace. Only aggregate tallies visible',
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
            'Dark pool epoch volume and settlement prices (aggregate, not per-user)',
            'Auction bid counts and highest-bid amounts (not individual sealed bids)',
            'Governance proposal tallies (aggregate for/against, not individual votes)',
            'Circuit breaker status per module (protocol_paused, vault_paused, etc.)',
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
          over $600M in 2023 by targeting visible liquidation thresholds — on DARA, that
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
          Follow these steps to start using DARA on Aleo Testnet.
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
          The DARA protocol is powered by seven linked Leo smart contracts deployed on Aleo Testnet:{' '}
          <a
            href="https://testnet.explorer.provable.com/program/dara_lend_v8.aleo"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-primary hover:underline"
          >dara_lend_v8.aleo</a>
          {' '}(12 transitions — ALEO-collateral lending, oracle, liquidation),{' '}
          <a
            href="https://testnet.explorer.provable.com/program/dara_lend_v8_credits.aleo"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-primary hover:underline"
          >dara_lend_v8_credits.aleo</a>
          {' '}(12 transitions — stablecoin-collateral lending),{' '}
          <a
            href="https://testnet.explorer.provable.com/program/dara_lend_v8_vault.aleo"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-primary hover:underline"
          >dara_lend_v8_vault.aleo</a>
          {' '}(10 transitions — yield vault, private transfers), and{' '}
          <a
            href="https://testnet.explorer.provable.com/program/dara_lend_v8_gov_v3.aleo"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-primary hover:underline"
          >dara_lend_v8_gov_v3.aleo</a>
          {' '}(12 transitions — governance, private voting, proposals). Combined 46 transitions
          managing multi-collateral lending, yield pools, private transfers, governance, interest rate accrual, and emergency controls.
        </p>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Record Types (7 Private)
        </h3>
        <p className="text-text-secondary leading-relaxed mb-2">
          All position data is stored in encrypted private records — only the record owner
          can decrypt and view their contents:
        </p>
        <CodeBlock>{`// ─── dara_lend_v8.aleo (5 records) ───
record CollateralReceipt {
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
    collateral_token: u8, debt_token: u8,
    loan_id: field, collateral_amount: u64,
    debt_amount: u128, liquidation_price: u64,
    borrower_hash: field,        // BHP256 hash
}

record RepaymentReceipt { owner, amount_repaid, collateral_returned, loan_id }
record LiquidationReceipt { owner, loan_id, collateral_seized, debt_covered }

// ─── dara_lend_v8_vault.aleo (2 records) ───
record PoolShare {
    owner: address,
    token_type: u8,              // 0=USDCx, 1=USAD
    share_amount: u128,          // shares of yield pool
    deposit_amount: u128,        // original deposit amount
}

record PrivateTransferReceipt {
    owner: address,
    token_type: u8,
    amount: u128,
    nonce_hash: field,
}`}</CodeBlock>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Lending Transitions (12) — dara_lend_v8.aleo
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          The core lending program handles multi-collateral supply, multi-borrow,
          interest rate accrual, liquidation, and emergency admin controls:
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
          Vault Transitions (10) — dara_lend_v8_vault.aleo
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          The vault program manages yield pools, private transfers, and independent admin controls:
        </p>
        <div className="space-y-3">
          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-primary mt-4 mb-2">Yield Vault</p>
          {[
            { name: 'deposit_usdcx(amount, proof, nonce)', desc: 'Deposit USDCx into yield pool — returns PoolShare record. MerkleProof verified.' },
            { name: 'deposit_usad(amount, proof, nonce)', desc: 'Deposit USAD into yield pool — returns PoolShare record.' },
            { name: 'redeem_usdcx(pool_share)', desc: 'Burn PoolShare, receive original deposit + accumulated yield (0.1% fee).' },
            { name: 'redeem_usad(pool_share)', desc: 'Burn PoolShare, receive USAD deposit + yield.' },
            { name: 'distribute_yield(token_type, amount)', desc: 'Admin distributes protocol fees into yield pool for depositors.' },
          ].map((t) => (
            <div key={t.name} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="font-mono text-xs text-primary mb-1">{t.name}</p>
              <p className="text-xs text-text-secondary">{t.desc}</p>
            </div>
          ))}

          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-primary mt-6 mb-2">Private Transfers</p>
          {[
            { name: 'private_transfer_usdcx(amount, recipient, proof, nonce)', desc: 'ZK-shielded relay — atomically deposit + re-mint USDCx to recipient. Breaks on-chain link.' },
            { name: 'private_transfer_usad(amount, recipient, proof, nonce)', desc: 'ZK-shielded relay for USAD. Same privacy guarantees as USDCx.' },
          ].map((t) => (
            <div key={t.name} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="font-mono text-xs text-primary mb-1">{t.name}</p>
              <p className="text-xs text-text-secondary">{t.desc}</p>
            </div>
          ))}

          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-primary mt-6 mb-2">Vault Admin</p>
          {[
            { name: 'pause_vault()', desc: 'Independent circuit breaker — halts all vault & transfer operations.' },
            { name: 'resume_vault()', desc: 'Admin resumes vault after emergency pause.' },
            { name: 'initialize_pool(token_type)', desc: 'One-time pool initialization for USDCx (0u8) or USAD (1u8).' },
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
        <p className="font-label text-[10px] uppercase tracking-[0.2em] text-primary mb-2">dara_lend_v8.aleo</p>
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
        <p className="font-label text-[10px] uppercase tracking-[0.2em] text-primary mt-4 mb-2">dara_lend_v8_vault.aleo</p>
        <div className="grid grid-cols-1 gap-2">
          {[
            { name: 'pool_total_deposits[0|1]', desc: 'Total deposits in yield pool: 0=USDCx, 1=USAD' },
            { name: 'pool_total_shares[0|1]', desc: 'Total shares issued per pool' },
            { name: 'pool_total_yield[0|1]', desc: 'Accumulated yield from admin distribution' },
            { name: 'vault_paused', desc: 'Independent circuit breaker for vault operations' },
            { name: 'vault_admin', desc: 'Admin address (same as lending admin)' },
            { name: 'vault_used_nonces', desc: 'Replay protection for deposits and transfers' },
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

      {/* Dark Pool */}
      <section id="dark-pool">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Dark Pool
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          The DARA Dark Pool (<strong className="text-text-primary">dara_dark_pool_v1.aleo</strong>, 9 transitions)
          enables private, MEV-resistant trading of ALEO/USDCx pairs. Trades are submitted as encrypted intents
          and batch-settled at the oracle mid-price — no order book, no front-running, no price manipulation.
        </p>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          How It Works
        </h3>
        <div className="space-y-3 mb-6">
          {[
            { step: '1', title: 'Submit Intent', desc: 'Buyers lock USDCx, sellers lock ALEO. Each intent is a private record — no one sees your order size or direction.' },
            { step: '2', title: 'Epoch Settles', desc: 'The settlement bot closes the current epoch and records the oracle mid-price. All buys and sells in that epoch match at the same fair price.' },
            { step: '3', title: 'Claim Fill', desc: 'Buyers claim ALEO, sellers claim USDCx. If there\'s a volume imbalance, fills are prorated. Unfilled amounts can be cancelled.' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-mono text-sm font-bold">
                {item.step}
              </span>
              <div>
                <h4 className="font-headline text-base font-semibold text-text-primary mb-1">{item.title}</h4>
                <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Transitions (9)
        </h3>
        <div className="space-y-3">
          {[
            { name: 'submit_buy_intent(usdcx_token, proof, amount, nonce)', desc: 'Lock USDCx as private TradeIntent — buyer enters the epoch.' },
            { name: 'submit_sell_intent(credits, aleo_amount, nonce)', desc: 'Lock ALEO as private TradeIntent — seller enters the epoch.' },
            { name: 'settle_epoch(epoch_id, oracle_price)', desc: 'Dark Pool Bot (via Provable DPS) settles the epoch at oracle mid-price once both sides have volume.' },
            { name: 'claim_buy_fill(intent, epoch_id)', desc: 'Buyer claims ALEO after settlement. Fill amount = min(buy_vol, sell_vol) prorated.' },
            { name: 'claim_sell_fill(intent, epoch_id)', desc: 'Seller claims USDCx after settlement.' },
            { name: 'cancel_buy(intent) / cancel_sell(intent)', desc: 'Cancel unfilled intent and reclaim locked tokens.' },
            { name: 'pause_darkpool() / resume_darkpool()', desc: 'Admin emergency controls.' },
          ].map((t) => (
            <div key={t.name} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="font-mono text-xs text-primary mb-1">{t.name}</p>
              <p className="text-xs text-text-secondary">{t.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Records
        </h3>
        <CodeBlock>{`record TradeIntent {
    owner: address,
    epoch: u64,
    amount: u128,        // locked token amount
    side: u8,            // 0=buy, 1=sell
    nonce_hash: field,
}

record FillReceipt {
    owner: address,
    epoch: u64,
    fill_amount: u128,
    side: u8,
}`}</CodeBlock>
      </section>

      {/* Sealed-Bid Auctions */}
      <section id="auctions">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Sealed-Bid Auctions
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          <strong className="text-text-primary">dara_auction_v1.aleo</strong> (10 transitions) implements the first
          anti-MEV sealed-bid auction system on Aleo. Liquidated collateral is auctioned privately —
          bids are hidden behind BHP256 commitments until the reveal phase.
        </p>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Auction Flow
        </h3>
        <div className="space-y-3 mb-6">
          {[
            { step: '1', title: 'Start Auction', desc: 'Admin lists liquidated collateral with configurable bid window (15 min to 7 days) and reveal window.' },
            { step: '2', title: 'Submit Sealed Bid', desc: 'Bidders lock USDCx and submit commitment = BHP256(BHP256(bid_amount) + secret). No one sees the actual bid.' },
            { step: '3', title: 'Reveal Bid', desc: 'After the bid window closes, bidders reveal their actual amount and secret. Contract verifies the commitment matches.' },
            { step: '4', title: 'Auto-Settle', desc: 'The Auction Bot (via Provable DPS) automatically settles after the reveal window closes. Highest revealed bid wins. Winner claims collateral at a discount, others get automatic refunds.' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-mono text-sm font-bold">
                {item.step}
              </span>
              <div>
                <h4 className="font-headline text-base font-semibold text-text-primary mb-1">{item.title}</h4>
                <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Commitment Scheme
        </h3>
        <CodeBlock>{`// Anti-MEV sealed-bid commitment
commitment = BHP256::hash_to_field(
    BHP256::hash_to_field(actual_bid_amount) + secret_field
)
// Reveal phase verifies: recomputed commitment == stored commitment
// If mismatch → bid is invalid, deposit forfeited`}</CodeBlock>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Records
        </h3>
        <CodeBlock>{`record SealedBid {
    owner: address, auction_id: field,
    deposit_amount: u128, commitment: field,
}
record RevealedBid {
    owner: address, auction_id: field,
    actual_bid: u128, deposit_amount: u128,
}
record AuctionWin { owner, auction_id, collateral_amount, winning_bid }
record AuctionRefund { owner, auction_id, refund_amount }`}</CodeBlock>
      </section>

      {/* Flash Loans */}
      <section id="flash-loans">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Flash Loans
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          <strong className="text-text-primary">dara_flash_v1.aleo</strong> (11 transitions) provides instant
          collateral-backed flash lending. Bidirectional ALEO↔USDCx, 0.09% fee (9 BPS),
          102% collateral ratio. All positions are private records.
        </p>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Four-Step Atomic Flow
        </h3>
        <div className="space-y-3 mb-6">
          {[
            { step: '1', title: 'Lock Collateral (Borrow)', desc: 'Deposit 102% collateral (ALEO for USDCx loans, USDCx for ALEO loans). Receive a private FlashLoanReceipt.' },
            { step: '2', title: 'Claim Tokens', desc: 'Use your receipt to claim the borrowed tokens from the flash pool. Tokens arrive as private records.' },
            { step: '3', title: 'Repay + 0.09% Fee', desc: 'Return the exact borrowed amount plus the 9 BPS fee. Receive a FlashRepayReceipt confirming repayment.' },
            { step: '4', title: 'Withdraw Collateral', desc: 'Use your repay receipt to withdraw your full collateral. The flash loan cycle is complete — all private.' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-mono text-sm font-bold">
                {item.step}
              </span>
              <div>
                <h4 className="font-headline text-base font-semibold text-text-primary mb-1">{item.title}</h4>
                <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Parameters
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { param: 'Fee', value: '0.09%', detail: '9 BPS — lowest on Aleo' },
            { param: 'Collateral Ratio', value: '102%', detail: '10,200 / 10,000 BPS' },
            { param: 'Min Flash Amount', value: '100,000', detail: 'USDCx microtokens (0.1 USDCx)' },
            { param: 'Max Flash Amount', value: '100B', detail: 'USDCx microtokens per loan' },
            { param: 'Directions', value: 'ALEO↔USDCx', detail: 'Borrow either, collateral in the other' },
            { param: 'Oracle', value: 'Own Feed', detail: 'Independent price oracle for flash loans' },
          ].map((p) => (
            <div key={p.param} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-text-muted mb-0.5">{p.param}</p>
              <p className="text-sm font-semibold text-text-primary">{p.value}</p>
              <p className="text-[11px] text-text-muted">{p.detail}</p>
            </div>
          ))}
        </div>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Records
        </h3>
        <CodeBlock>{`record FlashLoanReceipt {
    owner: address,
    borrow_amount: u128, borrow_token: u8,
    collateral_amount: u128, collateral_token: u8,
    fee_amount: u128, nonce_hash: field,
}
record FlashRepayReceipt {
    owner: address,
    amount_repaid: u128,
    collateral_returned: u128,
    collateral_token: u8, nonce_hash: field,
}`}</CodeBlock>
      </section>

      {/* Governance */}
      <section id="governance">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Governance
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          <strong className="text-text-primary">dara_lend_v8_gov_v3.aleo</strong> (12 transitions) implements
          fully private on-chain governance. Users vote with zero-knowledge proofs — voter identity
          never appears on-chain. The first production private DAO on Aleo.
        </p>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Governance Flow
        </h3>
        <div className="space-y-3 mb-6">
          {[
            { step: '1', title: 'Claim GOV Tokens', desc: 'Any user can claim 1,000 governance tokens via the faucet. Tokens represent voting power.' },
            { step: '2', title: 'Create Proposal', desc: 'Proposers (min 100 power) select a parameter change, set duration (1–30 days), and submit on-chain.' },
            { step: '3', title: 'Vote Privately', desc: 'Cast your vote (For/Against) — the vote() transition has NO finalize, showing as PRIVATE in Shield wallet. Your identity is never leaked.' },
            { step: '4', title: 'Tally & Execute', desc: 'After voting ends + timelock period (min 1 day), admin tallies votes. If quorum (20%) met + majority for → proposal executes automatically.' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-mono text-sm font-bold">
                {item.step}
              </span>
              <div>
                <h4 className="font-headline text-base font-semibold text-text-primary mb-1">{item.title}</h4>
                <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Key Parameters
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { param: 'Voting Duration', value: '1–30 days', detail: '8,640 to 259,200 blocks' },
            { param: 'Timelock', value: '25% of vote', detail: 'Minimum 1 day (8,640 blocks)' },
            { param: 'Quorum', value: '20%', detail: 'Of total governance token supply' },
            { param: 'Proposal Types', value: '5', detail: 'Rate, LTV, Liq threshold, Pause, Admin' },
            { param: 'Privacy', value: '100%', detail: 'vote() has NO finalize — zero on-chain trace' },
            { param: 'Delegation', value: 'Supported', detail: 'Delegate/undelegate voting power' },
          ].map((p) => (
            <div key={p.param} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-text-muted mb-0.5">{p.param}</p>
              <p className="text-sm font-semibold text-text-primary">{p.value}</p>
              <p className="text-[11px] text-text-muted">{p.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Architecture
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          DARA consists of three main components working together:
        </p>

        <div className="space-y-4 mb-6">
          {[
            {
              title: 'Leo Smart Contracts (7 programs — v8)',
              items: ['76 total transitions across 7 programs, ~5M compiled variables, 11+ private record types', 'Core lending (12+12), Vault (10), Governance (12), Dark Pool (9), Auctions (10), Flash Loans (11)', 'Imports credits.aleo, test_usdcx_stablecoin.aleo, test_usad_stablecoin.aleo, merkle_tree.aleo', 'Independent circuit breakers per module, BHP256 commitment schemes, replay protection'],
            },
            {
              title: 'React Frontend (Vite + TypeScript)',
              items: ['Shield Wallet integration for private record management', '18 app pages: Dashboard, Supply, Borrow, Repay, Withdraw, Positions, Yield, Transfer, Dark Pool, Auctions, Flash Loans, Governance, Analytics, Rates, History, Stats, Liquidate, Admin', 'Real-time analytics with multi-collateral composition', 'Luxury "Obsidian Ledger" design system'],
            },
            {
              title: 'Express Backend — Sentinel (TypeScript)',
              items: ['5-source oracle aggregation with outlier rejection (median-based)', '7 automated bots: Oracle (30 min), Interest (1 hr), Yield (6 hr), Liquidation (1 min), Dark Pool (5 min), Auction (5 min), Flash Oracle (30 min)', 'Provable DPS integration — JWT auth, useFeeMaster zero-gas proving, sequential nonce queue', 'Analytics API with TVL, interest rates, borrow history, flash loan stats'],
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
          DARA runs a production-grade 5-source oracle aggregation system that automatically
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
            { source: 'Gate.io', role: 'Exchange direct (free tier)', color: 'text-text-primary' },
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
          The backend aggregator polls every 2 minutes. The oracle bot pushes on-chain via Provable DPS every 30 minutes (or immediately on ≥ 0.1% price delta):
        </p>
        <ul className="space-y-2 mb-6">
          {[
            'Fetches ALEO/USD from all 5 sources in parallel (CoinGecko, CryptoCompare, Coinbase, Gate.io, CMC)',
            'Rejects outlier prices (>2σ from median) for manipulation resistance',
            'Computes median of remaining valid prices',
            'Oracle Bot checks cooldown (30 min) and price delta (≥ 0.1%) — skips if neither threshold met',
            'Submits update_oracle_price via Provable DPS (useFeeMaster: true — zero gas cost)',
            'Admin Panel always available as manual fallback to push outside the 30-min cadence',
            'Smart contract enforces additional 15% deviation cap + round-based replay protection',
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
          As a safety net, the protocol admin can trigger an oracle price update, interest accrual,
          or yield distribution manually via the Admin Panel at <code className="text-primary text-xs">/app/admin</code>.
          The same on-chain validation applies regardless of whether the update comes from the
          automated bots or the admin UI.
        </p>
      </section>

      {/* Provable DPS Automation */}
      <section id="automation">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Provable DPS Automation
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          All protocol maintenance runs headlessly through <strong className="text-text-primary">Provable DPS</strong> (Decentralized Private Sequencer).
          Seven bots execute on-chain transitions without any manual intervention — the protocol operates 24/7.
        </p>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          How Provable DPS Works
        </h3>
        <ol className="space-y-3 mb-6">
          {[
            'Bot requests a JWT from Provable API using the consumer ID and API key (X-Provable-API-Key header)',
            'JWT is returned in the authorization response header — auto-refreshed before expiry',
            'Bot builds the Leo transition inputs and submits to Provable\'s /prove endpoint',
            'useFeeMaster: true — Provable covers all gas fees, zero cost to the protocol',
            'Provable generates the ZK proof server-side and broadcasts the transaction to Aleo',
            'Sequential nonce queue ensures each bot waits for the previous TX to confirm before submitting',
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
          Seven Automated Bots
        </h3>
        <div className="space-y-2 mb-6">
          {[
            { bot: 'Oracle Bot', interval: '30 min', action: 'update_oracle_price on dara_lend_v8 — 5-source median push', color: 'text-primary' },
            { bot: 'Interest Bot', interval: '1 hr', action: 'accrue_interest — updates supply/borrow APY from utilization', color: 'text-text-primary' },
            { bot: 'Yield Bot', interval: '6 hr', action: 'distribute_yield on vault — allocates protocol fees to depositors', color: 'text-text-primary' },
            { bot: 'Liquidation Bot', interval: '1 min', action: 'Scans positions, executes liquidate if health factor < 1.0', color: 'text-text-primary' },
            { bot: 'Dark Pool Bot', interval: '5 min', action: 'settle_epoch — batch-settles matched trades at oracle mid-price', color: 'text-text-primary' },
            { bot: 'Auction Bot', interval: '5 min', action: 'settle_auction — closes reveal window, awards winner, auto-refunds losers', color: 'text-text-primary' },
            { bot: 'Flash Oracle Bot', interval: '30 min', action: 'update_oracle_price on dara_flash_v1 — separate oracle for flash contract', color: 'text-text-primary' },
          ].map((s) => (
            <div key={s.bot} className="flex items-center gap-3 p-2 rounded bg-white/[0.03]">
              <span className={`text-sm font-medium min-w-[140px] ${s.color}`}>{s.bot}</span>
              <span className="text-xs text-primary font-mono min-w-[60px]">{s.interval}</span>
              <span className="text-xs text-text-muted">{s.action}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-text-muted">
          WASM proving SDK is warmed at startup for instant first-transaction readiness. The orchestrator
          manages all seven bots with staggered intervals and automatic retry on failure.
        </p>
      </section>

      {/* Roadmap */}
      <section id="roadmap">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Roadmap
        </h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          DARA is actively evolving. Here is our development roadmap:
        </p>

        <div className="space-y-4">
          {[
            {
              phase: 'Wave 5 — Current Release (v8)',
              items: [
                'Seven-program architecture — 76 transitions, ~5M compiled variables',
                'Three new DeFi modules: Dark Pool, Sealed-Bid Auctions, Flash Loans',
                'Dark Pool — epoch-based batch trading, oracle mid-price settlement, anti-MEV',
                'Sealed-Bid Auctions — BHP256 commitments, configurable bid/reveal windows (15 min to 7 days)',
                'Flash Loans — 0.09% fee, 102% collateral, bidirectional ALEO↔USDCx, 4-step atomic flow',
                'Private Governance v1→v2→v3 evolution — from leaked voter identity to fully private ZK votes with NO finalize',
                'Governance v3: configurable voting (1–30 days), delegation, 20% quorum, timelock execution',
                'Credits contract — reverse lending: stablecoin collateral → borrow ALEO',
                'Complete UI/UX redesign — 18 app pages, Obsidian Ledger luxury dark theme',
                '7 automated bots via Provable DPS: Oracle, Interest, Yield, Liquidation, DarkPool, Auction, Flash Oracle',
                '17+ bug fixes and UX improvements across all modules',
              ],
            },
            {
              phase: 'Wave 3 — Previous Release',
              items: [
                'Single program, 6 transitions — basic supply/borrow/repay/liquidate/withdraw',
                'Single collateral (ALEO only), single borrow (USDCx only)',
                'Dual-record architecture — DebtPosition + LiquidationAuth with hashed borrower',
                '5-source oracle aggregation',
              ],
            },
            {
              phase: 'Future Vision',
              items: [
                'Cross-chain collateral via NEAR Intents',
                'Decentralized admin transition through governance',
                'Multi-asset oracle feeds (not just ALEO/USD)',
                'Mainnet deployment after security audit',
                'SDK for third-party integrations',
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
              a: 'Three collateral types: ALEO credits (native), USDCx stablecoin, and USAD stablecoin. Each has dedicated supply, withdraw, and liquidation transitions. Stablecoin operations use MerkleProof for freeze-list compliance.',
            },
            {
              q: 'What can I borrow?',
              a: 'You can borrow USDCx or USAD stablecoins against ALEO collateral, or borrow ALEO credits against stablecoin collateral via the Credits contract. Each borrow type has its own transition with the same LTV/fee parameters.',
            },
            {
              q: 'What is the Dark Pool?',
              a: 'The dark pool enables private OTC-style trading without exposing order intent. Makers submit encrypted TradeIntent records, takers fill against the oracle mid-price in epoch-based batches, and settlement happens atomically. No one can front-run your trades because intents are invisible until matched.',
            },
            {
              q: 'How do Sealed-Bid Auctions work?',
              a: 'Auctions use a commit-reveal scheme: bidders submit a BHP256 hash of (amount + secret) during the bidding phase, then reveal during the reveal phase. The contract verifies the hash matches. Highest bidder wins the collateral; losers get automatic refunds. Bid windows range from 15 minutes to 7 days.',
            },
            {
              q: 'What are Flash Loans?',
              a: 'Flash loans let you borrow ALEO or USDCx with minimal collateral (102%) for a single atomic flow: borrow → receive FlashLoanReceipt → repay (principal + 0.09% fee) → withdraw collateral. The entire cycle is on-chain and fully private. 4 transitions handle the complete lifecycle.',
            },
            {
              q: 'How does Governance work?',
              a: 'GovernanceToken holders can create proposals, delegate voting power, and cast ZK-verified votes during a configurable voting period (1–30 days). Proposals require a 20% quorum to pass. All votes are encrypted — no one can see how you voted, only the aggregate result.',
            },
            {
              q: 'What happens if I get liquidated?',
              a: 'If the oracle price drops below your liquidation price, a liquidator holding your LiquidationAuth record can trigger liquidation. Your collateral is seized (plus a 5% bonus to the liquidator) and the debt is cleared. The liquidator cannot see your exact liquidation price beforehand.',
            },
            {
              q: 'What wallet do I need?',
              a: 'DARA works with the Shield Wallet browser extension, which supports Aleo\'s private record model, zero-knowledge proof generation, and direct transaction signing.',
            },
            {
              q: 'What network is DARA deployed on?',
              a: 'Currently on Aleo Testnet with 7 deployed contracts: dara_lend_v8, dara_lend_v8_credits, dara_lend_v8_vault, dara_lend_v8_gov_v3, dara_dark_pool_v1, dara_auction_v1, and dara_flash_v1. All are live and verifiable on the Aleo explorer. Mainnet deployment planned after audits.',
            },
            {
              q: 'What is the Yield Vault?',
              a: 'The yield vault lets users deposit USDCx or USAD stablecoins and receive PoolShare records. Protocol fees are distributed as yield by the admin. When redeeming, users get their original deposit plus accumulated yield (minus 0.1% fee). All deposits use private token records.',
            },
            {
              q: 'How do Private Transfers work?',
              a: 'The vault contract provides a ZK-shielded relay that atomically deposits your tokens and re-mints them to the recipient in a single transaction. This breaks the on-chain link between sender and recipient completely. Nonce replay protection prevents double-spending.',
            },
            {
              q: 'How does the oracle prevent manipulation?',
              a: 'The oracle aggregates prices from 5 independent sources (CoinGecko, CryptoCompare, Coinbase, Gate.io, CoinMarketCap), rejects outliers, and uses median filtering. On-chain, the smart contract enforces a 15% deviation cap per update, a minimum 5-block interval between updates, and monotonic round counters to prevent replay attacks.',
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
