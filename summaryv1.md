# DARA Lend — Project Summary v1

## Overview

**DARA Lend** is a privacy-preserving decentralized lending protocol on Aleo. Users supply ALEO credits as collateral and borrow USDCx stablecoin — all positions are encrypted as private records on-chain. Public mappings track only aggregate totals (TVL, total borrowed, loan count) so anyone can verify protocol solvency without seeing individual positions.

- **Contract**: `dara_lend_v5.aleo` — deployed on Aleo Testnet (v5: open oracle — no staleness window)
- **TX ID**: `at1vj2av6kdkjf6fsty3tjdw877xjquk4trw69nfzy3jv9u3gr27cpq8ww839`
- **Explorer**: https://testnet.explorer.provable.com/program/dara_lend_v5.aleo
- **GitHub**: https://github.com/NOVA1358X/Dara-lend
- **Total Files**: 103 source files (contract + frontend + backend) — 8 new files added in Phases 4+6+7+8
- **Total Lines Changed**: ~3,200 insertions, ~600 deletions across ~50 files (post-initial commit)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DARA Lend Protocol                    │
├───────────────┬──────────────────┬───────────────────────┤
│   Frontend    │    Contract      │      Backend          │
│  React + TS   │  Leo (Aleo VM)   │   Express + TS        │
│  Vite + TW    │                  │   Oracle + Monitor    │
├───────────────┼──────────────────┼───────────────────────┤
│ Shield Wallet │  credits.aleo    │  CoinGecko API        │
│ Leo Wallet    │  usdcx stablecoin│  Aleo Testnet API     │
└───────────────┴──────────────────┴───────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Leo 3.4.0 / Aleo VM |
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS 3, Framer Motion 11 |
| Wallet | @provablehq/aleo-wallet-adaptor-react + react-ui (Shield + Leo) |
| Backend | Express, tsx (TypeScript ESM), node-cron |
| API | Aleo Testnet REST API (api.explorer.provable.com) |

---

## Smart Contract — `dara_lend_v5.aleo`

### External Dependencies
- `credits.aleo` — native ALEO credits (collateral)
- `test_usdcx_stablecoin.aleo` — USDCx stablecoin (borrow/debt token)

### Records (ALL Private)

| Record | Owner | Key Fields |
|--------|-------|-----------|
| `CollateralReceipt` | depositor | collateral_amount (u64), deposit_block (u32), nonce_hash (field) |
| `DebtPosition` | borrower | collateral_amount (u64), debt_amount (u128), liquidation_price (u64), loan_id (field) |
| `LiquidationAuth` | orchestrator | loan_id (field), collateral_amount (u64), debt_amount (u128), liquidation_price (u64), borrower_hash (field) |
| `RepaymentReceipt` | repayer | amount_repaid (u128), collateral_returned (u64), loan_id (field) |
| `LiquidationReceipt` | liquidator | loan_id (field), collateral_seized (u64), debt_covered (u128) |

### Mappings (ALL Public — aggregate only)

| Mapping | Key | Value | Purpose |
|---------|-----|-------|---------|
| `vault_total_collateral` | u8 (0u8) | u64 | Total ALEO locked |
| `total_borrowed` | u8 (0u8) | u128 | Total USDCx minted |
| `loan_count` | u8 (0u8) | u64 | Active loan counter |
| `oracle_price` | u8 (0u8) | u64 | ALEO/USD price × 1,000,000 |
| `used_nonces` | field | bool | Replay protection |
| `protocol_admin` | u8 (0u8) | address | Admin address |
| `active_loans` | field | bool | Loan active status |
| `price_update_block` | u8 (0u8) | u32 | Block height of last oracle update |
| `total_fees_collected` | u8 (0u8) | u128 | Total origination fees collected |

### Transitions

| Transition | Inputs | Outputs | What it does |
|-----------|--------|---------|-------------|
| `update_oracle_price` | new_price: u64 | Future | Admin updates ALEO/USD price, records block.height for freshness |
| `supply_collateral` | input_credits: credits.aleo/credits, amount: u64, nonce: field | CollateralReceipt + credits (change) + Future | **Private**: Accepts private credits record, deposits via `credits.aleo/transfer_private_to_public` — supplier identity hidden. Nonce bound to caller |
| `borrow` | receipt: CollateralReceipt, borrow_amount: u128, current_price: u64, orchestrator: address | DebtPosition + LiquidationAuth + ComplianceRecord + Token + Future | **Private**: Disburses USDCx via `transfer_public_to_private` — borrower receives private Token record. Enforces 70% LTV, 0.5% fee, oracle freshness, circuit breaker |
| `repay` | debt: DebtPosition | RepaymentReceipt + credits (returned) + Future | USDCx via `transfer_from_public` (approval pattern). **Private**: Collateral returned via `credits.aleo/transfer_public_to_private` |
| `liquidate` | auth: LiquidationAuth, current_price: u64 | LiquidationReceipt + credits (seized) + Future | **Private**: Seized collateral sent via `credits.aleo/transfer_public_to_private` — liquidator identity hidden. 5% bonus |
| `withdraw_collateral` | receipt: CollateralReceipt | credits (returned) + Future | **Private**: Returns ALEO via `credits.aleo/transfer_public_to_private` — withdrawer identity hidden |

### Protocol Parameters (hardcoded in contract)
- **LTV Ratio**: 70% (LTV_BPS = 7,000 / BPS = 10,000)
- **Liquidation Threshold**: 80% (LIQ_BPS = 8,000 / BPS = 10,000)
- **Precision**: 1,000,000 (SCALE, for price/ratio math)
- **Origination Fee**: 0.5% (FEE_BPS = 50)
- **Liquidation Bonus**: 5% (LIQUIDATION_BONUS_BPS = 500)
- **Max Total Borrowed**: 100,000 USDCx (MAX_TOTAL_BORROWED = 100,000,000,000 micro)
- **Max Oracle Age**: 100 blocks (~5 min staleness, MAX_PRICE_AGE = 100)

---

## Frontend — React Application

