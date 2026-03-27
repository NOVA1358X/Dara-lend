# DARA Lend — The Obsidian Ledger

<div align="center">

**The First Privacy-Preserving Multi-Collateral Lending Protocol on Aleo**

Supply ALEO, USDCx, or USAD as collateral — borrow against them — earn yield — transfer privately — keep every position encrypted inside zero-knowledge proofs. MEV bots can't target what they can't see.

[![Aleo Testnet](https://img.shields.io/badge/Aleo-Testnet-C9DDFF?style=flat-square)](https://testnet.explorer.provable.com/program/dara_lend_v7.aleo)
[![Leo](https://img.shields.io/badge/Leo-3.4.0-blue?style=flat-square)](https://leo-lang.org)
[![Programs](https://img.shields.io/badge/Programs-2_Deployed-D6C5A1?style=flat-square)](#smart-contracts)
[![Transitions](https://img.shields.io/badge/Transitions-31-C9DDFF?style=flat-square)](#smart-contracts)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](#license)

**Aleo Privacy Buildathon — Wave 4**

[Live App](https://dara-lend.vercel.app) · [API](https://dara-lend-api.onrender.com/api/health) · [Lending Contract](https://testnet.explorer.provable.com/program/dara_lend_v7.aleo) · [Vault Contract](https://testnet.explorer.provable.com/program/dara_lend_v7_vault.aleo) · [Docs](https://dara-lend.vercel.app/docs)

</div>

---

## The Problem

On transparent chains, lending protocols expose every user's **collateral**, **debt**, and **liquidation price** publicly. MEV bots extracted **$600M+** on Ethereum in 2023 by targeting visible liquidation thresholds. Every DeFi borrower is monitored, front-run, and sandwich-attacked. There is no financial privacy.

## The Solution

**DARA Lend** is a fully functional, privacy-first lending protocol built on Aleo's zero-knowledge architecture. Every position — collateral, debt, liquidation price, and borrower identity — is encrypted inside ZK proofs. The protocol remains publicly verifiable for solvency while keeping individual positions invisible.

Built from scratch across Wave 4 with **2 deployed programs, 31 transitions, 2.8M compiled variables**, a complete frontend app, backend sentinel, 5-source oracle, and a luxury "Obsidian Ledger" design system.

---

## Live Demo & Deployed Contracts

| Component | Link |
|-----------|------|
| **Frontend** | [dara-lend.vercel.app](https://dara-lend.vercel.app) |
| **Backend API** | [dara-lend-api.onrender.com](https://dara-lend-api.onrender.com/api/health) |
| **Lending Core** | [`dara_lend_v7.aleo`](https://testnet.explorer.provable.com/program/dara_lend_v7.aleo) — 21 transitions, 1,982,846 vars |
| **Vault Companion** | [`dara_lend_v7_vault.aleo`](https://testnet.explorer.provable.com/program/dara_lend_v7_vault.aleo) — 10 transitions, 822,245 vars |
| **Lending Deploy TX** | [`at17alxm45te8xjcuc8n4h6zajjf8ke5s0sa6tvvp4umwrwlmje4q8sjrnesl`](https://testnet.explorer.provable.com/transaction/at17alxm45te8xjcuc8n4h6zajjf8ke5s0sa6tvvp4umwrwlmje4q8sjrnesl) |
| **Vault Deploy TX** | [`at16d0eejg60l3xatmxl6uyrvyajyuy3h6808d225dsac48chgf2yzsaxvdge`](https://testnet.explorer.provable.com/transaction/at16d0eejg60l3xatmxl6uyrvyajyuy3h6808d225dsac48chgf2yzsaxvdge) |

---

## Key Features

### 🔒 Privacy-First Lending
Every collateral deposit, loan, and liquidation is encrypted as a private record (UTXO). No user addresses, amounts, or liquidation prices appear in any on-chain finalize. Health factors are computed client-side only.

### 🏦 Multi-Collateral Architecture
Supply **ALEO**, **USDCx**, or **USAD** as collateral. Borrow any of the three against any collateral type. Cross-pair support: stablecoin collateral → borrow ALEO, ALEO collateral → borrow stablecoins.

### 💰 Yield Vault
Deposit USDCx or USAD into the yield pool via private token records. Receive `PoolShare` records as proof. Admin distributes protocol fees as yield. Redeem shares for original deposit + accumulated yield.

### 🕵️ Private Transfers
ZK-shielded token relay that atomically breaks the on-chain link between sender and recipient. The vault contract deposits and re-mints tokens in a single transaction — truly private transfers with nonce replay protection.

### 📊 5-Source Oracle
CoinGecko, CryptoCompare, Coinbase, Binance.us, CoinMarketCap — median aggregated with outlier rejection (>2σ), 15% deviation cap, round replay protection. Admin updates price on-chain via `update_oracle_price`.

### 🛡️ Emergency Circuit Breaker
Admin can pause/resume both the lending protocol and vault independently via `emergency_pause()` / `resume_protocol()` / `emergency_pause_vault()` / `resume_vault()`.

### 📈 Interest Rate Model
On-chain configurable base rate + slope (BPS). Utilization-based supply/borrow APY computed and stored in mappings. Admin configures via `set_rate_params()`, triggers accrual via `accrue_interest()`.

### 🔐 MerkleProof Compliance
All stablecoin operations verified against a freeze-list via `merkle_tree.aleo`. Non-inclusion proofs ensure addresses aren't frozen before executing transfers.

### 🤖 Liquidation Sentinel
Automated monitoring service that scans positions across both programs. Circuit breaker aware. Executes liquidations when health factor drops below threshold. 5% liquidation bonus for liquidators.

### 🎨 Obsidian Ledger Design
Luxury dark UI with Gilda Display serif headlines, Inter body, Space Grotesk labels, JetBrains Mono for values. Glass-morphism panels, signature gradients (C9DDFF → D6C5A1), Framer Motion animations.

---

## How Privacy Works

| Data | Visibility | Mechanism |
|------|------------|-----------|
| Collateral amounts | **Encrypted** | `CollateralReceipt` private record |
| Debt positions | **Encrypted** | `DebtPosition` private record |
| Liquidation prices | **Encrypted** | Inside `DebtPosition` + `LiquidationAuth` |
| Health factors | **Client-only** | Computed in browser, never on-chain |
| Borrower identity | **Hashed** | BHP256 in `LiquidationAuth` — no raw address leak |
| Transfer recipients | **Hidden** | Private transfer relay breaks sender-recipient link |
| Yield deposits | **Encrypted** | `PoolShare` private record |
| Protocol TVL/Debt | **Public** | Aggregate mappings for verifiable solvency |

### Dual-Record Pattern
When a user borrows, two records are created simultaneously:
1. **`DebtPosition`** → owned by **borrower** (for repayment)
2. **`LiquidationAuth`** → owned by **orchestrator** (for liquidation)

The borrower's address is hashed (BHP256) inside `LiquidationAuth` — the protocol can enforce solvency without exposing who borrowed what.

---

## Smart Contracts

### Program 1: `dara_lend_v7.aleo` — Lending Core
**Leo 3.4.0** · **21 transitions** · **1,982,846 variables** · **1,497,807 constraints** · **812 statements**
**Deploy cost:** 38.461253 credits

| Category | Transitions | Count |
|----------|-------------|-------|
| **Admin** | `update_oracle_price`, `set_rate_params`, `emergency_pause`, `resume_protocol`, `accrue_interest` | 5 |
| **Supply** | `supply_collateral`, `supply_usdcx_collateral`, `supply_usad_collateral` | 3 |
| **Borrow** | `borrow`, `borrow_usad`, `borrow_credits` | 3 |
| **Repay** | `repay`, `repay_usad`, `repay_credits_usdcx`, `repay_credits_usad` | 4 |
| **Liquidate** | `liquidate`, `liquidate_usdcx`, `liquidate_usad` | 3 |
| **Withdraw** | `withdraw_collateral`, `withdraw_usdcx_collateral`, `withdraw_usad_collateral` | 3 |

### Program 2: `dara_lend_v7_vault.aleo` — Yield + Privacy
**Leo 3.4.0** · **10 transitions** · **822,245 variables**
**Deploy cost:** ~16.15 credits

| Category | Transitions | Count |
|----------|-------------|-------|
| **Admin** | `initialize`, `emergency_pause_vault`, `resume_vault` | 3 |
| **Yield** | `provide_usdcx_capital`, `provide_usad_capital`, `redeem_usdcx_capital`, `redeem_usad_capital`, `distribute_yield` | 5 |
| **Privacy** | `private_transfer_usdcx`, `private_transfer_usad` | 2 |

### Private Records (7 types)

| Record | Owner | Purpose |
|--------|-------|---------|
| `CollateralReceipt` | Depositor | Proves collateral deposit (token_type, amount, nonce) |
| `DebtPosition` | Borrower | Loan details (collateral_token, debt_token, amount, liquidation_price) |
| `LiquidationAuth` | Orchestrator | Authorizes liquidation (borrower_hash, not raw address) |
| `RepaymentReceipt` | Borrower | Proof of repayment (unlocks collateral withdrawal) |
| `LiquidationReceipt` | Liquidator | Proof of liquidation execution |
| `PoolShare` | Depositor | Yield pool share (token_type, share_amount) |
| `PrivateTransferReceipt` | Recipient | Proof of private transfer |

### External Programs
| Program | Purpose |
|---------|---------|
| `credits.aleo` | ALEO token operations |
| `test_usdcx_stablecoin.aleo` | USDCx transfers + MerkleProof compliance |
| `test_usad_stablecoin.aleo` | USAD transfers + MerkleProof compliance |
| `merkle_tree.aleo` | Freeze-list verification |

### Protocol Parameters

| Parameter | Value |
|-----------|-------|
| LTV Ratio | 70% (7,000 BPS) |
| Liquidation Threshold | 80% (8,000 BPS) |
| Min Collateral | 0.1 ALEO |
| Origination Fee | 0.5% |
| Liquidation Bonus | 5% |
| Vault Withdrawal Fee | 0.1% |
| Max Price Deviation | 15% per update |
| Precision | 6 decimals (1,000,000) |

---

## User Flow

### As a User
1. **Connect** Shield Wallet → Aleo Testnet
2. **Supply** — Deposit ALEO, USDCx, or USAD as collateral → receive encrypted `CollateralReceipt`
3. **Borrow** — Draw USDCx, USAD, or ALEO against collateral (up to 70% LTV) → receive `DebtPosition`
4. **Monitor** — Dashboard shows health factor, positions, oracle prices (all computed client-side)
5. **Repay** — Submit `DebtPosition` record → debt cleared → receive `RepaymentReceipt`
6. **Withdraw** — Submit `RepaymentReceipt` → collateral returned to wallet
7. **Yield** — Deposit stablecoins to vault → earn yield → redeem `PoolShare` for deposit + yield
8. **Transfer** — ZK-shielded private transfer → recipient receives tokens with no on-chain link to sender

### As Admin
1. **Update Oracle** — Fetch live price from 5 sources → push to `update_oracle_price`
2. **Set Rates** — Configure interest rate model via `set_rate_params(base_bps, slope_bps)`
3. **Accrue Interest** — Trigger on-chain interest accrual
4. **Distribute Yield** — Add protocol fees to yield pool via `distribute_yield`
5. **Circuit Breaker** — Pause/resume protocol and vault independently
6. **Fund Liquidity** — Transfer tokens to protocol address for borrower liquidity

---

## Verified Transactions (Testnet)

All features have been tested and verified on Aleo Testnet:

| Action | Status | TX ID |
|--------|--------|-------|
| Deploy Lending | ✅ ACCEPTED | `at17alxm45te8xjcuc8n4h6zajjf8ke5s0sa6tvvp4umwrwlmje4q8sjrnesl` |
| Deploy Vault | ✅ ACCEPTED | `at16d0eejg60l3xatmxl6uyrvyajyuy3h6808d225dsac48chgf2yzsaxvdge` |
| Supply USDCx | ✅ ACCEPTED | `at1u5vx34f6gnuwy7php826arfgdfs3lnj0guv6nmh8xn9pks2ugy8s7dy39m` |
| Borrow ALEO | ✅ ACCEPTED | `at1qd9l0advkvt83fdmnwxdcn4j3mjpxf6ep3a9zzwx0r4y7udgmcgsfghx5r` |
| Yield Deposit (USDCx seed) | ✅ ACCEPTED | `at1mgfymddpvl3zugr32j762ec4z4x0g3evddwvuhzp9rr2yukvgv9syj8f4x` |
| Yield Deposit (USAD seed) | ✅ ACCEPTED | `at15mpg9jcvvdp7rl3lg8yl32j2km4wf09apzlew8fzg0rhwlveu58qq9wfsf` |
| Private Transfer USDCx | ✅ ACCEPTED | Verified on-chain — truly private (no address link) |
| Yield Redeem | ✅ ACCEPTED | Verified — shares redeemed for deposit + accumulated yield |

---

## Oracle System

5-source price aggregation with on-chain oracle updates:

```
  CoinGecko · CryptoCompare · Coinbase · Binance.us · CoinMarketCap
                            ↓
                Median filter + outlier rejection (>2σ)
                            ↓
                15% deviation cap · round replay protection
                            ↓
                update_oracle_price → on-chain mapping
```

**Pipeline:** Fetch all 5 sources → reject outliers → compute median → admin pushes to contract → contract enforces 15% max deviation + round counter to prevent replay.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Frontend (React 18 + Vite + Tailwind + Framer Motion)   │
│  Shield Wallet ←→ Private record decrypt/display         │
│  13 pages: Dashboard, Supply, Borrow, Repay, Withdraw,   │
│  Positions, Liquidate, Yield, Transfer, Analytics,        │
│  History, Stats, Admin                                    │
├──────────────────────────────────────────────────────────┤
│  Backend Sentinel (Express + TypeScript)                  │
│  5-source oracle aggregator · liquidation monitor · API   │
│  Routes: health, oracle, price, solvency, stats,          │
│  analytics (TVL, vault, multi-price)                      │
├──────────────────────────────────────────────────────────┤
│  dara_lend_v7.aleo (Lending Core · 21 transitions)       │
│  3 collateral types · interest model · circuit breaker    │
│  7 private record types · dual-record borrow pattern      │
├──────────────────────────────────────────────────────────┤
│  dara_lend_v7_vault.aleo (Vault · 10 transitions)        │
│  Yield pool · private transfer relay · PoolShare records  │
├──────────────────────────────────────────────────────────┤
│  credits.aleo · test_usdcx_stablecoin.aleo               │
│  test_usad_stablecoin.aleo · merkle_tree.aleo             │
└──────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS 3, Framer Motion 11, Zustand 5, React Query 5 |
| **Backend** | Express 4, TypeScript, node-cron, @provablehq/sdk |
| **Contract** | Leo 3.4.0, Aleo Testnet |
| **Design** | Gilda Display (serif), Inter (body), Space Grotesk (labels), JetBrains Mono (code), Material Symbols |
| **Wallet** | Shield Wallet (Aleo Testnet) |
| **Deploy** | Vercel (frontend), Render (backend) |

---

## Project Structure

```
DARA-Lend/
├── contract/
│   └── dara_lend_v1/src/main.leo        # Lending core (21 transitions, 1.98M vars)
│
├── backend/src/
│   ├── index.ts                          # Sentinel entry point
│   ├── api/routes/                       # health, oracle, price, solvency, stats, analytics, transaction
│   ├── oracle/                           # 5-source aggregator, priceUpdater, validator
│   ├── liquidation/                      # monitor.ts + executor.ts (dual-program)
│   └── utils/                            # aleoClient, config, transactionBuilder
│
├── frontend/src/
│   ├── pages/                            # Landing, AppDashboard (13 routes), Docs
│   ├── components/
│   │   ├── app/                          # Dashboard, Supply, Borrow, Repay, Withdraw,
│   │   │                                 # Liquidate, Positions, YieldVault, PrivateTransfer,
│   │   │                                 # Analytics, ProtocolStats, AdminPanel, History
│   │   ├── landing/                      # Hero, ProblemSolution, HowItWorks, Privacy,
│   │   │                                 # TechnicalEdge, CrossChain, Security, CTA
│   │   ├── layout/                       # Sidebar (13 nav items), TopBar, AppLayout
│   │   ├── shared/                       # StatCard, WalletButton, GlowCard, PrivacyBadge
│   │   └── docs/                         # DocsContent, DocsSidebar, DocsLayout
│   ├── hooks/                            # useTransaction (27 functions), useWalletRecords,
│   │                                     # useVaultStats, useMarketPrice, useProtocolStats
│   ├── stores/appStore.ts                # Zustand state management
│   └── utils/                            # constants, formatting, records
│
├── render.yaml                           # Backend deployment
└── vercel.json                           # Frontend deployment
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
npm run dev             # Starts on :3001 with oracle cron
```

### Frontend
```bash
cd frontend
npm install
npm run dev             # Starts on :3000
```

### Connect & Use
1. Install Shield Wallet → switch to **Aleo Testnet**
2. Get testnet credits from [faucet.aleo.org](https://faucet.aleo.org)
3. Open the app → **Connect Wallet** → Supply → Borrow → Repay → Withdraw → Earn Yield → Transfer Privately

---

## Wave 4 Changelog

### Smart Contract Evolution (v5 → v6 → v7)
- **v5** (Wave 3): 6 transitions, 445 lines, single collateral (ALEO only)
- **v6** (Wave 4): 21 transitions, 812 statements, multi-collateral (ALEO/USDCx/USAD), interest rate model, circuit breaker, MerkleProof compliance
- **v7** (Wave 4): Dual-program architecture — split into lending core + vault companion due to Aleo's 2M variable limit. Added 10 vault transitions: yield pool, private transfers, vault admin. Total: **31 transitions, 2,805,091 variables across 2 programs**

### Frontend (Complete Redesign)
- **"Obsidian Ledger" design system** — luxury dark theme, glass-morphism, 4 typefaces, signature gradients
- **13 app pages**: Dashboard, Supply, Borrow, Repay, Withdraw, Positions, Liquidate, Yield Vault, Private Transfer, Analytics, History, Stats, Admin
- **Landing page**: 9 sections — Hero with video background, Architecture, How It Works, Privacy Pipeline, Technical Edge, Protocol Numbers, Testimonials, CTA
- **Docs page**: Full protocol documentation with transitions, records, privacy model, FAQ
- **Private record UI**: Token record selectors for all operations, PoolShare listing, wallet syncing indicators

### Backend
- 5-source oracle aggregator with median + outlier rejection
- Liquidation monitoring sentinel for both programs
- Analytics API: TVL, vault stats, multi-asset prices, interest rates

---

## License

MIT