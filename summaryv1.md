# DARA - The Invisible Protocol
## Privacy-First DeFi Suite on Aleo | 14 Contracts | 149 Transitions

DARA is a full-stack decentralized finance protocol built on Aleo where every position, trade, bid, flash loan, and governance vote is encrypted inside zero-knowledge proofs. The protocol deploys 14 smart contracts with 149 transitions and approximately 10 million compiled variables on Aleo Testnet, making it one of the largest single-project deployments on the network.

### Core Architecture
The protocol operates across three integrated layers: 14 Leo smart contracts handling lending, borrowing, multi-asset dark pool trading, sealed-bid auctions, flash loans, yield vaults, and private governance; a React frontend with Shield Wallet integration across all 14 programs; and an Express.js backend running 7 automated bots via Provable DPS with zero-gas proving.

### Multi-Asset Dark Pool (4 Markets)
Four independent dark pool markets (ALEO, BTC, ETH, SOL vs USDCx) run batch-based TWAP settlement with 2-of-3 threshold operator consensus. Each market is a standalone contract with 16 transitions, independent oracle feeds from 7 sources (Coinbase, Binance, MEXC, XT.com, CoinGecko, CoinMarketCap, CryptoCompare), limit orders, partial fills with residual carry-forward, and configurable BPS fees. Settlement requires two separate operator keys - no single party can manipulate prices. A test token faucet allows any wallet to claim BTC, ETH, or SOL for dark pool trading.

### Privacy Model
All user data lives in 15+ encrypted record types including DebtPosition, OrderCommitment, OrderAuth, FillReceipt, ResidualOrder, SealedBid, FlashLoanReceipt, and GovernanceToken. Borrower addresses are BHP256-hashed. Health factors are computed client-side only. The governance vote() transition has NO finalize function, leaving zero on-chain trace. Only aggregate protocol metrics remain public for solvency verification.

### Automation
Seven bots run 24/7 via Provable DPS with JWT authentication and useFeeMaster zero-gas proving: Oracle (30 min, 7-source median per asset), Interest (1 hr), Yield (6 hr), Liquidation (1 min scanning), Dark Pool (5 min with 15s catch-up mode when deviation exceeds 20%), Auction (5 min), and Flash Oracle (30 min). The dark pool bot manages the complete settlement pipeline across all 4 markets: oracle update, propose, approve, match, and advance.

### Key Parameters
50% LTV ratio, 5% liquidation bonus, 0.5% origination fee, 0.09% flash loan fee (lowest on Aleo), 5 BPS configurable dark pool trading fee, 15% max oracle deviation per update, kink interest model (base 2% + slope1 4% + slope2 75% at 80% utilization), 102% flash collateral ratio, and 6-decimal precision (1,000,000 = 1.0 token) across all contracts.

Live: dara-lend.vercel.app | GitHub: github.com/NOVA1358X/Dara-lend