### Pages
- **Landing** (`/`) — Marketing page with privacy architecture explainer, how-it-works, security section
- **App Dashboard** (`/app`) — Main dashboard with position cards, protocol overview, quick actions
- **Supply** (`/app/supply`) — Deposit ALEO as collateral
- **Borrow** (`/app/borrow`) — Borrow USDCx against collateral (oracle-aware max borrow)
- **Repay** (`/app/repay`) — 2-step: approve USDCx → repay debt, unlock collateral
- **Withdraw** (`/app/withdraw`) — Withdraw unused collateral (CollateralReceipt records)
- **Positions** (`/app/positions`) — View all private records
- **Liquidate** (`/app/liquidate`) — Liquidate underwater positions (oracle price comparison)
- **Stats** (`/app/stats`) — Protocol statistics + solvency + admin oracle update + fund protocol
- **History** (`/app/history`) — Transaction history with status tracking and explorer links
- **Docs** (`/docs`) — Interactive documentation with dual-record architecture + privacy limitations + roadmap

### Key Components
| Component | Purpose |
|-----------|---------|
| `AppDashboard.tsx` | Route controller, wallet connection, passes wallet props. Routes: /, supply, borrow, repay, withdraw, positions, liquidate, stats, history |
| `Dashboard.tsx` | Position summary cards, protocol overview, quick actions, live ALEO market price |
| `SupplyForm.tsx` | ALEO deposit with private credits record selector, public-to-private conversion, ParsedCreditsRecord parser |
| `BorrowForm.tsx` | USDCx borrow form with oracle-aware max borrow, LTV slider, health factor gauge |
| `RepayForm.tsx` | 2-step repay: approve USDCx spending → execute repay. Shows "Step 1/2" and "Step 2/2" progress |
| `WithdrawForm.tsx` | **NEW** — Withdraw unused collateral. Lists CollateralReceipt records with amount/block info |
| `LiquidateForm.tsx` | **NEW** — Liquidate underwater positions. Fetches oracle price every 30s, compares vs liquidation price, shows UNDERWATER badges |
| `TransactionHistory.tsx` | **NEW** — TX history page: localStorage persistence, explorer links, status tracking, last 50 TXs, clear history |
| `PositionsList.tsx` | All private records list |
| `ProtocolStats.tsx` | TVL, borrowed, market price, oracle price, solvency verification. Admin-only: Oracle Update UI + Fund Protocol |
| `TransactionFlow.tsx` | 4-step progress: Encrypting → Proving → Broadcasting → Confirmed |
| `HealthFactorGauge.tsx` | Animated health factor dial |
| `WalletButton.tsx` | Connect/disconnect with address display |

### Hooks
| Hook | Purpose |
|------|---------|
| `useTransaction` | Executes on-chain transitions via wallet adapter. Functions: supplyCollateral, borrow, repay, approveUSDCx (2-step repay), liquidate, withdrawCollateral, updateOraclePrice, fundProtocol. Auto-saves to TX history |
| `useWalletRecords` | Fetches + parses all 5 private record types from wallet. Exports: collateralReceipts, debtPositions, liquidationAuths, liquidationReceipts, repaymentReceipts |
| `useProtocolStats` | Queries public mappings for aggregate stats (TVL, borrowed, loans, oracle price, utilization) |
| `useMarketPrice` | **NEW** — Shared CoinGecko live price hook with module-level cache, 30s polling, listener pattern. All components share one fetch |
| `useAleoClient` | Low-level Aleo API client (mapping queries, tx status) |
| `useOraclePrice` | Oracle price from on-chain mapping (separate from useProtocolStats for focused usage) |

### Utilities
| File | Purpose |
|------|---------|
| `constants.ts` | Program ID, mapping names, transition names, record types, ADMIN_ADDRESS, PROTOCOL_ADDRESS, routes (including /withdraw, /liquidate) |
| `formatting.ts` | Parse Aleo values (u64/u128/field/address), format credits, `calculateMaxBorrow(collateral, oraclePrice)`, `calculateHealthFactor`, `calculateLiquidationPrice` |
| `records.ts` | Parse wallet records into typed objects (CollateralReceipt, DebtPosition, LiquidationAuth, RepaymentReceipt, LiquidationReceipt) |

---

## Backend — Express API

### Routes
| Endpoint | Purpose |
|----------|---------|
| `GET /api/stats` | Protocol stats from on-chain mappings |
| `GET /api/solvency` | Solvency check (collateral ≥ debt) |
| `GET /api/health` | Server health check |
| `GET /api/tx/:id` | Transaction status lookup |

### Services
| File | Purpose |
|------|---------|
| `oracle/priceUpdater.ts` | CoinGecko ALEO/USD price → on-chain oracle (2-min cron, 3x retry with exponential backoff) |
| `liquidation/monitor.ts` | Protocol health monitor: LTV tracking, global solvency alerts (2-min cron) |
| `utils/aleoClient.ts` | Aleo API client for backend |
| `utils/transactionBuilder.ts` | Build + sign transactions server-side |

---

## Development Timeline & Changes

### Phase 1: Initial Build (commit `f78529f`)
Built the entire project from scratch — 95 files, 10,895 insertions:
- Wrote Leo smart contract with dual-token architecture
- Built full React frontend (landing + app dashboard + 7 form pages)
- Built Express backend with oracle price updater
- Deployed contract to Aleo Testnet
- Pushed to GitHub

### Phase 2: Contract Alignment Fix (commit `baaced4`)
Found and fixed **9 critical bugs** where frontend/backend didn't match the deployed contract:

| # | Bug | Fix | Files Changed |
|---|-----|-----|--------------|
| 1 | Mapping key `'1field'` but contract uses `0u8` | Changed to `'0u8'` | constants.ts, aleoClient.ts |
| 2 | Borrow amount sent as u64, contract expects u128 | Added `microCreditsToU128Input()` | formatting.ts, useTransaction.ts |
| 3 | Supply sent 3 inputs (record, amount, nonce), contract takes 2 | Removed credit record input | useTransaction.ts, SupplyForm.tsx |
| 4 | Repay sent 2 inputs (debt, payment), contract takes 1 | Removed payment record input | useTransaction.ts, RepayForm.tsx |
| 5 | `solvency_commitment` mapping referenced but doesn't exist | Removed from all files | useProtocolStats.ts, ProtocolStats.tsx, stats.ts, solvency.ts |
| 6 | `useState(() => fetchBalance())` — runs once, not reactive | Changed to `useEffect` | SupplyForm.tsx |
| 7 | `INITIALIZE` transition referenced but doesn't exist | Removed from constants | constants.ts |
| 8 | Backend mapping key also wrong `'1field'` | Changed to `'0u8'` | aleoClient.ts |
| 9 | UI labels said "ALEO" for debt/borrow, should be "USDCx" | Updated all labels | Dashboard.tsx, BorrowForm.tsx, RepayForm.tsx |

