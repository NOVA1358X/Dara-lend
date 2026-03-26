# DARA Lend — The Obsidian Ledger

<div align="center">

**Privacy-First Multi-Collateral Lending on Aleo**

Supply ALEO, USDCx, or USAD as collateral — borrow against them — keep every position encrypted inside zero-knowledge proofs. MEV bots can't target what they can't see.

[![Aleo Testnet](https://img.shields.io/badge/Aleo-Testnet-C9DDFF?style=flat-square)](https://testnet.explorer.provable.com/program/dara_lend_v7.aleo)
[![Leo](https://img.shields.io/badge/Leo-3.4.0-blue?style=flat-square)](https://leo-lang.org)
[![Transitions](https://img.shields.io/badge/Transitions-31-D6C5A1?style=flat-square)](#smart-contract)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](#license)

Built for the **Aleo Privacy Buildathon — Wave 4**

</div>

---

## Live Demo

| Component | Link |
|-----------|------|
| **Frontend** | [dara-lend.vercel.app](https://dara-lend.vercel.app) |
| **Backend API** | [dara-lend-api.onrender.com](https://dara-lend-api.onrender.com/api/health) |
| **Smart Contract (Lending)** | [`dara_lend_v7.aleo`](https://testnet.explorer.provable.com/program/dara_lend_v7.aleo) |
| **Smart Contract (Vault)** | [`dara_lend_v7_vault.aleo`](https://testnet.explorer.provable.com/program/dara_lend_v7_vault.aleo) |
| **Lending Deploy TX** | [`at17alxm45...sjrnesl`](https://testnet.explorer.provable.com/transaction/at17alxm45te8xjcuc8n4h6zajjf8ke5s0sa6tvvp4umwrwlmje4q8sjrnesl) |
| **Vault Deploy TX** | [`at16d0eejg...axvdge`](https://testnet.explorer.provable.com/transaction/at16d0eejg60l3xatmxl6uyrvyajyuy3h6808d225dsac48chgf2yzsaxvdge) |

---

## What's New in v7

| Feature | Description |
|---------|-------------|
| **Dual-Program Architecture** | Lending + Vault companion — 31 total transitions across 2 programs |
| **Yield Vault** | Deposit USDCx/USAD to earn yield from protocol fees via `dara_lend_v7_vault.aleo` |
| **Private Transfers** | ZK-shielded token relay — breaks on-chain link between sender and recipient |
| **Multi-Asset Oracle** | 6 token price feeds: ALEO, USDCx, USAD, BTC, ETH, SOL |
| **Auto Oracle Bot** | Automated multi-asset price pusher with cron scheduling |
| **Auto Liquidation Bot** | Dual-program liquidation executor with circuit breaker awareness |
| **Multi-Collateral Vaults** | Supply ALEO, USDCx, or USAD — separate vault mappings per token type |
| **Multi-Borrow** | Borrow USDCx, USAD, or ALEO credits against any supported collateral |
| **Interest Rate Model** | On-chain base rate + slope parameters (BPS), utilization-based supply/borrow APY |
| **Emergency Circuit Breaker** | Admin can `emergency_pause()` / `resume_protocol()` all operations |
| **MerkleProof Compliance** | Stablecoin operations verified against freeze-list via merkle_tree.aleo |
| **21+10 Transitions** | 21 lending + 10 vault = 31 total (2 deployed programs) |
| **2.8M Variables** | 1,982,846 (lending) + 822,245 (vault) compiled |
| **Analytics Dashboard** | TVL, multi-asset prices, vault stats, bot status, interest rates |
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

### Program 1: `dara_lend_v7.aleo` — Lending Core
**Leo 3.4.0** · **Aleo Testnet** · **21 transitions** · **1,982,846 variables**
**Cost:** 38.461253 credits · 812 statements

### 21 Lending Transitions

| Category | Transitions | Description |
|----------|-------------|-------------|
| **Admin/Oracle** | `update_oracle_price`, `set_rate_params`, `emergency_pause`, `resume_protocol`, `accrue_interest` | Price feed, interest model, circuit breaker |
| **Supply** (3) | `supply_collateral`, `supply_usdcx_collateral`, `supply_usad_collateral` | Deposit ALEO/USDCx/USAD as collateral |
| **Borrow** (3) | `borrow`, `borrow_usad`, `borrow_credits` | Borrow USDCx/USAD/ALEO against collateral |
| **Repay** (4) | `repay`, `repay_usad`, `repay_credits_usdcx`, `repay_credits_usad` | Repay debt per type, return collateral |
| **Liquidate** (3) | `liquidate`, `liquidate_usdcx`, `liquidate_usad` | Seize collateral + 5% bonus per type |
| **Withdraw** (3) | `withdraw_collateral`, `withdraw_usdcx_collateral`, `withdraw_usad_collateral` | Return collateral to owner |

### Program 2: `dara_lend_v7_vault.aleo` — Yield + Privacy
**Leo 3.4.0** · **Aleo Testnet** · **10 transitions** · **822,245 variables**

### 10 Vault Transitions

| Category | Transitions | Description |
|----------|-------------|-------------|
| **Admin** (3) | `initialize`, `emergency_pause_vault`, `resume_vault` | Setup admin, circuit breaker |
| **Yield Pool** (5) | `provide_usdcx_capital`, `provide_usad_capital`, `redeem_usdcx_capital`, `redeem_usad_capital`, `distribute_yield` | Deposit/redeem/distribute yield |
| **Privacy Relay** (2) | `private_transfer_usdcx`, `private_transfer_usad` | ZK-shielded token transfers |

### Vault Records

| Record | Key Fields | Purpose |
|--------|------------|---------|
| `PoolShare` | `token_type`, `share_amount` | Proves yield pool deposit |
| `PrivateTransferReceipt` | `amount`, `token_type`, `nonce_hash` | Proof of private transfer |

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
| `oracle_price[0\|1\|2\|3\|4\|5]` | Price: 0=ALEO, 1=USDCx, 2=USAD, 3=BTC, 4=ETH, 5=SOL |
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
│  Analytics, Yield Vault, Private Transfer, glass UI     │
├─────────────────────────────────────────────────────────┤
│  Backend Sentinel (Express + TypeScript)                 │
│  5-source oracle · auto-pusher · liquidation bot · API   │
├─────────────────────────────────────────────────────────┤
│  dara_lend_v7.aleo (Lending · 21 transitions)           │
│  3 collateral types · interest model · circuit breaker   │
├─────────────────────────────────────────────────────────┤
│  dara_lend_v7_vault.aleo (Vault · 10 transitions)       │
│  Yield pool · private relay · PoolShare records          │
├─────────────────────────────────────────────────────────┤
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
├── contract/
│   ├── dara_lend_v1/src/main.leo              # dara_lend_v7.aleo (21 transitions, 1.98M vars)
│   └── dara_lend_v7_vault/src/main.leo        # dara_lend_v7_vault.aleo (10 transitions, 822K vars)
│
├── backend/src/
│   ├── index.ts                  # Sentinel entry point
│   ├── api/
│   │   ├── server.ts             # Express v2.0.0
│   │   └── routes/               # health, oracle, price, solvency, stats, analytics, transaction
│   ├── oracle/                   # 5-source aggregator, priceUpdater, autoPusher, validator
│   ├── liquidation/              # monitor.ts + executor.ts (dual-program)
│   └── utils/                    # aleoClient, config (v7), transactionBuilder
│
├── frontend/src/
│   ├── pages/                    # Landing, AppDashboard, Docs
│   ├── components/
│   │   ├── app/                  # Dashboard, Supply, Borrow, Repay, Withdraw, Liquidate,
│   │   │                         # Positions, OracleStatus, ProtocolStats, Analytics,
│   │   │                         # YieldVault, PrivateTransfer, History
│   │   ├── landing/              # Hero, Features, Privacy, Stats, Oracle, Multi-collateral, CTA
│   │   ├── layout/               # Sidebar, TopBar, AppLayout, Navbar, Footer
│   │   ├── shared/               # StatCard, WalletButton, GlowCard, PrivacyBadge, etc.
│   │   └── docs/                 # DocsContent, DocsSidebar, DocsLayout
│   ├── hooks/                    # useAleoClient, useMarketPrice, useTransaction,
│   │                             # useWalletRecords, useVaultStats
│   ├── stores/appStore.ts        # Zustand state
│   └── utils/                    # constants (v7), formatting, records
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
| **Contract** | Aleo Testnet | `leo deploy --network testnet` → `dara_lend_v7.aleo` + `dara_lend_v7_vault.aleo` |

```bash
# Contract deployment (already done)
# Lending core:
# TX: at17alxm45te8xjcuc8n4h6zajjf8ke5s0sa6tvvp4umwrwlmje4q8sjrnesl
# Cost: 38.461253 credits

# Vault companion:
# TX: at16d0eejg60l3xatmxl6uyrvyajyuy3h6808d225dsac48chgf2yzsaxvdge
# Cost: 16.15 credits
```

---

## Wave 4 Changelog (v6 → v7)

### Smart Contract
- **Dual-program architecture**: `dara_lend_v7.aleo` (lending) + `dara_lend_v7_vault.aleo` (yield+privacy)
- Yield pool: `provide_usdcx_capital`, `provide_usad_capital`, `redeem_usdcx_capital`, `redeem_usad_capital`, `distribute_yield`
- Private transfers: `private_transfer_usdcx`, `private_transfer_usad` — ZK relay with nonce protection
- Vault admin: `initialize`, `emergency_pause_vault`, `resume_vault`
- New records: `PoolShare`, `PrivateTransferReceipt`
- New mappings: `supply_pool_total`, `supply_pool_shares`, `pool_yield_accumulated`, `transfer_count`, `total_volume`
- Multi-asset oracle: 6 token IDs (ALEO=0, USDCx=1, USAD=2, BTC=3, ETH=4, SOL=5)
- 21 + 10 = 31 total transitions across 2 deployed programs
- Total: 2,805,091 variables (1.98M + 822K)

### Frontend
- YieldVault.tsx: Deposit/redeem with private token record selection + PoolShare record listing
- PrivateTransfer.tsx: ZK-shielded transfer with token record selection
- Analytics.tsx: Extended with multi-asset prices, vault stats, bot status
- Dashboard.tsx: Quick actions for Yield Vault + Private Transfer
- Sidebar + TopBar: New routes `/app/yield`, `/app/transfer`, `/app/analytics`
- DocsContent: Dual-program architecture docs, 31 transitions, v7 TX IDs
- All v6 references eliminated — programs array includes both v7 + vault

### Backend (Sentinel)
- Config updated to `dara_lend_v7.aleo` + `dara_lend_v7_vault.aleo`
- Auto Oracle Pusher: Multi-asset price submission bot
- Liquidation Executor: Dual-program monitoring
- Analytics routes: `/analytics/vault`, `/analytics/multi-price`, `/analytics/overview`
- Stats API: Multi-collateral breakdown (ALEO/USDCx/USAD)
- Solvency API: Circuit breaker pause status

---

## License

MIT