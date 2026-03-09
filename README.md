# DARA Lend

<div align="center">

**Borrow Without Being Watched.**

The first privacy-preserving lending protocol on Aleo — supply ALEO collateral, borrow USDCx stablecoin, and keep every position detail encrypted inside zero-knowledge proofs.

[![Aleo Testnet](https://img.shields.io/badge/Aleo-Testnet-00E5CC?style=flat-square)](https://testnet.explorer.provable.com/program/dara_lend_v5.aleo)
[![Leo](https://img.shields.io/badge/Leo-3.4.0-blue?style=flat-square)](https://leo-lang.org)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](#license)

Built for the **Aleo Privacy Buildathon — Wave 3**

</div>

---

## Table of Contents

- [Live Demo](#live-demo)
- [Why DARA Lend?](#why-dara-lend)
- [Privacy Architecture](#privacy-architecture)
- [Working Features](#working-features)
- [Smart Contract](#smart-contract)
- [Oracle System](#oracle-system)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [License](#license)

---

## Live Demo

| Component | Link |
|-----------|------|
| **Frontend** | [dara-lend.vercel.app](https://dara-lend.vercel.app) |
| **Backend API** | [dara-lend-api.onrender.com](https://dara-lend-api.onrender.com/api/health) |
| **Smart Contract** | [`dara_lend_v5.aleo`](https://testnet.explorer.provable.com/program/dara_lend_v5.aleo) |
| **Deployment TX** | [`at1vj2av...q8ww839`](https://testnet.explorer.provable.com/transaction/at1vj2av6kdkjf6fsty3tjdw877xjquk4trw69nfzy3jv9u3gr27cpq8ww839) |

---

## Why DARA Lend?

On transparent chains like Ethereum and Solana, lending protocols (Aave, Compound, MarginFi) expose every user's collateral, debt, and liquidation price on a public ledger. This creates a playground for MEV bots:

- **Frontrunning** — bots see pending liquidation calls and jump ahead
- **Targeted liquidation** — bots monitor health factors and manipulate prices to trigger liquidations
- **Privacy leaks** — anyone can map wallet addresses to financial positions

> *In 2023, MEV bots extracted over $600M on Ethereum by targeting visible liquidation thresholds.*

**DARA Lend eliminates this entire attack surface** by leveraging Aleo's privacy-by-default architecture. All position data — collateral amounts, debt sizes, health factors, and liquidation prices — is encrypted inside zero-knowledge proofs. MEV bots can't target what they can't see.

---

## Privacy Architecture

DARA Lend implements a two-layer privacy model that separates individual positions (private) from protocol health metrics (public):

```
╔═══════════════════════════════════════════════════════════════╗
║                     PRIVATE LAYER (Records)                   ║
║                                                               ║
║  CollateralReceipt  ·  DebtPosition  ·  LiquidationAuth      ║
║  RepaymentReceipt   ·  LiquidationReceipt                    ║
║                                                               ║
║  → Only the record owner can decrypt these                    ║
║  → Consumed on use (UTXO model — prevents double-spending)   ║
║  → Participant identities hidden at the transfer layer        ║
╠═══════════════════════════════════════════════════════════════╣
║                     PUBLIC LAYER (Mappings)                    ║
║                                                               ║
║  Total TVL  ·  Total Borrowed  ·  Loan Count  ·  Oracle Price ║
║  Fees Collected  ·  Active Loans  ·  Price History            ║
║                                                               ║
║  → Aggregate data only — no individual positions exposed      ║
║  → Anyone can verify protocol solvency on-chain              ║
╚═══════════════════════════════════════════════════════════════╝
```

### What's Private vs. Public

| Data Point | Visibility | How |
|---|---|---|
| Collateral Amount | **Private** | Stored in `CollateralReceipt` record, encrypted |
| Debt Size | **Private** | Stored in `DebtPosition` record, encrypted |
| Health Factor | **Private** | Computed client-side, never touches the chain |
| Liquidation Price | **Private** | Stored in `DebtPosition` + `LiquidationAuth` records |
| Supplier Identity | **Private** | `credits.aleo/transfer_private_to_public` hides sender |
| Borrower Identity | **Private** | Hashed via `BHP256` in `LiquidationAuth` |
| Liquidator Identity | **Private** | `credits.aleo/transfer_public_to_private` hides recipient |
| Wallet ↔ Loan Link | **Private** | No on-chain mapping between addresses and loans |
| Total Protocol TVL | Public | `vault_total_collateral` mapping |
| Active Loan Count | Public | `loan_count` mapping |
| Oracle Price | Public | `oracle_price` mapping |
| Solvency Proof | Public | Verifiable via public aggregate data |

### Dual-Record Pattern

When a user borrows, two private records are created simultaneously:

1. **`DebtPosition`** (owned by the borrower) — contains collateral amount, debt amount, liquidation price, and loan ID. Used for repayment.
2. **`LiquidationAuth`** (owned by the orchestrator) — mirrors the position data but with the borrower's address hashed. Used for liquidation when the position goes underwater.

This ensures borrowers control their own funds while the protocol can still enforce solvency — without ever exposing position data publicly.

### Token Transfer Privacy

| Operation | Token Flow | Function Used | Privacy |
|---|---|---|---|
| Supply | ALEO → Protocol | `credits.aleo/transfer_private_to_public` | Sender identity hidden |
| Borrow | USDCx → Borrower | `test_usdcx_stablecoin.aleo/transfer_public_to_private` | Recipient identity hidden |
| Repay | USDCx → Protocol | `test_usdcx_stablecoin.aleo/transfer_from_public` | Approval-based |
| Withdraw | ALEO → User | `credits.aleo/transfer_public_to_private` | Recipient identity hidden |
| Liquidate | ALEO → Liquidator | `credits.aleo/transfer_public_to_private` | Recipient identity hidden |

**5 out of 6 transitions use private transfer functions**, ensuring participant identities are hidden at the token transfer layer.

---

## Working Features

| Feature | Status | Description |
|---------|--------|-------------|
| Supply Collateral | ✅ Working | Lock ALEO credits as encrypted collateral via `transfer_private_to_public` |
| Borrow USDCx | ✅ Working | Borrow USDCx stablecoin with 0.5% origination fee, oracle freshness check, circuit breaker |
| Repay Debt | ✅ Working | Repay full debt, reclaim collateral as private credits record |
| Withdraw Collateral | ✅ Working | Withdraw unused collateral deposits as private credits record |
| Liquidation | ✅ Working | Liquidate underwater positions with 5% liquidator incentive bonus |
| Dashboard | ✅ Working | Real-time protocol stats, health factor alerts, liquidation risk banner |
| Position Viewer | ✅ Working | Decrypt and display all private records from Shield Wallet |
| Protocol Stats | ✅ Working | TVL, total borrowed, loan count, oracle price — all live from on-chain |
| Oracle Price Feed | ✅ Working | 5-source oracle (CoinMarketCap, CoinGecko, CryptoCompare, Coinbase, Binance) |
| Transaction History | ✅ Working | Persistent transaction log with status tracking and explorer links |
| Documentation | ✅ Working | In-app docs with privacy model, smart contract reference, and roadmap |
| Circuit Breaker | ✅ Working | 100,000 USDCx maximum total borrowed cap to prevent runaway debt |
| Emergency Pause | ✅ Working | Admin can freeze protocol instantly if anomalies are detected |

---

## Smart Contract

**Program ID:** `dara_lend_v5.aleo`  
**Language:** Leo 3.4.0  
**Network:** Aleo Testnet  
**Source:** [`contract/dara_lend_v1/src/main.leo`](contract/dara_lend_v1/src/main.leo) (445 lines)

### Transitions (6)

| # | Transition | Description |
|---|---|---|
| 1 | `update_oracle_price` | Admin-only price update with round-based replay protection, 15% deviation cap, and minimum block interval |
| 2 | `supply_collateral` | Accept private credits record → lock as encrypted `CollateralReceipt` → nonce-based replay protection |
| 3 | `borrow` | Borrow USDCx against collateral → creates `DebtPosition` + `LiquidationAuth` → 0.5% origination fee → oracle freshness check |
| 4 | `repay` | Burn `DebtPosition` → repay USDCx via approval pattern → reclaim ALEO collateral as private record |
| 5 | `liquidate` | Consume `LiquidationAuth` → verify price ≤ liquidation price → seize collateral + 5% bonus as private record |
| 6 | `withdraw_collateral` | Consume `CollateralReceipt` → return collateral as private credits record |

### Records (5 private)

| Record | Owner | Purpose |
|---|---|---|
| `CollateralReceipt` | Supplier | Proves collateral deposit, used for withdraw or borrow |
| `DebtPosition` | Borrower | Contains loan details, consumed during repayment |
| `LiquidationAuth` | Orchestrator | Authorizes liquidation, borrower address hashed for privacy |
| `RepaymentReceipt` | Borrower | Proof of successful repayment |
| `LiquidationReceipt` | Liquidator | Proof of successful liquidation |

### Mappings (11 public)

| Mapping | Purpose |
|---|---|
| `vault_total_collateral` | Aggregate TVL in microcredits |
| `total_borrowed` | Total outstanding USDCx debt |
| `loan_count` | Number of active loans |
| `oracle_price` | Current ALEO/USD price (6 decimal precision) |
| `price_update_block` | Block height of last oracle update |
| `used_nonces` | Replay protection for supply deposits |
| `protocol_admin` | Admin address for oracle updates |
| `active_loans` | Boolean flag per loan ID |
| `total_fees_collected` | Accumulated origination fees |
| `price_round` | Monotonic round counter for oracle |
| `price_history` | Previous price for deviation checking |

### Protocol Parameters

| Parameter | Value | Description |
|---|---|---|
| LTV Ratio | 70% | Maximum borrow ratio (collateral value) |
| Liquidation Threshold | 80% | Position becomes liquidatable |
| Min Collateral | 0.1 ALEO | 100,000 microcredits minimum deposit |
| Origination Fee | 0.5% | Charged on borrow (50 BPS) |
| Liquidation Bonus | 5% | Incentive for liquidators (500 BPS) |
| Max Total Borrowed | 100,000 USDCx | Circuit breaker cap |
| Max Oracle Age | 100 blocks | ~5 minute freshness window |
| Max Price Deviation | 15% | Single-update change cap |
| Min Update Interval | 5 blocks | Minimum gap between oracle updates |
| Precision | 6 decimals | 1,000,000 = 1.0 |

### External Program Integration

```
credits.aleo
├── transfer_private_to_public   → Supply (private inflow)
├── transfer_public_to_private   → Withdraw / Liquidate / Repay collateral return (private outflow)

test_usdcx_stablecoin.aleo
├── transfer_public_to_private   → Borrow (private USDCx to borrower)
├── transfer_from_public         → Repay (approval-based USDCx return)
```

---

## Oracle System

DARA Lend runs a production-grade 5-source oracle aggregation system:

```
                    ┌──────────────────┐
                    │  CoinMarketCap   │ ← Primary source
                    │    (API key)     │
                    └────────┬─────────┘
                             │
┌──────────┐  ┌──────────┐  │  ┌──────────┐  ┌──────────┐
│ CoinGecko│  │CryptoComp│  │  │ Coinbase │  │ Binance  │
│  (free)  │  │  (free)  │  │  │  (free)  │  │  (free)  │
└────┬─────┘  └────┬─────┘  │  └────┬─────┘  └────┬─────┘
     │             │        │       │              │
     └─────────────┴────────┴───────┴──────────────┘
                             │
                    ┌────────▼─────────┐
                    │   Aggregator     │
                    │  Median filter   │
                    │  Outlier reject  │
                    │  15% deviation   │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  On-Chain Price   │
                    │  update_oracle    │
                    │  (every 2 min)   │
                    └──────────────────┘
```

**How it works:**
1. Backend fetches ALEO/USD from all 5 sources in parallel every 2 minutes
2. Outlier prices (>2σ from median) are rejected
3. Remaining prices are median-aggregated for manipulation resistance
4. On-chain smart contract enforces an additional 15% deviation cap per update
5. Round-based replay protection prevents duplicate price submissions
6. Frontend serves cached prices via `/api/price` with 5-minute TTL and cascading fallback (CMC → CoinGecko → CryptoCompare)

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite 5 | Build tool & dev server |
| Tailwind CSS 3 | Utility-first styling |
| Framer Motion 11 | Animations & transitions |
| React Router 6 | Client-side routing |
| Zustand 5 | State management |
| React Query 5 | Server state & caching |
| React Hot Toast | Notification system |
| @provablehq/aleo-wallet-adaptor | Shield Wallet integration |
| @provablehq/sdk | Aleo SDK for on-chain reads |

### Backend
| Technology | Purpose |
|---|---|
| Express 4 | HTTP server |
| TypeScript | Type safety |
| node-cron | Scheduled oracle updates |
| @provablehq/sdk | Transaction building & signing |
| dotenv | Environment configuration |

### Smart Contract
| Technology | Purpose |
|---|---|
| Leo 3.4.0 | Smart contract language |
| Aleo VM | Zero-knowledge execution |
| credits.aleo | Native ALEO token transfers |
| test_usdcx_stablecoin.aleo | USDCx stablecoin integration |

---

## Project Structure

```
DARA-Lend/
├── contract/                    # Leo smart contract
│   └── dara_lend_v1/
│       └── src/main.leo         # dara_lend_v5.aleo (445 lines)
│
├── backend/                     # Express API + Oracle service
│   └── src/
│       ├── index.ts             # Entry point
│       ├── api/
│       │   ├── server.ts        # Express app setup
│       │   └── routes/          # REST endpoints
│       │       ├── health.ts    # Health check
│       │       ├── oracle.ts    # Oracle status
│       │       ├── price.ts     # Price feed (5-min cache)
│       │       ├── solvency.ts  # Protocol solvency
│       │       ├── stats.ts     # On-chain stats
│       │       └── transaction.ts # TX building
│       ├── oracle/
│       │   ├── aggregator.ts    # 5-source median aggregation
│       │   ├── priceUpdater.ts  # Cron-based on-chain updates
│       │   ├── validator.ts     # Price validation rules
│       │   └── sources/         # Individual price sources
│       │       ├── binance.ts
│       │       ├── coinbase.ts
│       │       ├── coingecko.ts
│       │       ├── coinmarketcap.ts
│       │       └── cryptocompare.ts
│       ├── liquidation/
│       │   └── monitor.ts       # Liquidation monitoring
│       └── utils/
│           ├── aleoClient.ts    # Aleo RPC client
│           ├── config.ts        # Environment config
│           └── transactionBuilder.ts
│
├── frontend/                    # React SPA
│   └── src/
│       ├── App.tsx              # Router setup
│       ├── main.tsx             # Entry point
│       ├── pages/
│       │   ├── Landing.tsx      # Marketing landing page
│       │   ├── AppDashboard.tsx # Main app dashboard
│       │   └── Docs.tsx         # Documentation page
│       ├── components/
│       │   ├── app/             # Dashboard components
│       │   ├── landing/         # Landing page sections
│       │   ├── layout/          # Sidebar, header, layouts
│       │   ├── shared/          # Reusable UI components
│       │   ├── icons/           # SVG icon components
│       │   └── docs/            # Documentation components
│       ├── hooks/               # Custom React hooks
│       │   ├── useAleoClient.ts # On-chain data reads
│       │   ├── useMarketPrice.ts # Price polling
│       │   ├── useProtocolStats.ts # TVL, loans, oracle
│       │   ├── useTransaction.ts # TX execution
│       │   └── useWalletRecords.ts # Private record decryption
│       ├── stores/
│       │   └── appStore.ts      # Zustand global state
│       └── utils/
│           ├── constants.ts     # Program IDs, addresses
│           ├── formatting.ts    # Number/credit formatters
│           └── records.ts       # Record parsing utilities
│
├── render.yaml                  # Render.com backend deployment
├── vercel.json                  # Vercel frontend deployment
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Shield Wallet browser extension ([Install Shield](https://www.shieldwallet.co))

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/DARA-Lend.git
cd DARA-Lend
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your keys (see Environment Variables below)
npm run dev
```

The backend starts on `http://localhost:3001`.

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on `http://localhost:3000`.

### 4. Connect Shield Wallet

1. Install the [Shield Wallet](https://www.shieldwallet.co) browser extension
2. Create or import an Aleo testnet account
3. Get testnet credits from the [Aleo faucet](https://faucet.aleo.org)
4. Click "Connect Wallet" in the app

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Required
PRIVATE_KEY=APrivateKey1...        # Admin key for oracle price updates
ADMIN_ADDRESS=aleo1...             # Must match protocol_admin in contract

# Oracle
CMC_API_KEY=your_coinmarketcap_key # CoinMarketCap API key (free tier)

# Infrastructure
PORT=3001
ALEO_RPC_URL=https://api.explorer.provable.com/v1
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env`)

```env
VITE_BACKEND_URL=http://localhost:3001/api
```

---

## Deployment

### Frontend → Vercel

The frontend is deployed to Vercel with the config in `vercel.json`. API requests are proxied to the backend via Vercel rewrites.

### Backend → Render

The backend is deployed to Render using the `render.yaml` blueprint. The oracle cron job runs automatically every 2 minutes to keep on-chain prices fresh.

### Smart Contract → Aleo Testnet

The contract is deployed as `dara_lend_v5.aleo` on Aleo Testnet. Deployment was done via the Leo CLI:

```bash
cd contract/dara_lend_v1
leo build
snarkos developer deploy dara_lend_v5.aleo \
  --private-key $PRIVATE_KEY \
  --query https://api.explorer.provable.com/v1 \
  --broadcast https://api.explorer.provable.com/v1/testnet/transaction/broadcast \
  --fee 5000000
```

---

## License

MIT

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