Also fixed wallet adapter API:
- `publicKey` → `address` (matches @provablehq types)
- `requestTransaction` → `executeTransaction` (remapped in AppDashboard)
- `connect()` → `connect(Network.TESTNET)` (requires network argument)
- Form component wallet types updated for new return types

### Phase 3: Runtime Fixes (commit `b6b5ac5`)
Fixed issues found during live testing with Shield Wallet:

| # | Bug | Fix | Files Changed |
|---|-----|-----|--------------|
| 1 | Balance shows 0.00 ALEO | Switched from private record fetch to public mapping query (`credits.aleo/mapping/account/{address}`) | SupplyForm.tsx |
| 2 | "Processing..." stuck after TX confirmed | Added `setTransactionPending(false)` in both success and error paths | useTransaction.ts |
| 3 | Transaction status not matching Shield | Case-insensitive status comparison, added 'completed' status | useTransaction.ts |
| 4 | Records not parsed from Shield Wallet | Enhanced `extractFields()` to handle plaintext strings, top-level fields, Shield record format | records.ts |
| 5 | `raw` field stored parsed fields, not original record | Changed to store original wallet record object | records.ts |
| 6 | `parseAleoU64` didn't strip `u32` suffix | Added `u32` removal | formatting.ts |
| 7 | No USDCx asset display on Borrow page | Added "USDCx Stablecoin" asset card | BorrowForm.tsx |
| 8 | Debug logging for Shield wallet records | Added `console.log('[DARA]...')` for record debugging | useWalletRecords.ts |

### Phase 4: Complete Feature Build (commit `b42d584`)
Added all missing features, fixed misleading UI, rewrote README:

| # | Change | Details | Files Changed |
|---|--------|---------|--------------|
| 1 | **Created WithdrawForm.tsx** | Full withdraw collateral page. Lists CollateralReceipt records with amount/deposit block. Calls `withdrawCollateral(receipt.plaintext)`. Includes privacy badge, TransactionFlow, EmptyState | WithdrawForm.tsx (NEW) |
| 2 | **Created LiquidateForm.tsx** | Full liquidation page. Fetches oracle price from on-chain every 30s. Compares oracle price vs liquidation price per position. Shows UNDERWATER badges. Client-side validation prevents liquidating healthy positions | LiquidateForm.tsx (NEW) |
| 3 | **Added routes** | `<Route path="withdraw">` and `<Route path="liquidate">` with wallet props | AppDashboard.tsx |
| 4 | **Added sidebar nav** | Withdraw (KeyIcon) and Liquidate (ZapIcon) nav items. Full navItems: Dashboard, Supply, Borrow, Repay, Withdraw, Positions, Liquidate, Stats | Sidebar.tsx |
| 5 | **Added ADMIN_ADDRESS** | `aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8` hardcoded. Added WITHDRAW/LIQUIDATE to ROUTES | constants.ts |
| 6 | **Made Fund Protocol admin-only** | Changed condition from `wallet?.connected` to `wallet?.connected && wallet?.address === ADMIN_ADDRESS` | ProtocolStats.tsx |
| 7 | **Added Oracle Update UI (admin-only)** | Fetches CoinGecko price, shows side-by-side Current On-Chain vs Live CoinGecko price, "Update to $X" button calls `updateOraclePrice(priceMicro)` | ProtocolStats.tsx, useTransaction.ts |
| 8 | **Added `updateOraclePrice` to hook** | `executeTransaction(TRANSITIONS.UPDATE_ORACLE_PRICE, [microCreditsToInput(priceMicro)])` | useTransaction.ts |
| 9 | **Added `fundProtocol` to hook** | Separate TX to `test_usdcx_stablecoin.aleo/transfer_public`, transfers USDCx to protocol address | useTransaction.ts |
| 10 | **Exported LiquidationAuth/LiquidationReceipt** | Added `filterRecordsByType` calls for both, added to return object | useWalletRecords.ts |
| 11 | **Fixed CrossChainSection** | Changed label "Cross-Chain" → "Roadmap — Cross-Chain" with "Coming soon" subtitle | CrossChainSection.tsx |
| 12 | **Fixed StatsBar** | Replaced fake "Chains Connected: 35+" with real Oracle Price from on-chain mapping. Renamed "Positions Hidden" → "Privacy Level" (100% factually true) | StatsBar.tsx |
| 13 | **Fixed StatsBar TS error** | Removed orphaned `stat.subtext` JSX reference that caused 2 TypeScript errors | StatsBar.tsx |
| 14 | **Updated DocsContent** | Added "Dual-Record Architecture" section explaining DebtPosition + LiquidationAuth pattern. Added "Known Limitations & Roadmap" documenting privacy leaks honestly. Added Getting Started steps 5-7 (Repay, Withdraw, Liquidate) | DocsContent.tsx |
| 15 | **Rewrote README.md** | Removed nonexistent `initialize` transition. Changed "Borrow ALEO" → "Borrow USDCx". Removed false cross-chain claims. Removed fake `docs/` directory references. Added explorer link, deployment TX, dual-record architecture, all 5 record types, all 7 public mappings, privacy model with known limitations, full working features table (10 items) | README.md |

### Phase 5: Math + Flow Fixes (commits `a234193`, `6934873`, `b6d6e18`)
Fixed critical bugs found during live borrow/repay testing:

