---
name: pharos-yield-scout
version: 1.0.0
description: Scans a Pharos wallet for idle capital and surfaces ranked yield opportunities across Pharos DeFi protocols. Returns token balances, identifies undeployed stablecoins, and ranks available yield options by APY using live DeFiLlama data.
authors:
  - roninxx
tags:
  - pharos
  - defi
  - yield
  - wallet
  - onchain
frameworks:
  - claude-code
  - codex
  - mcp
---

# Pharos Yield Scout

Scan a wallet on Pharos, find idle capital, and surface the best yield opportunities available right now.

## When to use this skill

Use this skill when a user asks any of:
- "What's earning yield in my wallet?"
- "Where should I put my idle USDC on Pharos?"
- "What DeFi opportunities are available on Pharos?"
- "Scan [address] for idle capital"
- "What's my Pharos portfolio doing?"
- "Find yield for my Pharos wallet"

## What this skill does

1. **Balance scan** — fetches native PHR/ETH balance and top ERC20 token balances for a given wallet address on Pharos testnet
2. **Idle capital detection** — identifies tokens sitting in the wallet without interacting with known DeFi contracts (LP positions, lending markets, vaults)
3. **Yield discovery** — fetches live protocol data from DeFiLlama for Pharos-native protocols, filtered for the tokens the wallet holds
4. **Ranked report** — outputs a clean summary: current holdings, idle capital estimate, and top yield opportunities ranked by APY

## How to run

### Prerequisites

```bash
cd pharos-yield-scout
npm install
cp .env.example .env
# Fill in: PHAROS_RPC_URL, WALLET_PRIVATE_KEY (optional), COINGECKO_API_KEY (optional)
```

### CLI usage

```bash
# Scan a wallet
npm run scout -- --wallet 0xYourWalletAddress

# Output as JSON (for agent consumption)
npm run scout -- --wallet 0xYourWalletAddress --json

# Scan with custom RPC
npm run scout -- --wallet 0xYourWalletAddress --rpc https://atlantic.dplabs-internal.com
```

### Programmatic usage

```typescript
import { runYieldScout } from './src/index';

const report = await runYieldScout({
  walletAddress: '0xYourWalletAddress',
  rpcUrl: 'https://atlantic.dplabs-internal.com',
});

console.log(report.summary);
// {
//   totalValueUsd: 1420.50,
//   idleCapitalUsd: 800.00,
//   topOpportunity: { protocol: 'PharosDEX', apy: '8.4%', token: 'USDC' },
//   opportunities: [...]
// }
```

### As an MCP tool

The skill exposes a `pharos_yield_scout` MCP action. Input schema:

```json
{
  "wallet_address": "0x...",
  "include_low_value": false,
  "min_apy": 1.0
}
```

## Network

| Network | Chain ID | RPC | Explorer |
|---------|----------|-----|---------|
| Pharos Atlantic Testnet | 688689 | https://atlantic.dplabs-internal.com | https://atlantic.pharosscan.xyz |
| Pharos Mainnet | 1672 | configure via env | — |

## Environment variables

```
PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
COINGECKO_API_KEY=                    # optional — improves price data
DEFILLAMA_BASE_URL=https://api.llama.fi  # default
```

## Output format

```
PHAROS YIELD SCOUT — 0x1234...abcd
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOLDINGS
  ETH       0.42    ~$1,260
  USDC    800.00    ~$800
  Total           ~$2,060

IDLE CAPITAL
  USDC    800.00    ~$800  (not deployed in any protocol)

YIELD OPPORTUNITIES  (ranked by APY)
  1. PharosDEX USDC/ETH LP    8.4% APY    tvl $2.1M
  2. PharSwap USDC vault       6.1% APY    tvl $840K
  3. Lending market USDC       4.8% APY    tvl $5.2M

  → Deploy $800 USDC into PharosDEX for ~$67/yr at current rates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Design notes

Built on top of `pharos-agent-kit` for balance fetching and `viem` for direct RPC calls. Yield data is pulled live from DeFiLlama's `/protocols` and `/pools` endpoints filtered to the Pharos chain. Idle capital is detected by comparing wallet token holdings against a registry of known Pharos DeFi contract addresses — tokens sitting outside these contracts are flagged as idle.

Core invariant: **this skill never holds keys, signs transactions, or moves funds**. It is read-only. All data is fetched from public RPC and DeFiLlama.
