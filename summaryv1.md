DARA — Privacy-First DeFi Suite on Aleo

DARA is a complete DeFi protocol on Aleo where every position, trade, bid, flash loan, and vote is encrypted inside zero-knowledge proofs. Seven smart contracts with 76 transitions and ~5 million compiled variables are deployed on Aleo Testnet.

Live App: https://dara-lend.vercel.app
GitHub: https://github.com/NOVA1358X/Dara-lend
API: https://dara-lend-api.onrender.com/api/health

Seven Deployed Programs (76 Transitions)

1) dara_lend_v8.aleo — 12 transitions — Core lending: supply ALEO/USDCx/USAD collateral, borrow at 50% LTV, repay, withdraw, liquidate. On-chain interest model, oracle, circuit breaker.
2) dara_lend_v8_credits.aleo — 12 transitions — Reverse lending: stablecoin collateral to borrow ALEO credits.
3) dara_lend_v8_vault.aleo — 10 transitions — Yield vault with PoolShare records, ZK private transfers that break sender-recipient links.
4) dara_lend_v8_gov_v3.aleo — 12 transitions — Private governance: vote() has NO finalize (zero on-chain trace), 1–30 day configurable voting, delegation, 20% quorum, timelock. First private DAO on Aleo.
5) dara_dark_pool_v1.aleo — 9 transitions — Epoch-based private OTC trading at oracle mid-price. Zero MEV by design.
6) dara_auction_v1.aleo — 10 transitions — Sealed-bid auctions with BHP256 commit-reveal: hash(hash(bid) + secret), 15-min to 7-day bid windows.
7) dara_flash_v1.aleo — 11 transitions — Flash loans: 102% collateral, 0.09% fee, 4-step atomic flow, bidirectional ALEO↔USDCx.

Key Features

Six DeFi Modules: Multi-collateral lending, reverse lending (credits), yield vault, dark pool trading, sealed-bid auctions, flash loans — all fully private.
Private Governance (v3): Iterated from v1 (leaked voter identity) through v2 (hardcoded timing) to v3 where vote() has NO finalize. Configurable 1–30 day voting, delegation, 5 proposal types.
12+ Private Record Types: DebtPosition, LiquidationAuth, PoolShare, GovernanceToken, TradeIntent, FillReceipt, SealedBid, RevealedBid, AuctionWin, AuctionRefund, FlashLoanReceipt, FlashRepayReceipt.
Anti-MEV: Dark pool batch settlement + sealed-bid BHP256 commitments make front-running impossible.

Provable DPS Automation — 7 Bots

All bots run headlessly via Provable DPS with JWT auth, useFeeMaster zero-gas proving, and sequential nonce queue:
Oracle (30min), Interest (1hr), Yield (6hr), Liquidation (1min), Dark Pool (5min), Auction (5min), Flash Oracle (30min).
Oracle aggregates 7 sources (Coinbase, Gate.io, MEXC, XT.com, CoinGecko, CryptoCompare, CoinMarketCap) with median filtering, outlier rejection, and 15% on-chain deviation cap.

Full Stack

Frontend: React 18, Vite, TypeScript, Tailwind — 18 app pages plus landing and docs. Obsidian Ledger dark theme. Shield Wallet with 7-program authorization.
Backend: Express.js with 7 automated bots, 7-source oracle, analytics API. Hosted on Vercel + Render.

DeFi Without Being Watched.
