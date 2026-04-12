DARA — The Invisible Protocol
Encrypted DeFi Fortress on Aleo | 13 Contracts · 149 Transitions · ~10M ZK Variables
Every position sealed. Every trade hidden. Every vote untraceable.

Full-stack private DeFi on Aleo: lending, borrowing, 4-market dark pool (ALEO/BTC/ETH/SOL), sealed-bid auctions, flash loans, yield vault, and governance — all encrypted in ZK proofs.

live: https://dara-lend.vercel.app
docs: https://dara-lend.vercel.app/docs
video: https://youtu.be/UiHQ59vRUGg
━━━━━━━━━━━━━━━━━━━━━━━━
◆ 13 CONTRACTS · 149 TX
━━━━━━━━━━━━━━━━━━━━━━━━

[1] dara_lend_v8 · 12 tx — Core lending. ALEO→USDCx at 50% LTV. Kink rate (2%/4%/75%, 80% optimal). 7-source oracle (Coinbase, Binance, MEXC, XT.com, CoinGecko, CryptoCompare, CMC).

[2] dara_lend_v8_credits · 12 tx — Reverse lending. USDCx→borrow ALEO. Own oracle. Bidirectional liquidation.

[3] dara_lend_v8_vault · 10 tx — Yield vault. PoolShare records. ZK private transfers.

[4] dara_lend_v8_gov_v3 · 12 tx — Private DAO. vote() NO finalize — zero trace. 1–30 day voting, delegation, 20% quorum.

[5–8] Dark Pool · 4 markets · 16 tx each:
  dark_pool_v3 ALEO/USDCx · dp_btc_v5 BTC/USDCx (÷1000) · dp_eth_v5 ETH/USDCx (÷100) · dp_sol_v5 SOL/USDCx (÷10)
  Batch TWAP, 2-of-3 threshold operators, limit orders, partial fills, residual carry-forward, BPS fees, anti-MEV. Independent 7-source oracle each.

[9–11] Faucets · 6 tx each:
  test_btc_v1 · test_eth_v1 · test_sol_v1 — 10 tokens/claim, 5/day per wallet.

[12] dara_auction_v1 · 10 tx — Sealed-bid auction. BHP256: hash(hash(bid)+secret). 15min–7day.

[13] dara_flash_v1 · 11 tx — Flash loans. 102% collateral, 0.09% fee. ALEO↔USDCx. 4-step atomic.

━━━━━━━━━━━━━━━━━━━━━━━━
◆ 15+ ENCRYPTED RECORDS
━━━━━━━━━━━━━━━━━━━━━━━━

DebtPosition · PoolShare · GovernanceToken · OrderCommitment · OrderAuth · FillReceipt · ResidualOrder · SealedBid · AuctionWin · FlashLoanReceipt
Health factors client-side only. Aggregates on-chain for solvency.

7 Bots · Provable DPS (JWT · zero-gas · nonce queue):
Oracle 30min 7-source median · Interest 1hr · Yield 6hr · Liquidation 1min · Dark Pool 5min (pipeline: oracle→propose→approve→match→advance ×4 markets) · Auction 5min · Flash Oracle 30min

━━━━━━━━━━━━━━━━━━━━━━━━
◆ KEY PARAMETERS
━━━━━━━━━━━━━━━━━━━━━━━━

50% LTV · 5% liq bonus · 0.5% origination · 0.09% flash · 5 BPS dark pool · 15% max oracle dev · 102% flash collateral · 6-decimal (1M = 1.0)

Leo 4.0 · React 18 · Vite · TypeScript · Tailwind · Express.js · Provable DPS · Shield Wallet · Vercel + Render

DeFi Without Being Watched.