| # | Bug | Root Cause | Fix | Files Changed |
|---|-----|-----------|-----|--------------|
| 1 | **Created useMarketPrice hook** | No live price display for non-admin users | New shared hook: CoinGecko price every 30s, module-level cache, listener pattern. All components share one fetch interval | useMarketPrice.ts (NEW) |
| 2 | **Live price on all pages** | Only admin could see CoinGecko price | Dashboard: replaced "Utilization Rate" card with "ALEO Price". StatsBar: "Oracle Price" → "ALEO Price" (live). ProtocolStats: "Market Price" card in top row + "Oracle Price (On-Chain)" in utilization row | Dashboard.tsx, StatsBar.tsx, ProtocolStats.tsx |
| 3 | **USDCx balance shows 0.00** | Regex `/["u128]/g` is a character class — strips individual chars `"`, `u`, `1`, `2`, `8`. So `1000000u128` → `000000` → 0 | Changed to `parseInt(raw.replace(/"/g, ''), 10)` — `parseInt` naturally stops at `u` | ProtocolStats.tsx |
| 4 | **Borrow rejected on-chain** | `calculateMaxBorrow(collateral)` ignored oracle price. With price $0.06, showed max 0.70 USDCx but contract calculated max 0.044 | Fixed: `calculateMaxBorrow(collateral, oraclePrice)` = `col * price * 7000 / (PRECISION * 10000)` matching contract's `col_value * LTV_BPS / BPS` | formatting.ts, BorrowForm.tsx, Dashboard.tsx |
| 5 | **BorrowForm LTV wrong** | `ltvRatio = borrowAmount / collateralAmount * 100` — raw amounts, not dollar values | Fixed: `ltvRatio = borrowAmount / colValue * 100` where `colValue = collateral * oraclePrice / PRECISION` | BorrowForm.tsx |
| 6 | **Dashboard maxBorrow wrong** | Inline formula `totalCollateral * 700_000 / PRECISION` ignored oracle price | Changed to `calculateMaxBorrow(totalCollateral, oraclePrice) - totalDebt` | Dashboard.tsx |
| 7 | **Repay rejected on-chain** | Contract's `repay` calls `transfer_from_public` (USDCx) which requires allowance. No approval step existed | Added `approveUSDCx(amount)` to useTransaction — calls `test_usdcx_stablecoin.aleo/approve_public(PROTOCOL_ADDRESS, amount)`. RepayForm now 2-step: approve → repay with "Step 1/2" / "Step 2/2" button labels | useTransaction.ts, RepayForm.tsx |

### Phase 6: Contract v2 Upgrade + Wave 3 Competition Overhaul
Comprehensive upgrade for Wave 3 buildathon: contract renamed to `dara_lend_v2.aleo`, redeployed to testnet.

#### Contract Changes (v1 → v2)

| # | Change | Details | Impact |
|---|--------|---------|--------|
| 1 | **Privacy fix: borrower_hash** | LiquidationAuth now stores `borrower_hash: field` (BHP256 hash of borrower address) instead of raw `borrower: address` | Orchestrator/liquidator can no longer identify borrowers from LiquidationAuth records |
| 2 | **Oracle freshness validation** | `update_oracle_price` records `block.height` in `price_update_block` mapping. `borrow` and `liquidate` assert `block.height - last_update <= 100` | Prevents exploitation of stale oracle prices |
| 3 | **Origination fee** | `borrow` deducts 0.5% fee (FEE_BPS = 50) from borrow amount. Borrower receives `net_borrow = borrow_amount - fee`. Debt tracks full amount. Fees tracked in `total_fees_collected` mapping | Protocol revenue model |
| 4 | **Liquidation incentive** | `liquidate` awards 5% bonus collateral (LIQUIDATION_BONUS_BPS = 500) to liquidator: `total_seize = collateral + (collateral × 500 / 10000)` | Rational economic incentive for liquidators |
| 5 | **Circuit breaker** | `finalize_borrow` asserts `current_borrowed + borrow_amount <= MAX_TOTAL_BORROWED` (100K USDCx) | Limits protocol exposure during early stages |
| 6 | **Nonce binding** | `supply_collateral` uses `BHP256::hash_to_field(nonce + BHP256::hash_to_field(self.signer))` instead of `BHP256::hash_to_field(nonce)` | Prevents grief attacks where attacker replays nonce |
| 7 | **New mappings** | Added `price_update_block: u8 => u32` and `total_fees_collected: u8 => u128` | Oracle freshness tracking + fee accounting |
| 8 | **Constructor init** | Constructor now initializes all 9 mappings including new ones | Clean initial state |

#### Frontend Changes

| # | Change | Files |
|---|--------|-------|
| 1 | Updated PROGRAM_ID to `dara_lend_v2.aleo` | constants.ts |
| 2 | Updated PROTOCOL_ADDRESS to v2 derived address | constants.ts |
| 3 | Added PRICE_UPDATE_BLOCK + TOTAL_FEES_COLLECTED mappings | constants.ts |
| 4 | Updated wallet provider programs list | main.tsx |
| 5 | LiquidationAuth record: `borrower` → `borrowerHash` | records.ts, PositionCard.tsx, LiquidateForm.tsx |
| 6 | Cryptographic nonce: `Date.now()` → `crypto.getRandomValues()` | SupplyForm.tsx |
| 7 | Balance auto-refresh after supply | SupplyForm.tsx |
| 8 | Click-to-copy on position card fields | PositionCard.tsx |
| 9 | Health factor color alerts (green/yellow/orange/red) + liquidation risk banner | Dashboard.tsx |
| 10 | **Created TransactionHistory.tsx** — localStorage-backed TX history with explorer links, clear history | TransactionHistory.tsx (NEW) |
| 11 | **Created ClockIcon.tsx** — Clock SVG icon | ClockIcon.tsx (NEW) |
| 12 | Added History nav item to sidebar | Sidebar.tsx |
| 13 | Added `/app/history` route | AppDashboard.tsx |
| 14 | Added missing TopBar route titles (withdraw, liquidate, history) | TopBar.tsx |
| 15 | TX history auto-save on confirmed/failed/pending | useTransaction.ts |
| 16 | **Docs: Roadmap section** — 3-phase roadmap (Wave 3, Wave 4, Future) | DocsContent.tsx, DocsLayout.tsx |
| 17 | Updated docs: v2 references, borrower_hash code blocks, fee/bonus descriptions, FAQ | DocsContent.tsx |

#### Backend Changes

