# DARA Lend

**Borrow Without Being Watched.**

DARA Lend is a privacy-first decentralized lending protocol built on [Aleo](https://aleo.org). Users supply ALEO as collateral and borrow against it — with all position data encrypted inside zero-knowledge proofs.

Built for the **Aleo Privacy Buildathon Wave 3**.

---

## Why DARA Lend?

On transparent chains like Ethereum, lending protocols (Aave, Compound) expose every user's collateral, debt, and liquidation price. This creates MEV vulnerabilities where bots manipulate prices to trigger liquidations.

DARA Lend eliminates this entirely using Aleo's privacy-by-default architecture:

- **Collateral amounts** — encrypted in private records
- **Debt sizes** — encrypted in private records
- **Health factors** — computed client-side, never on-chain
- **Liquidation prices** — invisible to MEV bots

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PRIVATE (Records)                     │
│  CollateralReceipt · DebtPosition · LiquidationAuth     │
│  RepaymentReceipt · LiquidationReceipt                  │
│  → Only the owner can decrypt these                     │
├─────────────────────────────────────────────────────────┤
│                    PUBLIC (Mappings)                      │
│  Total TVL · Total Borrowed · Loan Count                │
│  Oracle Price · Solvency Commitment                     │
│  → Aggregate data, no individual positions              │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
dara-lend/
├── contract/          Leo smart contract (dara_lend_v1.aleo)
├── frontend/          React + TypeScript + Tailwind frontend
├── backend/           Express API server + oracle price updater
├── scripts/           Deployment and testing scripts
└── docs/              Architecture and API documentation
```

## Quick Start

### Prerequisites

- [Leo](https://docs.leo-lang.org/) (latest)
- [snarkOS](https://github.com/ProvableHQ/snarkOS)
- [Node.js](https://nodejs.org/) 18+
- [Shield Wallet](https://shield.app) browser extension

### 1. Deploy the Contract

```bash
cd contract/dara_lend_v1
cp .env.example .env
# Edit .env with your private key and admin address

cd ../../scripts
./deploy.sh
./initialize.sh
```

### 2. Start the Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
npm install
npm run dev
```

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Smart Contract

**Program ID:** `dara_lend_v1.aleo`

### Transitions

| Transition | Description |
|---|---|
| `initialize` | Set up protocol admin and initial oracle price |
| `update_oracle_price` | Admin-only oracle price update |
| `supply_collateral` | Lock ALEO credits as encrypted collateral |
| `borrow` | Borrow ALEO against encrypted collateral position |
| `repay` | Repay debt and reclaim collateral |
| `liquidate` | Liquidate underwater positions (orchestrator only) |
| `withdraw_collateral` | Withdraw unlocked collateral |

### Parameters

- **LTV Ratio:** 70% (700,000 / 1,000,000)
- **Liquidation Threshold:** 80% (800,000 / 1,000,000)
- **Min Collateral:** 0.1 ALEO (100,000 microcredits)
- **Precision:** 6 decimals (1,000,000)

## Cross-Chain

DARA Lend supports cross-chain collateral supply via [NEAR Intents](https://docs.near-intents.org), integrated natively through [Shield Wallet](https://shield.app). Users can swap assets from Ethereum, Solana, and 35+ other chains directly into their DARA Lend positions.

## Tech Stack

- **Smart Contract:** Leo (Aleo)
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend:** Node.js, Express, TypeScript
- **Wallet:** Shield Wallet (Aleo-native)
- **Data:** On-chain mappings via Aleo Testnet API

## Documentation

See the [docs/](./docs/) directory for detailed documentation:

- [Architecture](./docs/ARCHITECTURE.md)
- [Privacy Model](./docs/PRIVACY_MODEL.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [API Reference](./docs/API.md)
- [Testing Guide](./docs/TESTING.md)

## License

MIT

---

Built with privacy in mind for the Aleo Privacy Buildathon Wave 3.
