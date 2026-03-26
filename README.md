# DARA Lend — The Obsidian Ledger

<div align="center">

**Privacy-First Multi-Collateral Lending on Aleo**

Supply ALEO, USDCx, or USAD as collateral — borrow against them — keep every position encrypted inside zero-knowledge proofs. MEV bots can't target what they can't see.

[![Aleo Testnet](https://img.shields.io/badge/Aleo-Testnet-C9DDFF?style=flat-square)](https://testnet.explorer.provable.com/program/dara_lend_v6.aleo)
[![Leo](https://img.shields.io/badge/Leo-3.4.0-blue?style=flat-square)](https://leo-lang.org)
[![Transitions](https://img.shields.io/badge/Transitions-21-D6C5A1?style=flat-square)](#smart-contract)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](#license)

Built for the **Aleo Privacy Buildathon — Wave 4**

</div>

---

## Live Demo

| Component | Link |
|-----------|------|
| **Frontend** | [dara-lend.vercel.app](https://dara-lend.vercel.app) |
| **Backend API** | [dara-lend-api.onrender.com](https://dara-lend-api.onrender.com/api/health) |
| **Smart Contract** | [`dara_lend_v6.aleo`](https://testnet.explorer.provable.com/program/dara_lend_v6.aleo) |
| **Deploy TX** | [`at1awvn7ge...slxjfk3`](https://testnet.explorer.provable.com/transaction/at1awvn7ge79yhscpymgdeuuq025xtghqnrf0yxcjuhgjr55gtz75yslxjfk3) |

---

## What's New in v6

| Feature | Description |
|---------|-------------|
| **Multi-Collateral Vaults** | Supply ALEO, USDCx, or USAD — separate vault mappings per token type |
| **Multi-Borrow** | Borrow USDCx, USAD, or ALEO credits against any supported collateral |
| **Interest Rate Model** | On-chain base rate + slope parameters (BPS), utilization-based supply/borrow APY |
| **Emergency Circuit Breaker** | Admin can `emergency_pause()` / `resume_protocol()` all operations |
| **MerkleProof Compliance** | Stablecoin operations verified against freeze-list via merkle_tree.aleo |
| **21 Transitions** | Expanded from 6 → 21 (3.5× complexity) for full multi-collateral support |
| **812 Statements** | 1,982,846 variables, 1,497,807 constraints compiled |
| **Sentinel Monitor** | Backend liquidation bot with circuit breaker awareness |
| **Analytics Dashboard** | TVL time-series, interest rates, collateral composition, oracle feed history |
| **Obsidian Ledger Design** | Luxury UI — Gilda Display serif, glass panels, signature gradients |

---

## Why Privacy Matters

On transparent chains, lending protocols expose every user's collateral, debt, and liquidation price. MEV bots extracted **$600M+** on Ethereum in 2023 by targeting visible liquidation thresholds.

**DARA Lend eliminates this attack surface:**

| Data | Visibility | How |
|------|------------|-----|
| Collateral amounts | **Encrypted** | `CollateralReceipt` record (UTXO) |
| Debt positions | **Encrypted** | `DebtPosition` record with `collateral_token` + `debt_token` |
| Liquidation prices | **Encrypted** | Stored in `DebtPosition` + `LiquidationAuth` |
| Health factors | **Client-only** | Computed in browser, never on-chain |
| Participant identity | **Hidden** | Private transfer functions per token type |
| Borrower address | **Hashed** | BHP256 in `LiquidationAuth` — no raw leak |
| Protocol TVL/Debt | Public | Aggregate vault mappings — verifiable solvency |

### Dual-Record Pattern

When a user borrows, two records are created:

1. **`DebtPosition`** → owned by borrower (for repayment)
2. **`LiquidationAuth`** → owned by orchestrator (for liquidation)

The borrower's address is hashed (BHP256) inside `LiquidationAuth` — solvency is enforceable without exposing position data.

---

## Smart Contract

**Program:** `dara_lend_v6.aleo` · **Leo 3.4.0** · **Aleo Testnet**
**Source:** [`contract/dara_lend_v1/src/main.leo`](contract/dara_lend_v1/src/main.leo)
**Cost:** 38.461253 credits · 812 statements · 1,982,846 variables

### 21 Transitions

| Category | Transitions | Description |
|----------|-------------|-------------|
| **Admin/Oracle** | `update_oracle_price`, `set_rate_params`, `emergency_pause`, `resume_protocol`, `accrue_interest` | Price feed, interest model, circuit breaker |
| **Supply** (3) | `supply_collateral`, `supply_usdcx_collateral`, `supply_usad_collateral` | Deposit ALEO/USDCx/USAD as collateral |
| **Borrow** (3) | `borrow`, `borrow_usad`, `borrow_credits` | Borrow USDCx/USAD/ALEO against collateral |
| **Repay** (4) | `repay`, `repay_usad`, `repay_credits_usdcx`, `repay_credits_usad` | Repay debt per type, return collateral |
| **Liquidate** (3) | `liquidate`, `liquidate_usdcx`, `liquidate_usad` | Seize collateral + 5% bonus per type |
| **Withdraw** (3) | `withdraw_collateral`, `withdraw_usdcx_collateral`, `withdraw_usad_collateral` | Return collateral to owner |

### 5 Private Records

| Record | Key Fields | Purpose |
|--------|------------|---------|
| `CollateralReceipt` | `token_type`, `collateral_amount`, `collateral_amount_u128`, `nonce_hash` | Proves deposit |
| `DebtPosition` | `collateral_token`, `debt_token`, `debt_amount`, `liquidation_price`, `loan_id` | Loan details |
| `LiquidationAuth` | `collateral_token`, `debt_token`, `borrower_hash`, `liquidation_price` | Authorizes liquidation |
| `RepaymentReceipt` | `amount_repaid`, `collateral_returned`, `loan_id` | Proof of repayment |
| `LiquidationReceipt` | `collateral_seized`, `debt_covered`, `loan_id` | Proof of liquidation |

### Key Mappings

| Mapping | Purpose |
|---------|---------|
| `vault_collateral_aleo` / `_usdcx` / `_usad` | Total collateral per type |
| `pool_total_borrowed[0\|1\|2]` | Total borrowed: 0=USDCx, 1=USAD, 2=ALEO |
| `oracle_price[0\|1\|2]` | Price: 0=ALEO, 1=USDCx, 2=USAD |
| `rate_base_bps` / `rate_slope_bps` | Interest rate parameters |
| `supply_apy_bps` / `borrow_apy_bps` | Current APY rates |
| `protocol_paused` | Circuit breaker flag |

### External Programs

```
credits.aleo               → ALEO supply/withdraw/borrow/liquidate
test_usdcx_stablecoin.aleo → USDCx borrow/repay/supply (+ MerkleProof)
test_usad_stablecoin.aleo  → USAD borrow/repay/supply (+ MerkleProof)
merkle_tree.aleo           → Freeze-list compliance verification
```

### Protocol Parameters

| Parameter | Value |
|-----------|-------|
| LTV Ratio | 70% (7,000 BPS) |
| Liquidation Threshold | 80% (8,000 BPS) |
| Min Collateral | 0.1 ALEO (100,000 μcredits) |
| Origination Fee | 0.5% (50 BPS) |
| Liquidation Bonus | 5% (500 BPS) |
| Max Borrowed | 100,000 USDCx |
| Max Oracle Age | 100 blocks |
| Max Price Deviation | 15% per update |
| Precision | 6 decimals |

---

## Oracle System

5-source price aggregation with automated on-chain updates:

```
  CoinGecko · CryptoCompare · Coinbase · Binance · CoinMarketCap
                          ↓
              Median filter + outlier rejection (>2σ)
                          ↓
              15% deviation cap · round replay protection
                          ↓
              update_oracle_price → on-chain (every 2 min)
```

**Pipeline:** Fetch all 5 → reject outliers → median → compare vs on-chain → submit if >0.1% change → contract enforces 15% cap + 5-block interval + round counter.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React 18 + Vite + Tailwind)                  │
│  Shield Wallet ←→ Private record decrypt/display        │
│  Analytics dashboard, glass-panel luxury UI              │
├─────────────────────────────────────────────────────────┤
│  Backend Sentinel (Express + TypeScript)                 │
│  5-source oracle · analytics API · liquidation monitor   │
├─────────────────────────────────────────────────────────┤
│  Smart Contract (dara_lend_v6.aleo · Leo 3.4.0)         │
│  21 transitions · 3 collateral types · interest model    │
│  credits.aleo · usdcx · usad · merkle_tree.aleo         │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS 3, Framer Motion 11, Zustand 5, React Query 5 |
| **Backend** | Express 4, TypeScript, node-cron, @provablehq/sdk |
| **Contract** | Leo 3.4.0, credits.aleo, test_usdcx_stablecoin.aleo, test_usad_stablecoin.aleo, merkle_tree.aleo |
| **Design** | Gilda Display (serif), Inter (body), Space Grotesk (labels), Material Symbols Outlined |

---

## Project Structure

```
DARA-Lend/
├── contract/dara_lend_v1/
│   └── src/main.leo              # dara_lend_v6.aleo (812 statements, 21 transitions)
│
├── backend/src/
│   ├── index.ts                  # Sentinel entry point
│   ├── api/
│   │   ├── server.ts             # Express v2.0.0
│   │   └── routes/               # health, oracle, price, solvency, stats, analytics, transaction
│   ├── oracle/                   # 5-source aggregator, priceUpdater (2-min cron), validator
│   ├── liquidation/monitor.ts    # Sentinel — liquidation + circuit breaker monitor
│   └── utils/                    # aleoClient, config (v6), transactionBuilder
│
├── frontend/src/
│   ├── pages/                    # Landing, AppDashboard, Docs
│   ├── components/
│   │   ├── app/                  # Dashboard, Supply, Borrow, Repay, Withdraw, Liquidate,
│   │   │                         # Positions, OracleStatus, ProtocolStats, Analytics, History
│   │   ├── landing/              # Hero, Features, Privacy, Stats, Oracle, Multi-collateral, CTA
│   │   ├── layout/               # Sidebar, TopBar, AppLayout, Navbar, Footer
│   │   ├── shared/               # StatCard, WalletButton, GlowCard, PrivacyBadge, etc.
│   │   └── docs/                 # DocsContent, DocsSidebar, DocsLayout
│   ├── hooks/                    # useAleoClient, useMarketPrice, useTransaction, useWalletRecords
│   ├── stores/appStore.ts        # Zustand state
│   └── utils/                    # constants (v6), formatting, records
│
├── render.yaml                   # Backend deployment (Render)
└── vercel.json                   # Frontend deployment (Vercel)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Shield Wallet](https://www.shieldwallet.co) browser extension (Aleo Testnet)

### Backend

```bash
cd backend
npm install
cp .env.example .env    # Set PRIVATE_KEY, ADMIN_ADDRESS, CMC_API_KEY
npm run dev             # Starts on :3001 with oracle cron
```

### Frontend

```bash
cd frontend
npm install
npm run dev             # Starts on :3000
```

### Connect & Use

1. Install Shield Wallet → switch to Aleo Testnet
2. Get testnet credits from [faucet.aleo.org](https://faucet.aleo.org)
3. Click **Connect Wallet** → Supply collateral → Borrow → Repay → Withdraw

---

## Environment Variables

### Backend (`backend/.env`)

```env
PRIVATE_KEY=APrivateKey1...         # Admin key for oracle updates
ADMIN_ADDRESS=aleo1...              # Must match protocol_admin
CMC_API_KEY=your_key                # CoinMarketCap (optional)
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

| Target | Method | Config |
|--------|--------|--------|
| **Frontend** | Vercel | `vercel.json` — API proxy rewrites |
| **Backend** | Render | `render.yaml` — auto-deploy, oracle cron |
| **Contract** | Aleo Testnet | `leo deploy --network testnet` → `dara_lend_v6.aleo` |

```bash
# Contract deployment (already done)
cd contract/dara_lend_v1
leo deploy --network testnet \
  --endpoint https://api.explorer.provable.com/v1 \
  --broadcast --yes
# TX: at1awvn7ge79yhscpymgdeuuq025xtghqnrf0yxcjuhgjr55gtz75yslxjfk3
# Cost: 38.461253 credits
```

---

## Wave 4 Changelog (v5 → v6)

### Smart Contract
- Multi-collateral vaults: `vault_collateral_aleo`, `vault_collateral_usdcx`, `vault_collateral_usad`
- Multi-borrow: `borrow` (USDCx), `borrow_usad`, `borrow_credits` with per-type `pool_total_borrowed`
- Interest rate model: `set_rate_params`, `accrue_interest`, `supply_apy_bps`, `borrow_apy_bps`
- Emergency controls: `emergency_pause` / `resume_protocol` with `protocol_paused` mapping
- MerkleProof: Stablecoin supply/repay verified against `merkle_tree.aleo` freeze-list
- Records expanded: `token_type`, `collateral_token`, `debt_token` fields
- 6 → 21 transitions, 445 → 812 statements, 1.98M variables

### Frontend
- Luxury "Obsidian Ledger" design: Gilda Display serif, glass panels, signature gradients
- All components themed: primary #C9DDFF, secondary #D6C5A1, bg #000000, surface #131313
- Analytics dashboard: TVL time-series, interest rates, collateral composition
- Updated docs: 21-transition reference, v6 mappings, multi-collateral privacy model

### Backend (Sentinel)
- Config updated to `dara_lend_v6.aleo`
- Stats API: Multi-collateral breakdown (ALEO/USDCx/USAD)
- Solvency API: Circuit breaker pause status
- Analytics API: `/analytics/tvl`, `/price-history`, `/borrow-history`, `/interest-rates`, `/overview`
- Monitor → Sentinel: Circuit breaker awareness, multi-vault tracking

---

## License

MIT