| # | Change | Files |
|---|--------|-------|
| 1 | Updated programId to `dara_lend_v2.aleo` | config.ts |
| 2 | Oracle interval reduced from 5 min to 2 min | config.ts |
| 3 | Added retry logic: 3 attempts with exponential backoff (2s, 4s, 8s) | priceUpdater.ts |
| 4 | Exported `getOracleStatus()` (lastUpdateTimestamp, lastUpdatePrice) | priceUpdater.ts |
| 5 | **Rewrote liquidation monitor** — protocol snapshot, global LTV tracking, health alerts, 2-min cron | monitor.ts |
| 6 | Exported `getMonitorStatus()` for health endpoint | monitor.ts |
| 7 | Enhanced `/health` endpoint with oracle status + protocol snapshot (LTV, collateral, borrowed) | health.ts |
| 8 | Integrated `startLiquidationMonitor()` | index.ts |

#### Deployment

| Item | Value |
|------|-------|
| Program | dara_lend_v2.aleo |
| Deploy TX | at10vx3736ggtx9v2g436pxeyvgpg3knfg38lfd96jc022eju6ktyxsd6jzzs |
| Total Variables | 412,642 |
| Total Constraints | 310,023 |
| Deploy Cost | 11.513265 credits |
| Build | `leo build` ✅, `npm run build` (frontend) ✅, `npx tsc --noEmit` (backend) ✅ |

### Phase 7: Contract v3 — End-to-End Private Token Transfers (commit `ad47bf7`)

Migrated all token transfers from public to private functions. Removed the false claim that "the Aleo SDK does not yet provide documentation for private stablecoin transfers" — private transfers are standard Aleo functionality, available via Shield Wallet. Studied 4 reference projects (NullPay, Veiled Markets, VeilReceipt, ZKPerp) for architectural patterns (no code copied).

#### Contract Changes (v2 → v3)

| # | Change | Details | Impact |
|---|--------|---------|--------|
| 1 | **supply_collateral → private input** | Added `input_credits: credits.aleo/credits` private record as first parameter. Uses `transfer_private_to_public(input_credits, self.address, amount)`. Tuple destructured: `let (change_credits, credit_future)` | Supplier identity hidden — private record consumed, change record returned to user |
| 2 | **borrow → private USDCx** | Changed from `transfer_public` to `transfer_public_to_private(self.caller, net_borrow)`. Tuple destructured: `let (compliance_record, usdcx_token, borrow_future)` | Borrower receives private Token record — address not exposed on-chain |
| 3 | **repay → private collateral return** | Added `credits.aleo/transfer_public_to_private(self.caller, collateral_amount)` for returning collateral. Tuple destructured: `let (return_credits, return_future)`. USDCx repay kept as `transfer_from_public` (approval pattern) | Collateral returned as private record; USDCx kept public due to Merkle proof complexity |
| 4 | **liquidate → private seizure** | Changed to `credits.aleo/transfer_public_to_private(self.caller, total_seize)`. Tuple destructured: `let (seize_credits, seize_future)` | Liquidator identity hidden |
| 5 | **withdraw → private return** | Changed to `credits.aleo/transfer_public_to_private(self.caller, receipt.collateral_amount)`. Tuple destructured: `let (return_credits, return_future)` | Withdrawer identity hidden |
| 6 | **External call tuple destructuring** | All external calls now properly destructure multi-value returns: `(record, Future)` or `(ComplianceRecord, Token, Future)` | Required by Leo type system — initial build failed without this |

#### Frontend Changes

| # | Change | Files |
|---|--------|-------|
| 1 | `PROGRAM_ID` → `dara_lend_v3.aleo` | constants.ts |
| 2 | `PROTOCOL_ADDRESS` → `aleo1qg44nuy7y9pshqcapw67w8mcye23s3mh7dl2ze8lw9m9yg0fqvzs2f94nn` (derived via SDK) | constants.ts |
| 3 | Added `TX_FEE_HIGH = 1_000_000` for complex private transfers | constants.ts |
| 4 | `supplyCollateral` now takes `(creditsRecord: string, amount, nonce)` — passes private record as first input | useTransaction.ts |
| 5 | Added `convertCreditsToPrivate(amountMicro)` — calls `credits.aleo/transfer_public_to_private` to user's own address | useTransaction.ts |
| 6 | **SupplyForm.tsx full rewrite**: `ParsedCreditsRecord` interface, private record selector, "Convert Credits to Private" button, privacy badge, public+private balance display | SupplyForm.tsx |
| 7 | Updated wallet provider programs list to v3 | main.tsx |
| 8 | **PrivacyArchitecture.tsx**: Rewrote code comparison from "Borrower Identity Protection" (borrower_hash) to "End-to-End Private Token Flows" (transfer_public_to_private). Added Supplier/Borrower/Liquidator Identity to private items list | PrivacyArchitecture.tsx |
| 9 | **DocsContent.tsx**: Removed false "Known Limitations" section. Added "Private Transfer Architecture" section with 6 operations. Updated transitions to mention private functions. Updated roadmap (Wave 3: private flows; Wave 4: Merkle proof USDCx repay). Updated explorer link to v3 | DocsContent.tsx |
| 10 | **TechnicalEdge.tsx**: Replaced "Origination Fee" card with "End-to-End Private Token Flows" card | TechnicalEdge.tsx |
| 11 | RepayForm.tsx: Updated subtitle to "Repay USDCx debt and reclaim collateral as a private record" | RepayForm.tsx |

#### Backend Changes

| # | Change | Files |
|---|--------|-------|
| 1 | Updated `programId` to `dara_lend_v3.aleo` | config.ts |
| 2 | Updated JSDoc comment to reference v3 | transactionBuilder.ts |

#### README Changes

| # | Change |
|---|--------|
| 1 | Removed entire "Known Limitations" section (false claim about SDK not supporting private transfers) |
| 2 | Added "Private Transfer Architecture" subsection with full table of all 6 operations |
| 3 | Updated all `dara_lend_v2.aleo` references to `dara_lend_v3.aleo` |
| 4 | Updated transitions table with privacy descriptions |
| 5 | Added "Contract Upgrade (v2 → v3) — Private Transfer Migration" to changelog |
| 6 | Rewrote "What Sets DARA Lend Apart" #1 from "Borrower Identity Protection" to "End-to-End Private Token Flows" |
| 7 | Updated deployment TX to v3 |

