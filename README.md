# DARA  The Obsidian Ledger

<div align="center">

**The Privacy-First DeFi Suite on Aleo**

DeFi Without Being Watched. Fourteen smart contracts, 131 transitions, and ~10 million compiled variables deliver private lending, multi-asset dark-pool trading across 4 markets (ALEO, BTC, ETH, SOL), sealed-bid auctions, flash loans, yield vaults, and ZK governance  all shielded by zero-knowledge proofs.

[![Aleo Testnet](https://img.shields.io/badge/Aleo-Testnet-C9DDFF?style=flat-square)](https://testnet.aleo.info/program/dara_lend_v8.aleo)
[![Leo](https://img.shields.io/badge/Leo-4.0.0-blue?style=flat-square)](https://leo-lang.org)
[![Programs](https://img.shields.io/badge/Programs-14_Deployed-D6C5A1?style=flat-square)](#smart-contracts)
[![Transitions](https://img.shields.io/badge/Transitions-131-C9DDFF?style=flat-square)](#smart-contracts)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](#license)

[Live App](https://dara-lend.vercel.app)  [API](https://dara-lend-api.onrender.com/api/health)  [Docs](https://dara-lend.vercel.app/docs)  [Main](https://testnet.aleo.info/program/dara_lend_v8.aleo)  [Credits](https://testnet.aleo.info/program/dara_lend_v8_credits.aleo)  [Vault](https://testnet.aleo.info/program/dara_lend_v8_vault.aleo)  [Gov](https://testnet.aleo.info/program/dara_lend_v8_gov_v3.aleo)  [Dark Pool v3](https://testnet.aleo.info/program/dara_dark_pool_v3.aleo)  [DP-BTC](https://testnet.aleo.info/program/dara_dp_btc_v2.aleo)  [DP-ETH](https://testnet.aleo.info/program/dara_dp_eth_v2.aleo)  [DP-SOL](https://testnet.aleo.info/program/dara_dp_sol_v2.aleo)  [Auctions](https://testnet.aleo.info/program/dara_auction_v1.aleo)  [Flash](https://testnet.aleo.info/program/dara_flash_v1.aleo)

</div>

---

## The Problem

On transparent chains, every DeFi position is public  collateral, debt, liquidation thresholds, trade intents. MEV bots extracted **$600M+** on Ethereum in 2023 by front-running liquidations and sandwich-attacking trades. There is no financial privacy.

## The Solution

**DARA** is a complete DeFi suite where every position, trade, bid, flash loan, and vote is encrypted inside zero-knowledge proofs. The protocol remains publicly verifiable for solvency while keeping individual activity invisible.

---

## Architecture

```
+-------------------------------------------------------------+
|                    Frontend (React/Vite)                      |
|  18 Pages - Shield Wallet - Obsidian Ledger Dark Theme       |
+-------------------------------------------------------------+
|                   Backend (Express.js)                        |
|  7 Bots - 7-Source Oracle - Provable DPS Automation          |
+-------------------------------------------------------------+
|                  Aleo Blockchain (Testnet)                    |
|  14 Programs - 131 Transitions - ~10M Compiled Variables     |
|                                                              |
|  +---------------+ +---------------+ +---------------+       |
|  | dara_lend_v8  | |   _credits    | |    _vault     |       |
|  |  12 trans.    | |  12 trans.    | |  10 trans.    |       |
|  +---------------+ +---------------+ +---------------+       |
|  +---------------+ +---------------+                         |
|  |   _gov_v3     | |_dark_pool_v3 |                         |
|  |  12 trans.    | |  16 trans.   |                         |
|  +---------------+ +---------------+                         |
|  +---------------+ +---------------+ +---------------+       |
|  | _dp_btc_v2   | |  _dp_eth_v2  | |  _dp_sol_v2  |       |
|  |  16 trans.    | |  16 trans.   | |  16 trans.   |       |
|  +---------------+ +---------------+ +---------------+       |
|  +---------------+ +---------------+ +---------------+       |
|  | test_btc_v1  | | test_eth_v1  | | test_sol_v1  |       |
|  |   6 trans.    | |   6 trans.   | |   6 trans.   |       |
|  +---------------+ +---------------+ +---------------+       |
|  +---------------+ +---------------+                         |
|  |  _auction     | |   _flash     |                         |
|  |  10 trans.    | |  11 trans.   |                         |
|  +---------------+ +---------------+                         |
+-------------------------------------------------------------+
```

---

## Smart Contracts

| Program | Transitions | Variables | Purpose |
|---------|:-----------:|:---------:|---------|
| `dara_lend_v8.aleo` | 12 | ~920K | Core lending  supply, borrow, repay, withdraw, liquidate |
| `dara_lend_v8_credits.aleo` | 12 | ~920K | Reverse lending  stablecoin collateral -> borrow ALEO |
| `dara_lend_v8_vault.aleo` | 10 | ~575K | Yield vault, private transfers, PoolShare management |
| `dara_lend_v8_gov_v3.aleo` | 12 | ~860K | Governance proposals, delegation, ZK voting |
| `dara_dark_pool_v3.aleo` | 16 | ~1.4M | ALEO/USDCx dark pool  batch TWAP settlement, threshold operators |
| `dara_dp_btc_v2.aleo` | 16 | ~1.4M | BTC/USDCx dark pool  7-source BTC oracle, same architecture |
| `dara_dp_eth_v2.aleo` | 16 | ~1.4M | ETH/USDCx dark pool  7-source ETH oracle, same architecture |
| `dara_dp_sol_v2.aleo` | 16 | ~1.4M | SOL/USDCx dark pool  7-source SOL oracle, same architecture |
| `test_btc_v1.aleo` | 6 | ~277K | Test BTC token for BTC/USDCx market |
| `test_eth_v1.aleo` | 6 | ~277K | Test ETH token for ETH/USDCx market |
| `test_sol_v1.aleo` | 6 | ~277K | Test SOL token for SOL/USDCx market |
| `dara_auction_v1.aleo` | 10 | ~679K | Sealed-bid liquidation auctions |
| `dara_flash_v1.aleo` | 11 | ~943K | Collateral-backed flash loans |
| ~~`dara_dark_pool_v1.aleo`~~ | ~~9~~ | ~~653K~~ | ~~Superseded by v2~~ |
| **Total** | **131** | **~10M** | |

---

## Core Lending

DARA's lending core supports three collateral types (ALEO, USDCx, USAD) with cross-pair borrowing.

**Flow:**
1. **Supply**  Deposit ALEO, USDCx, or USAD as collateral -> receive `DebtPosition` record
2. **Borrow**  Draw stablecoins against collateral at 50% LTV -> updated `DebtPosition` + `LiquidationAuth`
3. **Repay**  Return borrowed tokens + interest -> cleared debt
4. **Withdraw**  Reclaim collateral after debt is zero

**Parameters:**
| Parameter | Value |
|-----------|-------|
| LTV Ratio | 50% |
| Liquidation Incentive | 5% bonus to liquidators |
| Origination Fee | 0.5% |
| Interest Model | On-chain configurable base rate + utilization slope (BPS) |
| Precision | 6 decimals (1,000,000) |

**Privacy:** All positions are encrypted in Aleo records. Only aggregate pool totals are public (for solvency verification). Individual collateral amounts, debt, and liquidation prices are invisible.

---

## Dark Pool — 4 Markets

Multi-asset private OTC trading with batch-based TWAP pricing, 2-of-3 threshold operator approval, limit orders, and partial fills across **4 markets**. Completely eliminates MEV.

**Markets:**
| Market | Program | Oracle | Base Token |
|--------|---------|--------|------------|
| ALEO/USDCx | `dara_dark_pool_v3.aleo` | 7-source ALEO | `credits.aleo` |
| BTC/USDCx | `dara_dp_btc_v2.aleo` | 7-source BTC | `test_btc_v1.aleo` |
| ETH/USDCx | `dara_dp_eth_v2.aleo` | 7-source ETH | `test_eth_v1.aleo` |
| SOL/USDCx | `dara_dp_sol_v2.aleo` | 7-source SOL | `test_sol_v1.aleo` |

Each market has independent batch management, oracle pricing, and operator consensus — all running in parallel with per-market 7-source price aggregation from Coinbase, Gate.io, MEXC, XT.com, CoinGecko, CryptoCompare, and CoinMarketCap.

**Flow:**
1. **Submit Order**  Trader creates encrypted `OrderCommitment` (buy or sell ALEO/USDCx) with optional limit price
2. **Batch Collection**  Orders accumulate in the current batch window
3. **Oracle Update**  Operator updates TWAP oracle price for the batch
4. **Propose Settlement**  First operator proposes batch settlement parameters
5. **Approve Settlement**  Second operator approves (2-of-3 threshold) -> auto-matching executes
6. **Advance Batch**  Third operator advances to next batch, generating `FillReceipt` for matched orders and `ResidualOrder` for partial fills
7. **Cancel**  Traders can cancel unfilled orders at any time

**Key Features:**
- **TWAP Oracle**: Time-weighted average price accumulator prevents single-point manipulation
- **2-of-3 Threshold Operators**: No single operator can settle a batch alone — requires multi-party approval
- **Limit Orders**: Optional price limits — orders only fill at or better than the specified price
- **Partial Fills**: Large orders partially match against available liquidity, with residuals carried forward
- **Residual Carry-Forward**: Unfilled portions automatically re-enter the next batch via `resubmit_residual`
- **Configurable BPS Fees**: Admin-adjustable fee rates in basis points
- **Price Scaling**: Each market has a `priceScale` divisor to fit real-world prices into the contract's `MAX_PRICE` (100,000,000 = $100 at 6 decimals). BTC÷1000, ETH÷100, SOL÷10, ALEO÷1. Frontend automatically converts back for display.

**Anti-MEV guarantees:**
- Order commitments are encrypted records — invisible to block producers
- TWAP-based batch settlement — no slippage, no front-running
- Threshold operator approval prevents single-party manipulation
- Batch-based matching prevents temporal ordering attacks

**Transitions (16):** `initialize`, `set_operators`, `submit_buy_order`, `submit_sell_order`, `update_oracle_twap`, `propose_settlement`, `approve_settlement`, `advance_batch`, `execute_fill_buy`, `execute_fill_sell`, `cancel_buy_order`, `cancel_sell_order`, `resubmit_residual`, `set_fee_bps`, `pause_darkpool`, `resume_darkpool`

---

## Sealed-Bid Auctions

The first sealed-bid auction system on Aleo. Used for liquidated collateral sales with zero information leakage.

**Flow:**
1. **Start Auction**  Admin creates auction for liquidated collateral
2. **Submit Sealed Bid**  Bidders commit `BHP256(BHP256(actual_bid) + secret)` -> `SealedBid` record
3. **Reveal Bid**  After bidding ends, bidders reveal amount + secret -> `RevealedBid` record
4. **Settle**  Contract verifies hashes, highest bid wins -> `AuctionWin` for winner, `AuctionRefund` for losers

**Commitment scheme (Leo):**
```leo
let inner: field = BHP256::hash_to_field(actual_bid);
let commitment: field = BHP256::hash_to_field(inner + secret);
```

**Parameters:**
- Bid window: 15 minutes to 7 days (configurable per auction)
- Reveal window: follows bid window
- Automatic refunds for losing bidders

**Transitions (10):** `start_auction`, `submit_sealed_bid`, `reveal_bid`, `settle_auction`, `claim_collateral`, `redeem_collateral`, `refund_bid`, `cancel_auction`, `pause_auctions`, `resume_auctions`

---

## Flash Loans

Instant collateral-backed lending with a 4-step atomic flow.

**Flow:**
1. **Borrow**  Lock 102% collateral -> receive `FlashLoanReceipt`
2. **Claim**  Present receipt -> receive borrowed ALEO or USDCx
3. **Repay**  Return principal + 0.09% fee -> receive `FlashRepayReceipt`
4. **Withdraw**  Present repay receipt -> reclaim collateral

**Parameters:**
| Parameter | Value |
|-----------|-------|
| Fee | 0.09% (9 BPS) |
| Collateral Ratio | 102% |
| Directions | ALEO -> USDCx, USDCx -> ALEO |
| Lifecycle | Fully atomic, private, on-chain |

**Transitions (11):** `flash_borrow_aleo`, `flash_borrow_usdcx`, `flash_claim_aleo`, `flash_claim_usdcx`, `flash_repay_aleo`, `flash_repay_usdcx`, `flash_withdraw_aleo`, `flash_withdraw_usdcx`, `set_flash_params`, `pause_flash`, `resume_flash`

---

## Yield Vault

Depositors supply USDCx or USAD stablecoins and earn protocol fees as yield.

**Flow:**
1. **Deposit**  Supply stablecoins -> receive `PoolShare` record
2. **Admin distributes yield**  Protocol fees directed to vault
3. **Redeem**  Burn PoolShare -> receive original deposit + yield (minus 0.1% fee)

All deposits use private token records. The vault also powers private transfers.

---

## Governance

On-chain governance with full voter privacy through ZK proofs. The governance system was iterated through three versions to achieve production-grade privacy:

- **v1**: Leaked voter identity through finalize — voter address visible on-chain
- **v2**: Fixed privacy but hardcoded 200-block voting window — inflexible
- **v3 (production)**: `vote()` has NO finalize — zero on-chain trace. Configurable 1–30 day voting, delegation, timelock

**Flow:**
1. **Claim GOV Tokens** — Any user claims 1,000 tokens via the faucet
2. **Create Proposal** — Token holder (min 100 power) submits proposal with voting period (1–30 days)
3. **Vote Privately** — Cast ZK-encrypted vote (For/Against) — `vote()` has NO finalize, shows as PRIVATE in Shield Wallet
4. **Tally & Execute** — After voting ends + timelock, admin tallies. If quorum (20%) met + majority for → proposal executes

**Features:**
- Delegation: transfer voting power to another address
- Configurable voting periods: 1 to 30 days (8,640 to 259,200 blocks)
- Timelock: max(voting_blocks/4, 8,640 blocks) — minimum 1 day
- 100% private voting — only aggregate tallies visible
- 5 proposal types: Rate, LTV, Liquidation threshold, Pause, Admin
- The first truly private DAO on Aleo

**Transitions (12):** `mint_gov_token`, `delegate`, `undelegate`, `create_proposal`, `vote`, `execute_proposal`, `cancel_proposal`, `burn_gov_token`, `set_voting_params`, `transfer_gov_token`, `pause_governance`, `resume_governance`

---

## Private Transfers

The vault contract provides a ZK-shielded relay that atomically deposits tokens and re-mints them to the recipient in a single transaction. This completely breaks the on-chain link between sender and recipient. Nonce replay protection prevents double-spending.

---

## How Privacy Works

| Data | Visibility | Mechanism |
|------|------------|-----------|
| Collateral amounts | **Encrypted** | `DebtPosition` private record |
| Debt positions | **Encrypted** | Inside `DebtPosition` record |
| Liquidation prices | **Encrypted** | Inside `DebtPosition` + `LiquidationAuth` |
| Order commitments | **Encrypted** | `OrderCommitment` private record |
| Auction bids | **Encrypted** | `SealedBid` with BHP256 commitment |
| Flash loan amounts | **Encrypted** | `FlashLoanReceipt` private record |
| Governance votes | **Encrypted** | ZK-verified, only aggregate tallies visible |
| Health factors | **Client-only** | Computed in browser, never on-chain |
| Borrower identity | **Hashed** | BHP256 in `LiquidationAuth` |
| Transfer recipients | **Hidden** | Private transfer relay breaks sender-recipient link |
| Protocol TVL/Debt | **Public** | Aggregate mappings for verifiable solvency |

---

## Oracle System

7-source price aggregation with on-chain manipulation resistance.

**Sources:** Coinbase, Gate.io, MEXC, XT.com, CoinGecko, CryptoCompare, CoinMarketCap

```
CoinGecko - CryptoCompare - Coinbase - Gate.io - CoinMarketCap
                          |
              Median filter + outlier rejection (>2 sigma)
                          |
              15% deviation cap - round replay protection
                          |
              update_oracle_price -> on-chain mapping
```

**On-chain safeguards:**
- 15% maximum deviation per update
- Minimum 5-block interval between updates
- Monotonic round counter prevents replay attacks
- Median filtering with outlier rejection

---

## Backend Automation

Seven bots managed by a unified orchestrator, all deployed on **Provable DPS** (Decentralized Private Sequencer).

| Bot | Interval | Action | Program |
|-----|:--------:|--------|--------|
| Oracle Bot | 30 min | `update_oracle_price` | `dara_lend_v8.aleo` |
| Interest Bot | 1 hr | `accrue_interest` | `dara_lend_v8.aleo` |
| Yield Bot | 6 hr | `distribute_yield` | `dara_lend_v8_vault.aleo` |
| Liquidation Bot | 1 min | `liquidate_*` | `dara_lend_v8.aleo` |
| Dark Pool Bot | 5 min / 15s catch-up | Oracle updates across 4 markets with ±14.5% convergence clamping. 7-source median price per asset (Coinbase, Gate.io, MEXC, XT.com, CoinGecko, CryptoCompare, CMC). Catch-up mode when deviation > 20% | All 4 dark pool programs |
| Auction Bot | 5 min | `settle_auction` | `dara_auction_v1.aleo` |
| Flash Oracle Bot | 30 min | `update_oracle_price` | `dara_flash_v1.aleo` |

**Provable DPS Integration:**
- JWT authentication via `POST /jwts/:consumerId` with `X-Provable-API-Key` header
- JWT returned in `authorization` response header — auto-refreshed before expiry
- Proving via `POST /prove/testnet/prove` with `useFeeMaster: true` (zero gas cost)
- Sequential nonce queue prevents transaction conflicts across all 7 bots
- WASM SDK warmed at startup for instant first-transaction readiness

### Dark Pool Bot — Detailed Oracle Flow

The dark pool bot manages real-time oracle price feeds across 4 independent markets:

1. **Fetch real prices** from 7 sources (Coinbase, Gate.io, MEXC, XT.com, CoinGecko, CryptoCompare, CoinMarketCap) per asset
2. **Median filter** with outlier rejection (>2 sigma) to resist manipulation
3. **Scale price** by market's `priceScale` divisor (BTC÷1000, ETH÷100, SOL÷10, ALEO÷1) to fit contract's `MAX_PRICE` (100,000,000u64 = $100 at 6 decimals)
4. **Clamp to ±14.5%** of current on-chain price (contract enforces `MAX_DEVIATION_BPS = 1500` = 15% anti-manipulation cap)
5. **Push `update_oracle_price`** via Provable DPS to the correct market program with incremented round counter
6. **Catch-up mode**: When price deviation > 20%, interval drops from 5 min → 15s for rapid convergence to real market price
7. **Turbo convergence**: `backend/src/turboConverge.ts` utility pushes consecutive 14.5% changes with 3s delay for emergency convergence (e.g., BTC $100 → $73,512 in 29 rounds)

### Test Token Faucet

Users can claim free test tokens (BTC, ETH, SOL) to trade on the dark pool:

- **Endpoint**: `POST /api/faucet/claim` with `{ address, token }`
- **Amount**: 10 tokens per claim (10,000,000u64 at 6 decimals)
- **Daily limit**: 5 claims per token per address per day
- **Mechanism**: Admin wallet calls `transfer_public` on the test token program via Provable DPS
- **Frontend**: "Test Token Faucet" card on Dark Pool page with one-click claim buttons
- **Status check**: `GET /api/faucet/status/:address` returns remaining claims per token

---

## Frontend

**18 App Pages:**

| Group | Pages |
|-------|-------|
| Overview | Dashboard |
| Core Lending | Supply, Borrow, Repay, Withdraw, Positions |
| DeFi Modules | Yield Vault, Transfer, Dark Pool, Auctions, Flash Loans |
| Governance | Governance |
| Analytics | Analytics, Rate Curve, History, Stats |
| Admin | Liquidate, Admin |

**Additional pages:** Landing, Docs

**Design:** Obsidian Ledger luxury dark theme  Gilda Display headings, Inter body, Space Grotesk monospace. Gold (#D4AF37) accents on deep black (#0A0A0A). Glass-morphism panels, Framer Motion animations.

**Wallet:** Shield Wallet browser extension with 8-program authorization on connect.

---

## Record Types

All positions and receipts are encrypted Aleo records  only the owner can decrypt them.

| Record | Program | Purpose |
|--------|---------|---------|
| `DebtPosition` | dara_lend_v8 | Collateral + debt state |
| `LiquidationAuth` | dara_lend_v8 | Authorizes third-party liquidation |
| `PoolShare` | dara_lend_v8_vault | Yield vault deposit receipt |
| `GovernanceToken` | dara_lend_v8_gov_v3 | Voting power |
| `OrderCommitment` | dara_dark_pool_v3 | Private buy/sell order with optional limit price |
| `OrderAuth` | dara_dark_pool_v3 | Authorization token for order management |
| `FillReceipt` | dara_dark_pool_v3 | Matched trade settlement receipt |
| `ResidualOrder` | dara_dark_pool_v3 | Unfilled portion of partially matched order |
| `ResidualAuth` | dara_dark_pool_v3 | Authorization for residual re-submission |
| `SealedBid` | dara_auction_v1 | Committed bid hash |
| `RevealedBid` | dara_auction_v1 | Revealed bid amount |
| `AuctionWin` | dara_auction_v1 | Winner receipt |
| `AuctionRefund` | dara_auction_v1 | Loser refund receipt |
| `FlashLoanReceipt` | dara_flash_v1 | Flash borrow receipt |
| `FlashRepayReceipt` | dara_flash_v1 | Flash repay receipt |

---

## Deployment

All 14 programs are deployed on **Aleo Testnet**.

| Program | Deploy TX |
|---------|-----------|
| `dara_lend_v8.aleo` | `at1tn7vutm8dw3c9aknr66wxs8gz39r0lv2argnqkmclnxgauv4mc8sty74xg` |
| `dara_lend_v8_credits.aleo` | `at1h7q8lz544wsakfw3u3gtyqt7u0ynkhmkvvu9ay9hvl9dank5g5rsuq3cwp` |
| `dara_lend_v8_vault.aleo` | `at1y0ghwhs6hdm5vr92pp3lcj442hvpgrytn87cpmp3nlyulaykg5pqurm94t` |
| `dara_lend_v8_gov_v3.aleo` | `at13czejw57h7930qxhl28dpc57r49qqjjq7vt5muf73xjg40ed7vzqz2296d` |
| `dara_dark_pool_v2.aleo` | `at1emu8kcs4q8yj6jx9med4v2hamzajsw6dsc0nwcaa5dzyhfpzqvpsm39w68` |
| `dara_dark_pool_v3.aleo` | `at17wenhr6jgjydaussmkmt467hedkw0awugsyqp9sl6tx3dmgs9yxs7jeywg` |
| `dara_dp_btc_v2.aleo` | `at1zms0sahft6su2xvtdem8djq5uza97gv9zc2cuq8rfe828aca3qrqv9cqkj` |
| `dara_dp_eth_v2.aleo` | `at1l2aewv0je0fpp26h5pj8zg9ykkwuw0z9guffnzhntzg3hdnlqvxs2y0ysg` |
| `dara_dp_sol_v2.aleo` | `at1qmuqlsvm2kwqghgda24amc2jry0w3vsehevzje60c97yc3sktqqqe4ynzt` |
| `dara_dp_btc_v1.aleo` | `at1h75lfvpc2avxha2dg5l589j7z42w9f56nfm4n4560h5fwqvasvzqdmxkpf` |
| `dara_dp_eth_v1.aleo` | `at10jcztp884yg6ua6kz39u2akl04t6r2kkmwns5kgzrmxpnsr2msrqs2w4g4` |
| `dara_dp_sol_v1.aleo` | `at123gqgtm2p2qm3ajuupneff00qhh3cylssdtjs5q333zfqp2flyrspg0ff2` |
| `test_btc_v1.aleo` | `at19a4ylpeyjykqf84z586r869wvy6hmxlnpnyw8kvr6um8huu3u5gsxpfuzg` |
| `test_eth_v1.aleo` | `at1uvwm5p53r445vc9xzjgynee6msdxu7zaframt96tf5rvl40e8q8q26ucxr` |
| `test_sol_v1.aleo` | `at1azee54349kq0ccgdkxtxrrd0nzpynnz82gwe9qpvudmeae0xhuzq2zcl4q` |
| ~~`dara_dark_pool_v1.aleo`~~ | ~~`at1xr06dkaermzl6hfm5syqzkrtw950hhe0rsttl06qp9gksuey2vxqh0ww4l`~~ (superseded by v2) |
| ~~`dara_dark_pool_v2.aleo`~~ | ~~superseded by v3 (oracle fix)~~ |
| ~~`dara_dp_btc_v1.aleo`~~ | ~~superseded by v2 (oracle fix)~~ |
| ~~`dara_dp_eth_v1.aleo`~~ | ~~superseded by v2 (oracle fix)~~ |
| ~~`dara_dp_sol_v1.aleo`~~ | ~~superseded by v2 (oracle fix)~~ |
| `dara_auction_v1.aleo` | `at1xjkazhxpy76m97lvkj3ex0l3lvn32vzwfv9vt09j6zvey9dlxqyqpkvxp6` |
| `dara_flash_v1.aleo` | `at128zjzny542ty3z2kf74u2vne22gahemp2eadtjkurjf4dguxwgyquvuv7m` |

**Explorer:** All programs verifiable at `https://testnet.aleo.info/program/<program_id>`

| Component | Link |
|-----------|------|
| **Frontend** | [dara-lend.vercel.app](https://dara-lend.vercel.app) |
| **Backend API** | [dara-lend-api.onrender.com](https://dara-lend-api.onrender.com/api/health) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Aleo Testnet (Leo v4.0, snarkVM) |
| Smart Contracts | Leo language (14 programs, 131 transitions) |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express.js, TypeScript |
| Automation | Provable DPS (Decentralized Private Sequencer) |
| Wallet | Shield Wallet (Aleo browser extension) |
| Oracle Sources | CoinGecko, CryptoCompare, Coinbase, Gate.io, CoinMarketCap |
| Hosting | Vercel (frontend), Render (backend) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Shield Wallet browser extension
- Aleo Testnet credits (for on-chain transactions)

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm run dev
```

### Smart Contracts
Each contract lives in `contract/<program_name>/src/main.leo`. Build with Leo CLI:
```bash
cd contract/dara_lend_v8
leo build
```

---

## Repository Structure

```
DARA-Lend/
|-- frontend/               # React/Vite/TypeScript frontend
|   +-- src/
|       |-- components/
|       |   |-- app/        # 18 app page components
|       |   |-- landing/    # Landing page sections
|       |   |-- docs/       # Documentation page
|       |   |-- layout/     # Sidebar, header
|       |   +-- shared/     # Reusable UI components
|       |-- hooks/          # Custom React hooks (wallet, records)
|       |-- stores/         # Zustand state management
|       |-- utils/          # Constants, helpers, formatters
|       +-- styles/         # Global CSS, Tailwind config
|-- backend/                # Express.js automation backend
|   +-- src/
|       |-- automation/     # 7 bot implementations + orchestrator
|       |-- oracle/         # 7-source price aggregation
|       |-- liquidation/    # Position scanning + execution
|       |-- api/            # REST endpoints (stats, oracle, darkpool, faucet, auction, flash)
|       +-- utils/          # Aleo client, config, TX builder
|-- contract/               # 14 Leo smart contracts
|   |-- dara_lend_v8/       # Core lending (12 transitions)
|   |-- dara_lend_v8_credits/ # Reverse lending (12 transitions)
|   |-- dara_lend_v8_vault/ # Yield vault + transfers (10 transitions)
|   |-- dara_lend_v8_gov_v3/ # Governance (12 transitions)
|   |-- dara_dark_pool_v3/  # Dark pool v3 — ALEO/USDCx (16 transitions)
|   |-- dara_dp_btc_v2/     # Dark pool — BTC/USDCx (16 transitions)
|   |-- dara_dp_eth_v2/     # Dark pool — ETH/USDCx (16 transitions)
|   |-- dara_dp_sol_v2/     # Dark pool — SOL/USDCx (16 transitions)
|   |-- test_btc_v1/        # Test BTC token (6 transitions)
|   |-- test_eth_v1/        # Test ETH token (6 transitions)
|   |-- test_sol_v1/        # Test SOL token (6 transitions)
|   |-- dara_auction_v1/    # Auctions (10 transitions)
|   +-- dara_flash_v1/      # Flash loans (11 transitions)
+-- README.md
```

---

## License

MIT

---

**Built with zero-knowledge proofs on Aleo.**
