# DARA Lend

**Borrow Without Being Watched.**

DARA Lend is a privacy-first decentralized lending protocol built on [Aleo](https://aleo.org). Users supply ALEO as collateral and borrow USDCx stablecoin — with all position data encrypted inside zero-knowledge proofs.

Built for the **Aleo Privacy Buildathon Wave 3**.

---

## Live Demo

- **Frontend:** *[Deploy URL — will be added after deployment]*
- **Contract:** [`dara_lend_v2.aleo`](https://testnet.explorer.provable.com/program/dara_lend_v2.aleo)
- **Deployment TX:** [`at1chdltvfp6xrfh5x5ypn3ahw898knvhp9wclqrwmtv2556zwzsggq227v8m`](https://testnet.explorer.provable.com/transaction/at1chdltvfp6xrfh5x5ypn3ahw898knvhp9wclqrwmtv2556zwzsggq227v8m)

---

## Why DARA Lend?

On transparent chains like Ethereum, lending protocols (Aave, Compound) expose every user's collateral, debt, and liquidation price. This creates MEV vulnerabilities where bots manipulate prices to trigger liquidations.

DARA Lend eliminates this entirely using Aleo's privacy-by-default architecture:

- **Collateral amounts** — encrypted in private records
- **Debt sizes** — encrypted in private records
- **Health factors** — computed client-side, never on-chain
- **Liquidation prices** — invisible to MEV bots

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PRIVATE (Records)                     │
│  CollateralReceipt · DebtPosition · LiquidationAuth     │
│  RepaymentReceipt · LiquidationReceipt                  │
│  → Only the record owner can decrypt these              │
├─────────────────────────────────────────────────────────┤
│                    PUBLIC (Mappings)                      │
│  Total TVL · Total Borrowed · Loan Count · Oracle Price │
│  → Aggregate data only, no individual positions         │
│  → Anyone can verify protocol solvency                  │
└─────────────────────────────────────────────────────────┘
```

### Dual-Record Pattern

When a user borrows, two private records are created:
- **DebtPosition** (owned by the borrower) — used for repayment
- **LiquidationAuth** (owned by the orchestrator) — used for liquidation

This ensures borrowers control their funds while the protocol can enforce solvency — without exposing position data publicly.

## Working Features

| Feature | Status | Description |
|---------|--------|-------------|
| Supply Collateral | ✅ Working | Lock ALEO credits as encrypted collateral via `credits.aleo/transfer_public_as_signer` |
| Borrow USDCx | ✅ Working | Borrow USDCx against collateral with 0.5% origination fee, oracle freshness check, circuit breaker |
| Repay Debt | ✅ Working | Repay full debt amount, reclaim collateral |
| Withdraw Collateral | ✅ Working | Withdraw unused collateral deposits |
| Liquidation | ✅ Working | Liquidate underwater positions with 5% liquidator incentive bonus |
| Dashboard | ✅ Working | Real-time protocol stats + health factor color alerts + liquidation risk banner |
| Position Viewer | ✅ Working | Decrypt and display all private records from Shield Wallet, click-to-copy fields |
| Protocol Stats | ✅ Working | TVL, total borrowed, loan count, oracle price — all from on-chain |
| Oracle Price Feed | ✅ Working | CoinGecko-sourced ALEO/USD price, 2-min updates with retry logic + freshness validation |
| Transaction History | ✅ Working | Persistent transaction log with status tracking and explorer links |
| Documentation | ✅ Working | In-app docs with privacy model, smart contract reference, and roadmap |

## Smart Contract

**Program ID:** `dara_lend_v2.aleo`  
**Network:** Aleo Testnet

### Transitions

| Transition | Description |
|---|---|
| `update_oracle_price` | Admin-only oracle price update from CoinGecko feed, records block height for freshness |
| `supply_collateral` | Lock ALEO credits as encrypted collateral (CollateralReceipt record), nonce bound to caller |
| `borrow` | Borrow USDCx against collateral with 0.5% fee, oracle freshness check, circuit breaker (creates DebtPosition + LiquidationAuth) |
| `repay` | Repay USDCx debt and reclaim ALEO collateral (RepaymentReceipt record) |
| `liquidate` | Liquidate underwater positions with 5% bonus (consumes LiquidationAuth, seizes collateral + bonus) |
| `withdraw_collateral` | Withdraw unused collateral (consumes CollateralReceipt) |

### External Program Integration

- **credits.aleo** — `transfer_public_as_signer` (supply), `transfer_public` (withdraw/liquidate/repay)
- **test_usdcx_stablecoin.aleo** — `transfer_public` (borrow), `transfer_from_public` (repay)

### Parameters

- **LTV Ratio:** 70% (700,000 / 1,000,000)
- **Liquidation Threshold:** 80% (800,000 / 1,000,000)
- **Min Collateral:** 0.1 ALEO (100,000 microcredits)
- **Origination Fee:** 0.5% (50 BPS)
- **Liquidation Bonus:** 5% (500 BPS)
- **Max Total Borrowed:** 100,000 USDCx (circuit breaker)
- **Max Oracle Age:** 100 blocks (~5 min freshness window)
- **Precision:** 6 decimals (1,000,000)

### Record Types

All position data is stored in **private encrypted records**:

```
CollateralReceipt { owner, collateral_amount, deposit_block, nonce_hash }
DebtPosition      { owner, collateral_amount, debt_amount, liquidation_price, loan_id }
LiquidationAuth   { owner, loan_id, collateral_amount, debt_amount, liquidation_price, borrower_hash }
RepaymentReceipt  { owner, amount_repaid, collateral_returned, loan_id }
LiquidationReceipt{ owner, loan_id, collateral_seized, debt_covered }
```

> **Privacy improvement (v2):** `LiquidationAuth` now stores `borrower_hash` (a field hash of the borrower address) instead of the raw `borrower` address, preventing the orchestrator/liquidator from identifying borrowers.

### Public Mappings (Aggregates Only)

```
vault_total_collateral: u8 => u64    — Total ALEO locked
total_borrowed:         u8 => u128   — Total USDCx borrowed
loan_count:             u8 => u64    — Number of active loans
oracle_price:           u8 => u64    — Current ALEO/USD price
used_nonces:            field => bool — Replay protection
active_loans:           field => bool — Loan state tracking
protocol_admin:         u8 => address — Admin address
price_update_block:     u8 => u32    — Block height of last oracle update
total_fees_collected:   u8 => u128   — Total origination fees collected
```

**No individual user addresses appear in any public mapping.**

## Privacy Model

### What's Encrypted
- Individual collateral amounts
- Debt positions and amounts
- Liquidation prices and thresholds
- Position ownership (wallet addresses)
- Health factors (computed client-side)

### What's Public
- Aggregate TVL (total collateral)
- Aggregate debt (total borrowed)
- Loan count
- Oracle price

### Known Limitations
Like all Aleo DeFi projects currently, DARA Lend uses public token transfers (`credits.aleo/transfer_public_as_signer` and `test_usdcx_stablecoin.aleo/transfer_public`). These expose participant addresses and amounts on-chain during supply, borrow, and repay operations. This is a known ecosystem-wide limitation — the Aleo SDK does not yet provide documentation for private stablecoin transfers. DARA Lend will migrate to fully private token flows when this becomes available.

## Project Structure

```
dara-lend/
├── contract/          Leo smart contract (dara_lend_v2.aleo)
│   └── src/main.leo   Full contract source
├── frontend/          React + TypeScript + Tailwind frontend
│   └── src/
│       ├── components/app/   Supply, Borrow, Repay, Withdraw, Liquidate, Dashboard, Stats, History
│       ├── hooks/            useTransaction, useWalletRecords, useProtocolStats
│       └── utils/            Record parsing, formatting, constants
└── backend/           Express API server + Oracle price updater + Liquidation monitor
    └── src/
        ├── oracle/    CoinGecko price feed → on-chain update_oracle_price (2-min, retry logic)
        ├── liquidation/ Protocol health monitor (LTV tracking, alerts)
        └── api/       Stats, solvency, health, transaction endpoints
```

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Shield Wallet](https://shield.app) browser extension (Aleo Testnet)
- [snarkOS](https://github.com/ProvableHQ/snarkOS) (for backend oracle only)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Backend (Oracle + API)

```bash
cd backend
cp .env.example .env
# Edit .env: set PRIVATE_KEY and ADMIN_ADDRESS
npm install
npm run dev
```

The backend runs the oracle price updater (CoinGecko → on-chain) every 2 minutes with retry logic, a liquidation monitor for protocol health tracking, and exposes API endpoints for protocol stats.

## Wave 3 Changelog

### Contract Upgrade (v1 → v2)
- **Privacy fix:** LiquidationAuth stores `borrower_hash` (field hash) instead of raw `borrower` address
- **Oracle freshness:** `update_oracle_price` records `block.height`; `borrow` and `liquidate` assert price is within 100 blocks
- **Origination fee:** 0.5% fee deducted from borrow amount, tracked in `total_fees_collected` mapping
- **Liquidation incentive:** 5% bonus collateral awarded to liquidators
- **Circuit breaker:** `borrow` enforces `MAX_TOTAL_BORROWED` cap of 100K USDCx
- **Nonce binding:** `supply_collateral` uses `BHP256::commit_to_field(nonce, self.signer)` to prevent grief attacks

### Backend Improvements
- Oracle update interval reduced from 5 min to 2 min
- Added retry logic with exponential backoff (3 attempts)
- Liquidation monitor with global LTV tracking and health alerts
- Enhanced `/health` endpoint with oracle status, protocol snapshot, and LTV data

### Frontend Improvements
- Transaction history page with localStorage persistence and explorer links
- Health factor color alerts (green/yellow/orange/red) with liquidation risk banner
- Click-to-copy on position card fields (loan_id, nonce_hash, borrower_hash)
- Cryptographically secure nonce generation (`crypto.getRandomValues`)
- Balance auto-refresh after supply
- In-app roadmap section in documentation
- TopBar route labels for all pages

## Tech Stack

- **Smart Contract:** Leo (Aleo) — deployed on Aleo Testnet
- **Frontend:** React 18, TypeScript, Vite 5, Tailwind CSS, Framer Motion
- **Backend:** Node.js, Express, TypeScript
- **Wallet:** Shield Wallet (primary) via `@provablehq/aleo-wallet-adaptor-react`
- **Token Integration:** `credits.aleo` (collateral) + `test_usdcx_stablecoin.aleo` (debt)
- **Data:** On-chain mappings via Aleo Explorer API
- **Oracle:** CoinGecko ALEO/USD price feed

## License

MIT

---

Built with privacy in mind for the Aleo Privacy Buildathon Wave 3.
