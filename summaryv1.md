DARA — The Invisible Protocol
Encrypted DeFi Fortress on Aleo | 7 Contracts · 76 Transitions · ~5M ZK Variables
Every position sealed. Every trade hidden. Every vote untraceable.

live:https://dara-lend.vercel.app 
docs:https://dara-lend.vercel.app/docs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
◆ 7 CONTRACTS · 76 TRANSITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] dara_lend_v8.aleo · 12 tx — Core lending. ALEO collateral → USDCx/USAD at 50% LTV. Kink rate (base 2%, slope1 4%, slope2 75%, optimal 80%). 7-source oracle (Coinbase, Gate.io, MEXC, XT.com, CoinGecko, CryptoCompare, CMC). BHP256-hashed borrowers.

[2] dara_lend_v8_credits.aleo · 12 tx — Reverse lending. USDCx/USAD collateral → borrow ALEO credits. Own oracle. Bidirectional liquidation.

[3] dara_lend_v8_vault.aleo · 10 tx — Yield vault. PoolShare records. ZK private transfers — untraceable.

[4] dara_lend_v8_gov_v3.aleo · 12 tx — First private DAO on Aleo. vote() has NO finalize, zero trace. 1–30 day voting, delegation, 20% quorum, timelock, 5 proposal types.

[5] dara_dark_pool_v1.aleo · 9 tx — Private OTC. Encrypted TradeIntent, epoch batch settlement. Zero MEV.

[6] dara_auction_v1.aleo · 10 tx — First sealed-bid auction on Aleo. BHP256: hash(hash(bid)+secret). 15min–7day.

[7] dara_flash_v1.aleo · 11 tx — Flash loans. 102% collateral, 0.09% fee. ALEO↔USDCx. 4-step atomic.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
◆ PRIVACY · 12+ ENCRYPTED RECORD TYPES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DebtPosition · PoolShare · GovernanceToken · TradeIntent · FillReceipt · SealedBid · AuctionWin · FlashLoanReceipt + more
Health factors client-side only. Aggregate totals on-chain only.

7 Bots via Provable DPS (JWT · zero-gas · nonce queue):
Oracle 30min · Interest 1hr · Yield 6hr · Liquidation 1min · Dark Pool 5min · Auction 5min · Flash Oracle 30min

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
◆ WAVE 5 — FULL DeFi SUITE EXPANSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

+ Dark Pool · 15.99 cr — private OTC, epoch settlements, zero MEV
+ Sealed-Bid Auctions · 18.44 cr — first commit-reveal on Aleo
+ Flash Loans · 20.30 cr — bidirectional ALEO↔USDCx collateral-backed
+ Governance v1→v2→v3 — vote() fully private, NO finalize
+ Kink rate curve — configurable set_rate_params on-chain
+ 18 pages: Dashboard, Supply, Borrow, Repay, Withdraw, Positions, Vault, Transfer, Dark Pool, Auctions, Flash, Governance, Analytics, Rate Curve, History, Stats, Liquidate, Admin
+ 18 bugs fixed: vote leak, BHP256 mismatch, oracle sync, flash pool funding


Leo 4.0 · React 18 · Vite · TypeScript · Tailwind · Express.js · Provable DPS · Shield Wallet · Vercel + Render

DeFi Without Being Watched.
