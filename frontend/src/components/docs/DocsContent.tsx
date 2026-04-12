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
      'automation',
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
          DARA — The Invisible Protocol
        </h1>
        <p className="font-label text-[10px] uppercase tracking-[0.2em] text-primary mb-8">
          Protocol Documentation &middot; v8 &middot; Fourteen-Program DeFi Suite
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          DARA is a privacy-first DeFi suite built on Aleo. It combines multi-collateral lending,
          multi-asset dark pool trading across 4 markets (ALEO, BTC, ETH, SOL), sealed-bid auctions, flash loans,
          yield vaults, private transfers, and on-chain governance — all powered by zero-knowledge proofs.
          Every position, trade, and vote is fully encrypted, protecting users from MEV attacks,
          front-running, and surveillance.
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          v8 deploys <strong className="text-text-primary">14 programs</strong> with{' '}
          <strong className="text-text-primary">149 transitions</strong> and{' '}
          <strong className="text-text-primary">~10 million compiled variables</strong>.
          The dark pool operates across 4 independent markets with batch-based TWAP settlement,
          2-of-3 threshold operator consensus, limit orders, partial fills, and fully automated
          settlement via 7 headless bots on Provable DPS.
        </p>

        <div className="grid grid-cols-2 gap-4 mt-8">
          {[
            { value: '14', label: 'Smart Contracts', desc: 'Lending, Credits, Vault, Gov, 4 Dark Pools, 3 Test Tokens, Auctions, Flash' },
            { value: '149', label: 'On-Chain Transitions', desc: '12+12+10+12+16x4+6x3+10+11 across all programs' },
            { value: '~10M', label: 'Compiled Variables', desc: 'Largest single-project deployment on Aleo Testnet' },
            { value: '15+', label: 'Private Record Types', desc: 'Orders, fills, residuals, bids, receipts, positions, votes' },
            { value: '4', label: 'Dark Pool Markets', desc: 'ALEO/USDCx, BTC/USDCx, ETH/USDCx, SOL/USDCx' },
            { value: '7', label: 'Oracle Sources', desc: 'Coinbase, Binance, MEXC, XT.com, CoinGecko, CMC, CryptoCompare' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-lg glass-panel-sm">
              <p className="text-primary font-mono text-2xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm text-text-secondary">{stat.label}</p>
              <p className="text-[11px] text-text-muted mt-1">{stat.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-sm text-text-secondary leading-relaxed">
            <strong className="text-primary">Core:</strong>{' '}
            <a href="https://testnet.aleo.info/program/dara_lend_v8.aleo" target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline">dara_lend_v8.aleo</a>
            {' \u00b7 '}
            <a href="https://testnet.aleo.info/program/dara_lend_v8_credits.aleo" target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline">_credits</a>
            {' \u00b7 '}
            <a href="https://testnet.aleo.info/program/dara_lend_v8_vault.aleo" target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline">_vault</a>
            {' \u00b7 '}
            <a href="https://testnet.aleo.info/program/dara_lend_v8_gov_v3.aleo" target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline">_gov_v3</a>
            <br />
            <strong className="text-primary">Dark Pools:</strong>{' '}
            <a href="https://testnet.aleo.info/program/dara_dark_pool_v3.aleo" target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline">dark_pool_v3</a>
            {' \u00b7 '}
            <a href="https://testnet.aleo.info/program/dara_dp_btc_v5.aleo" target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline">dp_btc_v5</a>
            {' \u00b7 '}
            <a href="https://testnet.aleo.info/program/dara_dp_eth_v5.aleo" target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline">dp_eth_v5</a>
            {' \u00b7 '}
            <a href="https://testnet.aleo.info/program/dara_dp_sol_v5.aleo" target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline">dp_sol_v5</a>
            <br />
            <strong className="text-primary">Modules:</strong>{' '}
            <a href="https://testnet.aleo.info/program/dara_auction_v1.aleo" target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline">auction_v1</a>
            {' \u00b7 '}
            <a href="https://testnet.aleo.info/program/dara_flash_v1.aleo" target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline">flash_v1</a>
            {' \u00b7 '}
            <span className="text-text-muted">test_btc_v1 \u00b7 test_eth_v1 \u00b7 test_sol_v1</span>
          </p>
        </div>
      </section>

      {/* Privacy Model */}
      <section id="privacy-model">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Privacy Model
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          DARA implements a two-layer privacy model separating individual positions (encrypted records)
          from protocol health metrics (public mappings). Every user&apos;s activity is confidential
          while the protocol&apos;s solvency remains verifiable by anyone.
        </p>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          What&apos;s Private (15+ Encrypted Record Types)
        </h3>
        <ul className="space-y-2 mb-6">
          {[
            'Collateral & debt \u2014 encrypted in DebtPosition records (supports ALEO, USDCx, USAD)',
            'Health factors \u2014 computed client-side only, never touches the chain',
            'Borrower identity \u2014 BHP256-hashed in LiquidationAuth records',
            'Dark pool orders \u2014 encrypted OrderCommitment + OrderAuth records with limit prices',
            'Trade fills \u2014 FillReceipt records with private settlement amounts',
            'Residual orders \u2014 ResidualOrder + ResidualAuth for partial fill carry-forward',
            'Auction bids \u2014 SealedBid with BHP256 double-hash commitment until reveal phase',
            'Flash loans \u2014 FlashLoanReceipt and FlashRepayReceipt private records',
            'Governance votes \u2014 vote() has NO finalize, zero on-chain trace',
            'Yield vault shares \u2014 PoolShare records with private deposit amounts',
            'Transfer links \u2014 private relay breaks sender-recipient on-chain link',
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
            'Aggregate collateral per type (vault_collateral_aleo, _usdcx, _usad) \u2014 solvency proof',
            'Total borrowed per debt type \u2014 verifiable against collateral',
            'Oracle prices per asset \u2014 7-source median, 15% deviation cap',
            'Dark pool batch status \u2014 current batch, proposed price, approval count (not individual orders)',
            'TWAP accumulators \u2014 cumulative price/count for manipulation resistance',
            'Auction bid counts and highest-bid amounts (not individual sealed bids)',
            'Governance tallies \u2014 aggregate for/against, not individual votes',
            'Circuit breaker status per module',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted mt-1.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Anti-MEV Architecture
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          MEV bots extracted <strong className="text-text-primary">$600M+</strong> on Ethereum in 2023
          by front-running visible liquidations and sandwich-attacking trades. DARA eliminates this
          attack surface at multiple layers: encrypted order commitments (invisible to block producers),
          TWAP-based batch settlement (no temporal ordering attacks), 2-of-3 threshold operator
          approval (no single-party manipulation), and BHP256 sealed-bid commitments for auctions.
        </p>
      </section>

      {/* Getting Started */}
      <section id="getting-started">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Getting Started
        </h2>
        <div className="space-y-6">
          {[
            { step: '1', title: 'Install Shield Wallet', desc: 'Download Shield Wallet from shieldwallet.co. Create a wallet and switch to Aleo Testnet. Shield supports private record management and ZK proof generation.' },
            { step: '2', title: 'Get Testnet ALEO', desc: 'Use the Aleo faucet (faucet.aleo.org) to receive testnet credits for collateral and transaction fees.' },
            { step: '3', title: 'Supply Collateral', desc: 'Deposit ALEO, USDCx, or USAD on the Supply page. Your deposit is encrypted in a CollateralReceipt record \u2014 invisible to everyone.' },
            { step: '4', title: 'Trade on the Dark Pool', desc: 'Submit buy/sell orders on any of 4 markets (ALEO, BTC, ETH, SOL). Use the Test Token Faucet to claim free BTC/ETH/SOL tokens. Orders batch-settle automatically at TWAP price.' },
            { step: '5', title: 'Explore DeFi Modules', desc: 'Bid in sealed auctions, take flash loans (0.09% fee), deposit in the yield vault, vote on governance proposals \u2014 all fully private.' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-mono text-sm font-bold">
                {item.step}
              </span>
              <div>
                <h3 className="font-headline text-base font-semibold text-text-primary mb-1">{item.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Smart Contracts */}
      <section id="smart-contract">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Smart Contracts \u2014 14 Programs
        </h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          All programs are written in Leo 4.0 and deployed on Aleo Testnet. The suite was split
          across 14 programs due to Aleo&apos;s 2,097,152-variable-per-program limit.
        </p>

        <div className="space-y-3 mb-6">
          {[
            { name: 'dara_lend_v8.aleo', tx: '12', vars: '~1.03M', role: 'Core lending \u2014 supply ALEO, borrow USDCx/USAD, kink interest model, 7-source oracle, liquidation' },
            { name: 'dara_lend_v8_credits.aleo', tx: '12', vars: '~1.31M', role: 'Reverse lending \u2014 supply stablecoin collateral, borrow ALEO credits' },
            { name: 'dara_lend_v8_vault.aleo', tx: '10', vars: '~822K', role: 'Yield vault \u2014 USDCx/USAD deposits, yield distribution, ZK private transfers' },
            { name: 'dara_lend_v8_gov_v3.aleo', tx: '12', vars: '~404K', role: 'Private governance \u2014 vote() has NO finalize, delegation, configurable 1-30 day voting' },
            { name: 'dara_dark_pool_v3.aleo', tx: '16', vars: '~1.40M', role: 'ALEO/USDCx dark pool \u2014 batch TWAP, 2-of-3 threshold operators, partial fills' },
            { name: 'dara_dp_btc_v5.aleo', tx: '16', vars: '~1.40M', role: 'BTC/USDCx dark pool \u2014 7-source BTC oracle, same batch architecture' },
            { name: 'dara_dp_eth_v5.aleo', tx: '16', vars: '~1.40M', role: 'ETH/USDCx dark pool \u2014 7-source ETH oracle' },
            { name: 'dara_dp_sol_v5.aleo', tx: '16', vars: '~1.40M', role: 'SOL/USDCx dark pool \u2014 7-source SOL oracle' },
            { name: 'test_btc_v1.aleo', tx: '6', vars: '~277K', role: 'Test BTC token for BTC/USDCx market (faucet-claimable)' },
            { name: 'test_eth_v1.aleo', tx: '6', vars: '~277K', role: 'Test ETH token for ETH/USDCx market' },
            { name: 'test_sol_v1.aleo', tx: '6', vars: '~277K', role: 'Test SOL token for SOL/USDCx market' },
            { name: 'dara_auction_v1.aleo', tx: '10', vars: '~679K', role: 'Sealed-bid liquidation auctions \u2014 BHP256 commit-reveal' },
            { name: 'dara_flash_v1.aleo', tx: '11', vars: '~943K', role: 'Flash loans \u2014 102% collateral, 0.09% fee, bidirectional ALEO\u2194USDCx' },
          ].map((p) => (
            <div key={p.name} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-1">
                <a href={`https://testnet.aleo.info/program/${p.name}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-primary hover:underline">{p.name}</a>
                <span className="text-[10px] text-text-muted">{p.tx} transitions \u00b7 {p.vars} vars</span>
              </div>
              <p className="text-xs text-text-secondary">{p.role}</p>
            </div>
          ))}
        </div>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Record Types (15+ Private)
        </h3>
        <CodeBlock>{`// \u2500\u2500\u2500 Lending \u2500\u2500\u2500
CollateralReceipt  { token_type, collateral_amount, deposit_block }
DebtPosition       { collateral_token, debt_token, debt_amount, liquidation_price }
LiquidationAuth    { loan_id, borrower_hash (BHP256), debt_amount }

// \u2500\u2500\u2500 Dark Pool (per market) \u2500\u2500\u2500
OrderCommitment    { order_id, direction, size, limit_price, batch_id }
OrderAuth          { order_id, direction, size, batch_id, expiry_block }
FillReceipt        { order_id, fill_size, fill_price, fee_amount }
ResidualOrder      { order_id, remaining_size, limit_price, original_batch }
ResidualAuth       { order_id, remaining_size, original_batch }

// \u2500\u2500\u2500 Auctions \u2500\u2500\u2500
SealedBid          { auction_id, deposit_amount, commitment (BHP256) }
RevealedBid        { auction_id, actual_bid, deposit_amount }
AuctionWin         { auction_id, collateral_amount, winning_bid }
AuctionRefund      { auction_id, refund_amount }

// \u2500\u2500\u2500 Flash Loans \u2500\u2500\u2500
FlashLoanReceipt   { borrow_amount, collateral_amount, fee_amount }
FlashRepayReceipt  { amount_repaid, collateral_returned }

// \u2500\u2500\u2500 Governance & Vault \u2500\u2500\u2500
GovernanceToken    { voting_power }
PoolShare          { token_type, share_amount, deposit_amount }`}</CodeBlock>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Protocol Parameters
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { param: 'LTV Ratio', value: '50%', detail: 'Borrow up to 50% of collateral' },
            { param: 'Liquidation Bonus', value: '5%', detail: '500 BPS incentive to liquidators' },
            { param: 'Origination Fee', value: '0.5%', detail: '50 BPS on borrow' },
            { param: 'Interest Model', value: 'Kink', detail: 'Base 2% + slope1 4% + slope2 75% at 80% util' },
            { param: 'Max Price Deviation', value: '15%', detail: '1,500 BPS per oracle update' },
            { param: 'Dark Pool Fee', value: '5 BPS', detail: '0.05% configurable trading fee' },
            { param: 'Flash Loan Fee', value: '9 BPS', detail: '0.09% \u2014 lowest on Aleo' },
            { param: 'Precision', value: '6 decimals', detail: '1,000,000 = 1.0 token' },
          ].map((p) => (
            <div key={p.param} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-text-muted mb-0.5">{p.param}</p>
              <p className="text-sm font-semibold text-text-primary">{p.value}</p>
              <p className="text-[11px] text-text-muted">{p.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dark Pool */}
      <section id="dark-pool">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Dark Pool \u2014 4 Markets
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          Multi-asset private OTC trading with batch-based TWAP pricing, 2-of-3 threshold
          operator consensus, limit orders, partial fills, and residual carry-forward. Each
          market is an independent smart contract with its own oracle, batch state, and operator set.
        </p>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Markets & Price Scaling
        </h3>
        <div className="space-y-2 mb-6">
          {[
            { market: 'ALEO/USDCx', program: 'dara_dark_pool_v3.aleo', scale: '\u00f71', example: '$0.05 \u2192 50,000u64' },
            { market: 'BTC/USDCx', program: 'dara_dp_btc_v5.aleo', scale: '\u00f71000', example: '$100K \u2192 100,000u64' },
            { market: 'ETH/USDCx', program: 'dara_dp_eth_v5.aleo', scale: '\u00f7100', example: '$2.5K \u2192 25,000,000u64' },
            { market: 'SOL/USDCx', program: 'dara_dp_sol_v5.aleo', scale: '\u00f710', example: '$150 \u2192 15,000,000u64' },
          ].map((m) => (
            <div key={m.market} className="flex items-center gap-3 p-3 rounded bg-white/[0.03] border border-white/[0.06]">
              <span className="font-mono text-sm text-primary font-bold min-w-[100px]">{m.market}</span>
              <span className="text-xs text-text-muted font-mono">{m.program}</span>
              <span className="text-xs text-text-secondary ml-auto">{m.scale} \u00b7 {m.example}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted mb-6">
          Price scaling ensures all prices fit within MAX_PRICE (100,000,000u64 = $100 at 6 decimals).
          Frontend automatically converts back for display.
        </p>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Settlement Pipeline (Fully Automated)
        </h3>
        <div className="space-y-3 mb-6">
          {[
            { step: '1', title: 'Submit Order', desc: 'Trader creates encrypted OrderCommitment (buy or sell) with optional limit price. Locks USDCx (buy) or base token (sell). Order is invisible to everyone.' },
            { step: '2', title: 'Batch Collection', desc: 'Orders accumulate in the current batch window. Each batch has independent lifecycle per market.' },
            { step: '3', title: 'Oracle Update', desc: 'Bot fetches 7-source prices, median-filters, scales by market priceScale, clamps to \u00b114.5% of on-chain, pushes TWAP accumulator via Provable DPS.' },
            { step: '4', title: 'Propose Settlement', desc: 'Operator 1 (admin) computes TWAP from on-chain accumulators (twap_cum_price / twap_cum_count), proposes batch settlement at TWAP price.' },
            { step: '5', title: 'Approve Settlement', desc: 'Operator 2 (separate private key) confirms settlement price \u2192 2-of-3 threshold met. No single key can settle alone.' },
            { step: '6', title: 'Execute Match', desc: 'Bot decrypts OrderAuth records, pairs buy/sell orders, executes matches at clearing price. Partial fills produce ResidualOrder + ResidualAuth.' },
            { step: '7', title: 'Advance Batch', desc: 'Bot advances to next batch. Unfilled residuals can be resubmitted via resubmit_residual.' },
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
          Two-Operator Threshold Architecture
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          Settlement requires two independent private keys: Operator 1 (admin) proposes the batch
          price, Operator 2 (dedicated approver key) confirms. Neither key alone can execute settlement.
          This prevents single-party price manipulation and provides institutional-grade security for
          the settlement pipeline.
        </p>
        <CodeBlock>{`// On-chain operator verification in approve_settlement:
let op_hash: field = BHP256::hash_to_field(batch_id);
let caller_hash: field = BHP256::hash_to_field(self.caller);
let key: field = BHP256::hash_to_field(op_hash + caller_hash);
// Prevents double-approval by same operator
assert(!Mapping::contains(operator_approved_batch, key));
// Verifies caller is operators[1], [2], or [3]
assert(self.caller == ops_1 || self.caller == ops_2 || self.caller == ops_3);`}</CodeBlock>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Transitions (16 per market)
        </h3>
        <div className="space-y-2">
          {[
            { name: 'set_operators(op1, op2, op3)', desc: 'Admin: configure 3 threshold operator addresses' },
            { name: 'update_oracle_price(price, round)', desc: 'Operator: push oracle price + update TWAP accumulator' },
            { name: 'submit_buy_order(usdcx, size, limit, expiry, op, nonce)', desc: 'Lock USDCx, create encrypted buy order with limit price' },
            { name: 'submit_sell_order(token, amount, limit, expiry, op, nonce)', desc: 'Lock base token, create encrypted sell order' },
            { name: 'propose_settlement(batch, price)', desc: 'Operator 1: propose batch at TWAP-validated price' },
            { name: 'approve_settlement(batch, price)', desc: 'Operator 2: second approval for 2-of-3 threshold' },
            { name: 'execute_match(buy_auth, sell_auth, price)', desc: 'Operator: match buy+sell at clearing price \u2192 FillReceipt' },
            { name: 'execute_partial_fill(auth, fill_size, price)', desc: 'Operator: partial match \u2192 FillReceipt + ResidualOrder' },
            { name: 'resubmit_residual(residual, auth, op)', desc: 'Trader: carry unfilled portion into next batch' },
            { name: 'cancel_buy_order / cancel_sell_order', desc: 'Cancel and reclaim locked tokens anytime before fill' },
            { name: 'advance_batch(batch)', desc: 'Operator: close batch, start next cycle' },
            { name: 'withdraw_fees / set_fee_bps', desc: 'Admin: manage configurable BPS fee vault' },
            { name: 'pause_darkpool / resume_darkpool', desc: 'Admin: emergency controls' },
          ].map((t) => (
            <div key={t.name} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="font-mono text-xs text-primary mb-1">{t.name}</p>
              <p className="text-xs text-text-secondary">{t.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Test Token Faucet
        </h3>
        <p className="text-text-secondary leading-relaxed mb-2">
          Any connected wallet can claim free test tokens to trade on the dark pool:
        </p>
        <ul className="space-y-1 mb-4">
          {[
            '10 BTC, 10 ETH, or 10 SOL per claim (6 decimal precision)',
            '5 claims per token per address per day',
            'Tokens transfer from admin wallet via Provable DPS',
            'One-click claim buttons on the Dark Pool page',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Anti-MEV Guarantees
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { title: 'Encrypted Orders', desc: 'OrderCommitment records are invisible to block producers and validators' },
            { title: 'TWAP Settlement', desc: 'Batch settles at time-weighted average \u2014 no single-point price manipulation' },
            { title: 'Threshold Operators', desc: '2-of-3 approval prevents any single operator from controlling settlement' },
            { title: 'Batch Architecture', desc: 'All orders in a batch get the same price \u2014 no temporal ordering attacks' },
          ].map((g) => (
            <div key={g.title} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-sm font-medium text-text-primary mb-1">{g.title}</p>
              <p className="text-xs text-text-secondary">{g.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sealed-Bid Auctions */}
      <section id="auctions">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Sealed-Bid Auctions
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          <strong className="text-text-primary">dara_auction_v1.aleo</strong> (10 transitions) \u2014 the first
          sealed-bid auction system on Aleo. Liquidated collateral is auctioned privately using
          BHP256 commit-reveal. Bids are cryptographically hidden until the reveal phase.
        </p>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Auction Flow
        </h3>
        <div className="space-y-3 mb-6">
          {[
            { step: '1', title: 'Start Auction', desc: 'Admin lists liquidated collateral with configurable bid window (15 min to 7 days) and reveal window.' },
            { step: '2', title: 'Submit Sealed Bid', desc: 'Lock USDCx + submit commitment = BHP256(BHP256(bid) + secret). No one sees the actual bid amount.' },
            { step: '3', title: 'Reveal Bid', desc: 'After bid window closes, reveal actual amount + secret. Contract verifies hash matches. Must reveal before window closes or deposit is forfeited.' },
            { step: '4', title: 'Settle & Claim', desc: 'Highest revealed bid wins. Winner claims collateral at discount, losers get automatic USDCx refunds. Auction bot auto-settles after reveal window.' },
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
        <CodeBlock>{`// Anti-MEV sealed-bid commitment (Leo 4.0)
let inner: field = BHP256::hash_to_field(actual_bid_amount);
let commitment: field = BHP256::hash_to_field(inner + secret_field);
// Reveal phase: recomputed commitment must equal stored
// Mismatch \u2192 bid invalid, deposit forfeited`}</CodeBlock>
      </section>

      {/* Flash Loans */}
      <section id="flash-loans">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Flash Loans
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          <strong className="text-text-primary">dara_flash_v1.aleo</strong> (11 transitions) \u2014
          instant collateral-backed flash lending. Bidirectional ALEO\u2194USDCx with 0.09% fee
          and 102% collateral. All positions are private records with independent oracle.
        </p>

        <div className="space-y-3 mb-6">
          {[
            { step: '1', title: 'Lock Collateral', desc: 'Deposit 102% collateral (ALEO for USDCx loans, USDCx for ALEO). Receive private FlashLoanReceipt.' },
            { step: '2', title: 'Claim Tokens', desc: 'Present receipt \u2192 receive borrowed tokens from flash pool as private records.' },
            { step: '3', title: 'Repay + 0.09% Fee', desc: 'Return principal + 9 BPS fee \u2192 receive FlashRepayReceipt.' },
            { step: '4', title: 'Withdraw Collateral', desc: 'Present repay receipt \u2192 reclaim full collateral. Cycle complete, fully private.' },
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

        <div className="grid grid-cols-2 gap-3">
          {[
            { param: 'Fee', value: '0.09%', detail: '9 BPS \u2014 lowest on Aleo' },
            { param: 'Collateral', value: '102%', detail: '10,200 / 10,000 BPS' },
            { param: 'Directions', value: 'ALEO\u2194USDCx', detail: 'Borrow either, collateral in the other' },
            { param: 'Oracle', value: 'Independent', detail: 'Separate flash oracle bot (30 min)' },
          ].map((p) => (
            <div key={p.param} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-text-muted mb-0.5">{p.param}</p>
              <p className="text-sm font-semibold text-text-primary">{p.value}</p>
              <p className="text-[11px] text-text-muted">{p.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Governance */}
      <section id="governance">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Governance \u2014 Three Iterations to Privacy
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          <strong className="text-text-primary">dara_lend_v8_gov_v3.aleo</strong> (12 transitions) \u2014
          the first production private DAO on Aleo. Evolved through 3 versions: v1 leaked voter
          identity via finalize, v2 fixed the leak but hardcoded voting duration, v3 delivers
          fully private votes with configurable periods.
        </p>

        <div className="space-y-3 mb-6">
          {[
            { step: '1', title: 'Claim GOV Tokens', desc: 'Any user claims 1,000 governance tokens via the faucet. Tokens represent voting power.' },
            { step: '2', title: 'Create Proposal', desc: 'Token holders (min 100 power) submit proposals with selected duration (1-30 days) and parameter type.' },
            { step: '3', title: 'Vote Privately', desc: 'vote() has NO finalize \u2014 zero on-chain trace. Shows as PRIVATE in Shield Wallet. Your identity is never leaked.' },
            { step: '4', title: 'Tally & Execute', desc: 'After voting + timelock (min 1 day), admin tallies. If 20% quorum met + majority for \u2192 executes automatically.' },
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

        <div className="grid grid-cols-2 gap-3">
          {[
            { param: 'Voting Duration', value: '1\u201330 days', detail: '8,640 to 259,200 blocks' },
            { param: 'Timelock', value: '25% of vote', detail: 'Minimum 1 day (8,640 blocks)' },
            { param: 'Quorum', value: '20%', detail: 'Of total governance token supply' },
            { param: 'Proposal Types', value: '5', detail: 'Rate, LTV, Liq threshold, Pause, Admin' },
            { param: 'Privacy', value: '100%', detail: 'vote() has NO finalize \u2014 truly invisible' },
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
          DARA consists of three layers working together:
        </p>

        <div className="space-y-4 mb-6">
          {[
            {
              title: 'Leo Smart Contracts (14 programs \u2014 v8)',
              items: [
                '149 transitions, ~10M compiled variables, 15+ private record types',
                'Core: lending (12+12), vault (10), governance (12)',
                'Dark pool: 4 markets (16\u00d74 = 64 transitions) with TWAP + threshold operators',
                'Modules: auctions (10), flash loans (11), test tokens (6\u00d73)',
                'Independent circuit breakers, BHP256 commitments, replay protection',
              ],
            },
            {
              title: 'React Frontend (Vite + TypeScript)',
              items: [
                'Shield Wallet integration \u2014 14-program authorization on connect',
                '18 app pages + Landing + Docs \u2014 Obsidian Ledger luxury dark theme',
                '4-market dark pool with real-time batch status, TWAP display, order tracking',
                'TransactionFlow indicators: Encrypting \u2192 ZK Proof \u2192 Broadcasting \u2192 Confirmed',
              ],
            },
            {
              title: 'Express Backend \u2014 Sentinel (TypeScript)',
              items: [
                '7-source oracle aggregation per asset (ALEO, BTC, ETH, SOL) with outlier rejection',
                '7 automated bots via Provable DPS \u2014 JWT auth, useFeeMaster zero-gas, nonce queue',
                'Multi-market dark pool settlement: oracle \u2192 propose \u2192 approve \u2192 match \u2192 advance',
                'Test token faucet: 10 BTC/ETH/SOL per claim, 5/day rate limit',
              ],
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

        <CodeBlock>{`\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502           Frontend (React / Vite)            \u2502
\u2502  18 Pages \u00b7 Shield Wallet \u00b7 Dark Theme       \u2502
\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502          Backend (Express.js)                \u2502
\u2502  7 Bots \u00b7 7-Source Oracle \u00b7 Provable DPS     \u2502
\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502        Aleo Blockchain (Testnet)             \u2502
\u2502  14 Programs \u00b7 149 Transitions \u00b7 ~10M Vars   \u2502
\u2502                                              \u2502
\u2502  \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510 \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510 \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510 \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510 \u2502
\u2502  \u2502 lend   \u2502 \u2502credits \u2502 \u2502 vault  \u2502 \u2502gov_v3 \u2502 \u2502
\u2502  \u2502 12 tx  \u2502 \u2502 12 tx  \u2502 \u2502 10 tx  \u2502 \u250212 tx  \u2502 \u2502
\u2502  \u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524 \u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524 \u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524 \u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524 \u2502
\u2502  \u2502pool_v3 \u2502 \u2502btc_v5  \u2502 \u2502eth_v5  \u2502 \u2502sol_v5 \u2502 \u2502
\u2502  \u2502 16 tx  \u2502 \u2502 16 tx  \u2502 \u2502 16 tx  \u2502 \u250216 tx  \u2502 \u2502
\u2502  \u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524 \u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524 \u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524 \u2502       \u2502 \u2502
\u2502  \u2502auction \u2502 \u2502 flash  \u2502 \u25023 tokens\u2502 \u2502       \u2502 \u2502
\u2502  \u2502 10 tx  \u2502 \u2502 11 tx  \u2502 \u2502 18 tx  \u2502 \u2502       \u2502 \u2502
\u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518 \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518 \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518 \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518 \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`}</CodeBlock>
      </section>

      {/* Oracle System */}
      <section id="oracle">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Oracle System
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          DARA runs a multi-asset 7-source oracle system across all 4 dark pool markets,
          the main lending contract, credits contract, and flash loan contract \u2014 each with
          independent price feeds, round counters, and on-chain manipulation guards.
        </p>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Per-Asset Price Aggregation
        </h3>
        <div className="space-y-2 mb-6">
          {[
            { source: 'Coinbase', role: 'Exchange direct \u2014 no API key required' },
            { source: 'Binance', role: 'Exchange direct \u2014 no API key required' },
            { source: 'MEXC', role: 'Exchange direct \u2014 no API key required' },
            { source: 'XT.com', role: 'Exchange direct \u2014 no API key required' },
            { source: 'CoinGecko', role: 'Aggregator \u2014 free tier with 10-min rate-limit cooldown' },
            { source: 'CoinMarketCap', role: 'Aggregator \u2014 API key authenticated' },
            { source: 'CryptoCompare', role: 'Aggregator \u2014 free tier with 10-min rate-limit cooldown' },
          ].map((s, idx) => (
            <div key={s.source} className="flex items-center gap-3 p-2 rounded bg-white/[0.03]">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono text-[10px] font-bold">
                {idx + 1}
              </span>
              <span className="text-sm font-medium text-text-primary">{s.source}</span>
              <span className="text-xs text-text-muted ml-auto">{s.role}</span>
            </div>
          ))}
        </div>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Pipeline
        </h3>
        <ul className="space-y-2 mb-6">
          {[
            'Fetch price per asset (ALEO, BTC, ETH, SOL) from all 7 sources in parallel',
            'Skip rate-limited sources (10-min cooldown on 429/rate-limit errors)',
            'Reject outlier prices (>2\u03c3 from median) for manipulation resistance',
            'Compute median of remaining valid prices',
            'Scale by market priceScale divisor (BTC\u00f71000, ETH\u00f7100, SOL\u00f710, ALEO\u00f71)',
            'Clamp to \u00b114.5% of current on-chain price (contract enforces 15% cap)',
            'Push update_oracle_price + TWAP accumulator via Provable DPS',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <CodeBlock>{`// On-chain oracle guards (per contract)
MAX_PRICE_DEVIATION_BPS = 1,500u64   // 15% max change per update
MIN_UPDATE_INTERVAL = 5u32           // min blocks between updates
assert(round > current_round);       // replay protection
assert(deviation_bps <= 1500);       // manipulation guard

// TWAP accumulator (dark pool contracts)
twap_cum_price += new_price;
twap_cum_count += 1;
// Settlement: proposed_price = cum_price / cum_count`}</CodeBlock>
      </section>

      {/* Provable DPS Automation */}
      <section id="automation">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Provable DPS Automation
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          Seven bots run headlessly via <strong className="text-text-primary">Provable DPS</strong> (Decentralized Private Sequencer).
          JWT authentication, useFeeMaster zero-gas proving, sequential nonce queue. The protocol operates 24/7.
        </p>

        <div className="space-y-2 mb-6">
          {[
            { bot: 'Oracle Bot', interval: '30 min', action: 'update_oracle_price on lending + credits \u2014 7-source median per asset', color: 'text-primary' },
            { bot: 'Interest Bot', interval: '1 hr', action: 'accrue_interest \u2014 kink-model supply/borrow APY update', color: 'text-text-primary' },
            { bot: 'Yield Bot', interval: '6 hr', action: 'distribute_yield \u2014 allocate protocol fees to vault depositors', color: 'text-text-primary' },
            { bot: 'Liquidation Bot', interval: '1 min', action: 'Scan positions, execute liquidation if health factor < 1.0', color: 'text-text-primary' },
            { bot: 'Dark Pool Bot', interval: '5 min / 15s', action: 'Full 5-step pipeline across 4 markets: oracle \u2192 propose \u2192 approve \u2192 match \u2192 advance', color: 'text-primary' },
            { bot: 'Auction Bot', interval: '5 min', action: 'Auto-settle after reveal window, cancel if 0 bids', color: 'text-text-primary' },
            { bot: 'Flash Oracle', interval: '30 min', action: 'Independent oracle push to dara_flash_v1.aleo', color: 'text-text-primary' },
          ].map((s) => (
            <div key={s.bot} className="flex items-center gap-3 p-3 rounded bg-white/[0.03] border border-white/[0.06]">
              <span className={`text-sm font-medium min-w-[120px] ${s.color}`}>{s.bot}</span>
              <span className="text-xs text-primary font-mono min-w-[70px]">{s.interval}</span>
              <span className="text-xs text-text-secondary">{s.action}</span>
            </div>
          ))}
        </div>

        <h3 className="font-headline text-lg font-semibold text-text-primary mt-6 mb-3">
          Dark Pool Bot \u2014 Settlement Pipeline
        </h3>
        <p className="text-text-secondary leading-relaxed mb-4">
          The most complex bot manages real-time oracle feeds AND complete batch settlement across
          4 independent markets simultaneously:
        </p>
        <ul className="space-y-2">
          {[
            'Oracle Update \u2014 7-source fetch, median filter, market priceScale, \u00b114.5% clamp, TWAP push',
            'Propose \u2014 TWAP from on-chain accumulators, propose batch price (operator 1 = admin)',
            'Approve \u2014 Confirm with operator 2 key. Pending TX tracking with 5-min timeout avoids re-submission',
            'Execute Match \u2014 Decrypt OrderAuth from tracked orders, pair buy/sell, execute at clearing price',
            'Advance \u2014 Move to next batch, clean up matched orders',
            'Catch-up mode \u2014 When deviation > 20%, oracle interval drops to 15s for rapid convergence',
            'Market rotation \u2014 4 markets rotate per tick to avoid nonce conflicts',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Roadmap */}
      <section id="roadmap">
        <h2 className="font-headline text-2xl font-bold text-text-primary mb-4">
          Roadmap
        </h2>
        <div className="space-y-4">
          {[
            {
              phase: 'Wave 5 \u2014 Current Release',
              items: [
                '14-program architecture \u2014 149 transitions, ~10M compiled variables',
                '4-market dark pool (ALEO, BTC, ETH, SOL) with batch TWAP settlement',
                '2-of-3 threshold operators \u2014 no single key controls settlement',
                'Fully automated 5-step settlement pipeline via Provable DPS',
                'Test token faucet \u2014 claim BTC/ETH/SOL for dark pool trading',
                'Sealed-bid auctions \u2014 first on Aleo, BHP256 commit-reveal',
                'Flash loans \u2014 bidirectional ALEO\u2194USDCx, 0.09% fee',
                'Governance v3 \u2014 fully private voting, configurable 1-30 day periods',
                '7 automated bots with rate-limit cooldown + pending TX tracking',
                '20+ bug fixes across settlement, oracle, UI, and wallet compatibility',
              ],
            },
            {
              phase: 'Future Vision',
              items: [
                'Cross-chain collateral via NEAR Intents',
                'Decentralized admin transition through governance execution',
                'Additional dark pool markets and trading pairs',
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
            { q: 'How many contracts does DARA deploy?', a: '14 programs on Aleo Testnet with 149 total transitions and ~10 million compiled variables. This includes 4 lending/vault/governance contracts, 4 dark pool contracts (one per market), 3 test token contracts, plus auction and flash loan modules.' },
            { q: 'What is the Dark Pool?', a: 'A multi-asset private OTC trading system across 4 markets (ALEO, BTC, ETH, SOL vs USDCx). Orders are encrypted as private records, settlement uses batch-based TWAP pricing with 2-of-3 threshold operator approval. A fully automated bot handles the entire propose, approve, match, advance pipeline.' },
            { q: 'How does the 2-of-3 threshold work?', a: 'Settlement requires two separate private keys: Operator 1 (admin) proposes the batch settlement price, Operator 2 (dedicated approver) confirms. Neither key alone can settle a batch. This prevents single-party price manipulation.' },
            { q: 'How do Sealed-Bid Auctions work?', a: 'Bidders submit BHP256(BHP256(bid) + secret) during bidding, then reveal the actual amount. Contract verifies the hash. Highest bid wins. Losers get automatic refunds. Unrevealed deposits are forfeited.' },
            { q: 'What are Flash Loans?', a: 'Instant collateral-backed lending in 4 atomic steps: lock 102% collateral, claim tokens, repay + 0.09% fee, withdraw collateral. Bidirectional ALEO/USDCx. All records are private.' },
            { q: 'How does governance voting stay private?', a: 'The vote() transition has NO finalize function — zero on-chain trace. Shield Wallet shows it as PRIVATE. Only aggregate tallies are visible after admin tally. The first truly private DAO on Aleo.' },
            { q: 'Can I trade BTC/ETH/SOL on the dark pool?', a: 'Yes. Use the Test Token Faucet to claim 10 BTC, ETH, or SOL per request (5 claims/day). Then submit buy or sell orders on any of the 4 markets. Settlement is fully automated by the dark pool bot.' },
            { q: 'How does the oracle prevent manipulation?', a: '7 independent sources per asset, median filtering, outlier rejection, 10-min rate-limit cooldown, and on-chain guards: 15% deviation cap, 5-block minimum interval, monotonic round counter. Dark pool adds TWAP accumulator for settlement pricing.' },
            { q: 'What wallet do I need?', a: 'Shield Wallet browser extension — supports Aleo private record model, ZK proof generation, and DARA 14-program authorization.' },
            { q: 'Is data really private?', a: 'All individual positions (collateral, debt, orders, bids, votes, flash loans) are encrypted in private Aleo records. Only aggregate protocol metrics (TVL, total borrowed, oracle prices) are public for solvency verification. Health factors are computed client-side only.' },
          ].map((item, idx) => (
            <div key={idx}>
              <h3 className="font-headline text-base font-semibold text-text-primary mb-2">{item.q}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}