#### Deployment

| Item | Value |
|------|-------|
| Program | dara_lend_v3.aleo |
| Deploy TX | at1jm98627sgwes0kx3nlqnqrw7e9qlre3mauzac9drt5mughpnjs8qmd8thl |
| Fee TX | at1rkjfpenwp6qau49nzlppa2gulphrp47dyf287ma5lzdup6m2xy9q3dvfws |
| Total Variables | 502,912 |
| Total Constraints | 379,769 |
| Deploy Cost | 11.802281 credits |
| Build | `leo build` ✅, `npx tsc --noEmit` (frontend) ✅, `npx tsc --noEmit` (backend) ✅ |

### Phase 8: Runtime Bug Fixes — CORS, Wallet Noise, Oracle Hang (commit `47cd35b`)

Fixed 3 runtime issues discovered during live testing of v3.

#### Issue 1: CoinGecko CORS (Frontend price fetch blocked)

The `useMarketPrice.ts` hook was calling `https://api.coingecko.com/api/v3/simple/price?ids=aleo&vs_currencies=usd` directly from the browser. CoinGecko's API blocks browser CORS requests and rate-limits aggressively (429).

**Fix**: Created `/api/price` backend endpoint ([backend/src/api/routes/price.ts](backend/src/api/routes/price.ts)) that fetches price server-side from CoinGecko with CryptoCompare fallback. Updated `useMarketPrice.ts` to call `/api/price` instead. Vite already proxies `/api` → `localhost:3001`.

| File | Change |
|------|--------|
| backend/src/api/routes/price.ts | **NEW** — Server-side price endpoint with 15s cache, CoinGecko + CryptoCompare fallback |
| backend/src/api/server.ts | Registered `/api/price` route |
| frontend/src/hooks/useMarketPrice.ts | Changed fetch URL from CoinGecko direct → `/api/price` proxy |

#### Issue 2: "WalletError: Program not allowed" (Console noise)

Wallet `requestRecords(PROGRAM_ID)` throws "Program not allowed" when the wallet hasn't synced the newly deployed program. This is expected behavior after a fresh deploy — the wallet needs to index the new program. The error was caught but logged as `console.error` every 15 seconds.

**Fix**: Detect "not allowed" / "not authorized" errors specifically and log a helpful `console.warn` instead. Increased poll interval from 15s to 30s to reduce noise.

| File | Change |
|------|--------|
| frontend/src/hooks/useWalletRecords.ts | Specific catch for "Program not allowed" with actionable message, poll 15s→30s |

#### Issue 3: Backend Oracle WASM Hang (Key synthesis freeze)

The oracle `priceUpdater.ts` calls `transactionBuilder.ts → executeTransition('update_oracle_price', ...)`. Without a Provable API key, this falls back to local WASM proving which attempts to synthesize keys for all 5 imported programs (credits, merkle_tree, multisig_core, freezelist, stablecoin). WASM crashes/hangs indefinitely for programs with 4+ imports — this is a known Aleo SDK limitation.

**Fix**: Removed the local WASM proving fallback entirely (it can never succeed for this contract). Added early check in `startPriceUpdater()` — if `PROVABLE_API_KEY` is not set, the oracle updater is disabled with a clear warning. Updated `.env.example` with the required variables.

| File | Change |
|------|--------|
| backend/src/utils/transactionBuilder.ts | Replaced local proving fallback with error explaining the 4+ imports WASM limitation |
| backend/src/oracle/priceUpdater.ts | Added `PROVABLE_API_KEY` check — oracle disabled with warning if not set |
| backend/.env.example | Added `PROVABLE_API_KEY` and `PROVABLE_CONSUMER_ID` variables |

---

## Live Testing Results

### Tested Successfully ✅
1. **Wallet Connection** — Shield Wallet connects, shows truncated address `aleo1f...2cs8`
2. **Supply Collateral** — Supplied 1 ALEO, 3 ALEO, and 1 ALEO successfully (3 CollateralReceipt records)
   - Transaction flow shows all 4 steps (Encrypting → Proving → Broadcasting → Confirmed)
   - Shield Wallet shows "Executed supply_collateral on dara_lend_v1.aleo — ACCEPTED"
   - Correct inputs: `1000000u64` (amount) + `1772907830663field` (nonce)
3. **Oracle Price Update** — Updated from $1.00 to real CoinGecko price (~$0.0626) via admin UI
   - Shield Wallet shows "Executed update_oracle_pric... dara_lend_v1.aleo — ACCEPTED"
4. **Fund Protocol** — Funded 1 USDCx to protocol
   - Shield Wallet shows "Sent Publicly — ACCEPTED"
   - On-chain balance: `1000000u128` at `test_usdcx_stablecoin.aleo/mapping/balances/{PROTOCOL_ADDRESS}`
5. **Borrow USDCx** — Borrowed 0.04 USDCx against 1 ALEO collateral
   - Shield Wallet shows "Executed borrow on dara_lend_v1.aleo — ACCEPTED"
   - Created both DebtPosition and LiquidationAuth records
6. **Market Price** — Live CoinGecko price displayed on Dashboard, StatsBar, and ProtocolStats
7. **Stats Page** — Shows TVL (5.00 ALEO), Total Borrowed, Active Loans, Market Price, Oracle Price, Solvency verification
8. **Dashboard** — Shows position (collateral ALEO, debt USDCx), health factor gauge, ALEO price, quick actions
9. **Repay** — 2-step approve→repay confirmed ACCEPTED. RepaymentReceipt: amountRepaid=43831, collateralReturned=1000000

### Tested — Fixed After Failures
1. **Borrow (first attempt)** — REJECTED because `calculateMaxBorrow` ignored oracle price. UI showed max 0.70 USDCx but contract max was 0.044. Fixed in Phase 5 #4
2. **Repay (first attempt)** — REJECTED because contract uses `transfer_from_public` which needs USDCx allowance. Fixed by adding approve step in Phase 5 #7
3. **Fund Protocol balance display** — Showed 0.00 USDCx due to regex character class bug. Fixed in Phase 5 #3

