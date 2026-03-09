# DARA Lend

**Borrow Without Being Watched.**

DARA Lend is a privacy-first decentralized lending protocol built on [Aleo](https://aleo.org). Users supply ALEO as collateral and borrow USDCx stablecoin — with all position data encrypted inside zero-knowledge proofs.

Built for the **Aleo Privacy Buildathon Wave 3**.

---

## Live Demo

- **Frontend:** *[Deploy URL — will be added after deployment]*
- **Contract:** [`dara_lend_v5.aleo`](https://testnet.explorer.provable.com/program/dara_lend_v5.aleo)
- **Deployment TX:** [`at1vj2av6kdkjf6fsty3tjdw877xjquk4trw69nfzy3jv9u3gr27cpq8ww839`](https://testnet.explorer.provable.com/transaction/at1vj2av6kdkjf6fsty3tjdw877xjquk4trw69nfzy3jv9u3gr27cpq8ww839)

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
| Supply Collateral | ✅ Working | Lock ALEO credits as encrypted collateral via private `credits.aleo/transfer_private_to_public` |
| Borrow USDCx | ✅ Working | Borrow USDCx against collateral with 0.5% origination fee, oracle freshness check, circuit breaker — USDCx disbursed as private Token record |
| Repay Debt | ✅ Working | Repay full debt amount, reclaim collateral as private credits record |
| Withdraw Collateral | ✅ Working | Withdraw unused collateral deposits as private credits record |
| Liquidation | ✅ Working | Liquidate underwater positions with 5% liquidator incentive bonus, seized collateral as private record |
| Dashboard | ✅ Working | Real-time protocol stats + health factor color alerts + liquidation risk banner |
| Position Viewer | ✅ Working | Decrypt and display all private records from Shield Wallet, click-to-copy fields |
| Protocol Stats | ✅ Working | TVL, total borrowed, loan count, oracle price — all from on-chain |
| Oracle Price Feed | ✅ Working | CoinGecko-sourced ALEO/USD price, 2-min updates with retry logic + freshness validation |
| Transaction History | ✅ Working | Persistent transaction log with status tracking and explorer links |
| Documentation | ✅ Working | In-app docs with privacy model, smart contract reference, and roadmap |

## Smart Contract

**Program ID:** `dara_lend_v5.aleo`  
**Network:** Aleo Testnet

### Transitions

| Transition | Description |
|---|---|
| `update_oracle_price` | Admin-only oracle price update with round-based replay protection, deviation cap (15%), and minimum update interval |
| `supply_collateral` | Accept private credits record, lock as encrypted collateral (CollateralReceipt record), supplier identity hidden via `transfer_private_to_public` |
| `borrow` | Borrow USDCx against collateral with 0.5% fee, oracle freshness check, circuit breaker — USDCx sent as private Token via `transfer_public_to_private` (creates DebtPosition + LiquidationAuth) |
| `repay` | Repay USDCx debt and reclaim ALEO collateral as private credits record via `transfer_public_to_private` (RepaymentReceipt record) |
| `liquidate` | Liquidate underwater positions with 5% bonus, seized collateral sent as private credits via `transfer_public_to_private` (consumes LiquidationAuth) |
| `withdraw_collateral` | Withdraw unused collateral as private credits record via `transfer_public_to_private` (consumes CollateralReceipt) |

### External Program Integration

- **credits.aleo** — `transfer_private_to_public` (supply, private inflow), `transfer_public_to_private` (withdraw/liquidate/repay collateral return, private outflow)
- **test_usdcx_stablecoin.aleo** — `transfer_public_to_private` (borrow, private USDCx to borrower), `transfer_from_public` (repay, approval-based)

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
- **Supplier identity** — private credits records consumed via `transfer_private_to_public`
- **Borrower identity** — USDCx disbursed via `transfer_public_to_private` (private Token record)
- **Withdrawer/Liquidator identity** — collateral returned via `transfer_public_to_private`
- **Borrower hash** — `LiquidationAuth` stores `borrower_hash` (BHP256) instead of raw address

### What's Public
- Aggregate TVL (total collateral)
- Aggregate debt (total borrowed)
- Loan count
- Oracle price

### Private Transfer Architecture

DARA Lend uses privacy-preserving token transfer functions throughout:

| Operation | Function | Privacy |
|---|---|---|
| Supply Collateral | `credits.aleo/transfer_private_to_public` | Supplier identity hidden — private record consumed |
| Borrow USDCx | `test_usdcx_stablecoin.aleo/transfer_public_to_private` | Borrower receives private Token record |
| Repay USDCx | `test_usdcx_stablecoin.aleo/transfer_from_public` | Uses approval pattern |
| Return Collateral | `credits.aleo/transfer_public_to_private` | Repayer receives private credits record |
| Withdraw Collateral | `credits.aleo/transfer_public_to_private` | Withdrawer receives private credits record |
| Liquidation Payout | `credits.aleo/transfer_public_to_private` | Liquidator receives private credits record |

Observers can see aggregate fund movements (credits entering/leaving the protocol) but **cannot identify individual participants**.

## Project Structure

```
dara-lend/
├── contract/          Leo smart contract (dara_lend_v5.aleo)
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

### Contract Upgrade (v2 → v3) — Private Transfer Migration
- **Private supply:** `supply_collateral` now accepts a private `credits.aleo/credits` record and uses `transfer_private_to_public` — supplier identity is hidden from chain observers
- **Private borrow disbursement:** `borrow` now sends USDCx via `transfer_public_to_private` — borrower receives a private Token record, their identity is hidden
- **Private collateral return:** `repay`, `withdraw_collateral`, and `liquidate` now return credits via `transfer_public_to_private` — recipient identity hidden
- **Full privacy pipeline:** Only aggregate fund movements (TVL in/out) are visible; no individual participant addresses appear in any transaction

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
- Private credits record selector for supply (with public-to-private conversion helper)
- Balance auto-refresh after supply
- In-app roadmap section in documentation
- TopBar route labels for all pages

## Tech Stack

- **Smart Contract:** Leo (Aleo) — deployed on Aleo Testnet as `dara_lend_v5.aleo`
- **Frontend:** React 18, TypeScript, Vite 5, Tailwind CSS, Framer Motion
- **Backend:** Node.js, Express, TypeScript, `@provablehq/sdk`
- **Wallet:** Shield Wallet via `@provablehq/aleo-wallet-adaptor-react`
- **Token Integration:** `credits.aleo` (collateral) + `test_usdcx_stablecoin.aleo` (USDCx debt)
- **Oracle:** Multi-source aggregated (CoinGecko + CryptoCompare + Coinbase + Binance), median pricing, outlier rejection, round-based replay protection, 2-min automated updates, on-chain deviation cap + freshness validation
- **Data:** On-chain mappings via Aleo Explorer API, real-time polling

## What Sets DARA Lend Apart

### 1. End-to-End Private Token Flows
DARA Lend uses Aleo's private transfer functions throughout the entire lending lifecycle:
- **Supply:** `credits.aleo/transfer_private_to_public` — observer sees credits arriving at the protocol but **cannot identify the depositor**
- **Borrow:** `test_usdcx_stablecoin.aleo/transfer_public_to_private` — borrower receives USDCx as a **private Token record**, their identity is never exposed
- **Withdraw/Repay/Liquidate:** `credits.aleo/transfer_public_to_private` — collateral returned as **private credits records**, recipient identity hidden
- **Borrower hash:** `LiquidationAuth` stores `BHP256::hash_to_field(borrower)` instead of the raw address

No individual participant addresses appear in any public mapping or finalize block.

### 2. Automated Oracle (Not Manual Admin)
Unlike protocols that rely on an admin clicking "Update Price" manually, DARA Lend runs an automated oracle backend that:
- Fetches from **multiple independent sources** (CoinGecko → CryptoCompare → cached fallback)
- Updates on-chain every **2 minutes** with retry logic and exponential backoff
- Skips updates for price changes below 0.1% (saves gas)
- Supports **delegated proving** via Provable API for cloud deployment
- The admin panel serves as a **backup**, not the primary mechanism

### 3. On-Chain Safety Mechanisms
- **Oracle freshness**: Contract rejects stale prices (>100 blocks old)
- **Circuit breaker**: Emergency pause and max debt cap (100K USDCx)
- **Origination fee**: 0.5% on-chain fee with transparent tracking
- **Liquidation bonus**: 5% incentive ensures liquidators act quickly

### 4. Production-Grade Architecture
Three-tier system (smart contract + React frontend + Express backend) with:
- Real-time oracle status widget showing on-chain vs market price deviation
- Health factor gauge with color-coded risk alerts
- Private credits record selector with public-to-private conversion
- Transaction history with explorer links
- Liquidation monitoring bot with global LTV tracking
- Comprehensive in-app documentation

## License

MIT

---

Built with privacy in mind for the Aleo Privacy Buildathon Wave 3.