### Not Yet Tested
1. **Withdraw Collateral** — UI built, not yet tested on-chain
2. **Liquidation** — UI built, not yet tested on-chain (need an underwater position)

---

## File Tree

```
DARA-Lend/
├── .gitignore
├── README.md
├── summaryv1.md
├── contract/
│   └── dara_lend_v1/
│       ├── program.json
│       ├── .env / .env.example
│       ├── inputs/dara_lend_v1.in
│       └── src/main.leo                    ← Smart contract (436 lines)
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── App.tsx                          ← Router setup
│       ├── main.tsx                         ← Wallet provider config
│       ├── styles/globals.css               ← Tailwind + custom theme
│       ├── stores/appStore.ts               ← Zustand state (tx tracking)
│       ├── pages/
│       │   ├── AppDashboard.tsx             ← App route controller + wallet bridge (8 routes)
│       │   ├── Landing.tsx                  ← Marketing page
│       │   └── Docs.tsx                     ← Documentation page
│       ├── components/
│       │   ├── app/
│       │   │   ├── Dashboard.tsx            ← Position overview + market price
│       │   │   ├── SupplyForm.tsx           ← ALEO deposit
│       │   │   ├── BorrowForm.tsx           ← USDCx borrow (oracle-aware max)
│       │   │   ├── RepayForm.tsx            ← 2-step: approve USDCx → repay debt
│       │   │   ├── WithdrawForm.tsx         ← NEW: Withdraw collateral
│       │   │   ├── LiquidateForm.tsx        ← NEW: Liquidate underwater positions
│       │   │   ├── PositionsList.tsx        ← All records viewer
│       │   │   ├── ProtocolStats.tsx        ← TVL + solvency + admin oracle/fund
│       │   │   ├── TransactionHistory.tsx    ← NEW: TX history with explorer links
│       │   │   └── PositionCard.tsx         ← Individual position (click-to-copy)
│       │   ├── landing/                     ← 7 marketing sections (CrossChain → "Roadmap")
│       │   ├── layout/                      ← Navbar, Sidebar (9 nav items + History), Footer, TopBar
│       │   ├── shared/                      ← Reusable UI components
│       │   ├── icons/                       ← SVG icon components (includes ClockIcon)
│       │   └── docs/                        ← Docs layout + content (dual-record + roadmap + limitations)
│       ├── hooks/
│       │   ├── useTransaction.ts            ← TX execution: supply, borrow, repay, approveUSDCx, liquidate, withdraw, updateOracle, fundProtocol + auto-save to history
│       │   ├── useWalletRecords.ts          ← Record fetching: 5 record types exported
│       │   ├── useProtocolStats.ts          ← On-chain mapping queries
│       │   ├── useMarketPrice.ts            ← NEW: ALEO price via backend proxy (30s poll, shared cache)
│       │   └── useAleoClient.ts             ← Aleo REST API client
│       └── utils/
│           ├── constants.ts                 ← Program ID, mappings, transitions, ADMIN_ADDRESS, PROTOCOL_ADDRESS
│           ├── formatting.ts                ← Value parsers, calculateMaxBorrow(col, price), calculateHealthFactor
│           └── records.ts                   ← Record type parser (5 record types)
└── backend/
    ├── package.json
    ├── tsconfig.json
    ├── .env.example                         ← PORT, PRIVATE_KEY, ADMIN_ADDRESS, ALEO_RPC_URL, COINGECKO_API_URL, PROVABLE_API_KEY
    └── src/
        ├── index.ts                         ← Entry point
        ├── api/
        │   ├── server.ts                    ← Express app setup
        │   └── routes/
        │       ├── stats.ts                 ← Protocol stats endpoint
        │       ├── solvency.ts              ← Solvency check endpoint
        │       ├── health.ts                ← Server health endpoint
        │       ├── transaction.ts           ← TX status endpoint
        │       └── price.ts                 ← NEW: Server-side ALEO price proxy (CoinGecko + CryptoCompare)
        ├── oracle/priceUpdater.ts           ← CoinGecko → on-chain price (2min cron, 3x retry)
        ├── liquidation/monitor.ts           ← Protocol health monitor (LTV tracking, 2min cron)
        └── utils/
            ├── aleoClient.ts                ← Backend Aleo API client
            ├── config.ts                    ← Environment config
            └── transactionBuilder.ts        ← Server-side TX builder (snarkos CLI)
```

---

## Git History

| Commit | Message | Files | Changes |
|--------|---------|-------|---------|
| `f78529f` | Initial commit: DARA Lend | 95 files | +10,895 lines |
| `baaced4` | fix: align frontend/backend with deployed contract API | 14 files | +104, -138 |
| `b6b5ac5` | fix: wallet balance, record parsing, and transaction state | 6 files | +82, -31 |
| `b42d584` | feat: complete all lending features + fix README | 19 files | +1,054, -124 |
| `a234193` | feat: integrate market price functionality | 4 files | +106, -18 |
| `6934873` | fix: correct max borrow formula, USDCx parsing, live market price | 6 files | +52, -18 |
| `b6d6e18` | feat: add USDCx approval step before repayment | 2 files | +58, -8 |
| *(pending)* | feat: contract v2 upgrade + Wave 3 competition overhaul | ~20 files | ~+800, -200 |
| `ad47bf7` | feat: v3 contract with end-to-end private token transfers | 21 files | +941, -118 |
| `47cd35b` | fix: CoinGecko CORS, wallet records noise, oracle WASM hang | 7 files | +94, -16 |

**Total across all commits**: ~50 files modified, ~3,200 insertions, ~600 deletions (post-initial commit).

---

## Privacy Design

### What's Private (encrypted records + private transfers — only owner can see)
- Individual collateral deposit amounts
- Individual debt amounts
- Liquidation prices
- Loan IDs
- **Supplier identity** (private credits record consumed during supply)
- **Borrower identity** (USDCx disbursed as private Token record)
- **Liquidator identity** (collateral seized via transfer_public_to_private)
- **Withdrawer identity** (collateral returned via transfer_public_to_private)
- User addresses associated with positions (LiquidationAuth stores hashed borrower address, not raw)
- Health factors (computed client-side, never on-chain)
- Origination fees per loan (only aggregate tracked)

### What's Public (on-chain mappings — anyone can see)
- Total collateral locked (aggregate)
- Total borrowed (aggregate)
- Number of active loans
- Oracle price
- Protocol admin address
- Block height of last oracle update
- Total origination fees collected (aggregate)

### Private Transfer Architecture (v3)
DARA Lend v3 uses private token transfer functions throughout the protocol:

| Operation | Transfer Function | Privacy Property |
|-----------|------------------|------------------|
| Supply Collateral | `credits.aleo/transfer_private_to_public` | Supplier identity hidden — private record consumed |
| Borrow USDCx | `test_usdcx_stablecoin.aleo/transfer_public_to_private` | Borrower receives private Token — address not exposed |
| Repay USDCx | `test_usdcx_stablecoin.aleo/transfer_from_public` | Approval pattern — kept public (Merkle proof complexity avoided) |
| Repay Collateral Return | `credits.aleo/transfer_public_to_private` | Collateral returned as private record |
| Liquidate Seizure | `credits.aleo/transfer_public_to_private` | Liquidator identity hidden |
| Withdraw Collateral | `credits.aleo/transfer_public_to_private` | Withdrawer identity hidden |

**Note on USDCx Repay**: The `transfer_private_to_public` function for USDCx requires `[MerkleProof; 2]` (each with `siblings: [field; 16]` + `leaf_index: u32`) for freeze-list compliance. This complexity was deferred to Wave 4.

### Why This Design Matters
- **End-to-end private token flows** — 5 of 6 transfer operations use private functions
- MEV bots cannot see your liquidation price → cannot front-run liquidations
- No one knows your health factor or how close you are to liquidation
- Protocol solvency is still verifiable: anyone can check `total_collateral ≥ total_borrowed`
- Dual-record pattern (DebtPosition + LiquidationAuth): borrower and orchestrator each get their own encrypted record
- Position data (collateral amounts, debt amounts, loan IDs) remains fully encrypted
- LiquidationAuth stores `borrower_hash` (field) instead of raw address
- Oracle freshness prevents stale price exploitation
- Circuit breaker limits protocol exposure

---

## Key Constants & Addresses

| Constant | Value |
|----------|-------|
| PROGRAM_ID | `dara_lend_v5.aleo` |
| PROTOCOL_ADDRESS | `aleo1lquusvxz6syfd4gq2rr2tk46484ee6q4nm5k4q3wmuclgxql7qyq7htwcn` |
| ADMIN_ADDRESS | `aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8` |
| USDCX_PROGRAM | `test_usdcx_stablecoin.aleo` |
| CREDITS_PROGRAM | `credits.aleo` |
| PRECISION | 1,000,000 (6 decimals) |
| LTV_RATIO | 70% (700,000 / 1,000,000) — contract: `LTV_BPS = 7,000 / BPS = 10,000` |
| LIQUIDATION_THRESHOLD | 80% (800,000 / 1,000,000) — contract: `LIQ_BPS = 8,000 / BPS = 10,000` |
| MIN_COLLATERAL | 0.1 ALEO (100,000 microcredits) |
| FEE_BPS | 50 (0.5% origination fee) |
| LIQUIDATION_BONUS_BPS | 500 (5% liquidation incentive) |
| MAX_TOTAL_BORROWED | 100,000 USDCx (100,000,000,000 micro) |
| MAX_PRICE_AGE | Removed — oracle prices valid until next update |
| TX_FEE | 500,000 microcredits |
| TX_FEE_HIGH | 1,000,000 microcredits (complex private transfers) |

---

## Deployment Info

| Item | Value |
|------|-------|
| Program | dara_lend_v5.aleo |
| Network | Aleo Testnet |
| Deploy TX (v5) | at1vj2av6kdkjf6fsty3tjdw877xjquk4trw69nfzy3jv9u3gr27cpq8ww839 |
| Deploy TX (v4) | at149ttcvge4hpu8n9tc5ey9j875447le32nzf4w4f0z9w88lmvns9s29tscc |
| Deploy TX (v3) | at1jm98627sgwes0kx3nlqnqrw7e9qlre3mauzac9drt5mughpnjs8qmd8thl |
| Deploy TX (v2) | at10vx3736ggtx9v2g436pxeyvgpg3knfg38lfd96jc022eju6ktyxsd6jzzs |
| Deploy TX (v1) | at1chdltvfp6xrfh5x5ypn3ahw898knvhp9wclqrwmtv2556zwzsggq227v8m |
| Deployer | aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8 |
| Dependencies | credits.aleo, test_usdcx_stablecoin.aleo |
| Frontend Port | 5173 (Vite dev) / 3000 (if configured) |
| Backend Port | 3001 |
| Oracle | CoinGecko → `update_oracle_price` every 2 min (cron with retry), or admin-triggered via UI |

---

## Formula Reference

### Contract Math (Leo)
```
SCALE = 1,000,000
LTV_BPS = 7,000
LIQ_BPS = 8,000
BPS = 10,000
FEE_BPS = 50
LIQUIDATION_BONUS_BPS = 500

col_value = collateral * oracle_price / SCALE
max_borrow = col_value * LTV_BPS / BPS
liquidation_price = borrow_amount * SCALE * BPS / (collateral * LIQ_BPS)

# v2 additions
fee = borrow_amount * FEE_BPS / BPS                     // 0.5% origination fee
net_borrow = borrow_amount - fee                         // amount borrower receives
bonus_collateral = collateral * LIQUIDATION_BONUS_BPS / BPS  // 5% liquidation bonus
total_seize = collateral + bonus_collateral              // total taken by liquidator
nonce_hash = BHP256::hash_to_field(nonce + BHP256::hash_to_field(self.signer))
borrower_hash = BHP256::hash_to_field(self.signer)       // stored in LiquidationAuth
```

### Frontend Math (TypeScript — must match contract)
```
calculateMaxBorrow(col, price) = floor(col * price * 7000 / (1_000_000 * 10_000))
calculateHealthFactor(col, debt, price) = (col * price / PRECISION) * 800_000 / PRECISION / debt
calculateLiquidationPrice(debt, col) = ceil(debt * PRECISION / (col * 800_000 / PRECISION))
```
