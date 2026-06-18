# Pharos Yield Scout

> Scan a Pharos wallet for idle capital and surface ranked yield opportunities.

A Pharos agent Skill that reads a wallet, finds undeployed capital, and ranks available yield by APY — with honest data provenance.

```
BALANCE SCAN ──▶ IDLE CAPITAL ──▶ YIELD DISCOVERY ──▶ RANKED REPORT
 native + ERC-20   undeployed $      DeFiLlama (live)    by source, APY, holdings
```

## What it does
1. **Balance scan** — native PHR/ETH + top ERC-20 balances for an address.
2. **Idle vs deployed split** — classifies each holding so "idle" means *truly undeployed*, not the whole wallet.
3. **Yield discovery** — live Pharos pools from DeFiLlama, filtered to held tokens.
4. **Ranked report** — holdings, idle/deployed breakdown, and top opportunities.

## Idle vs deployed (real, not assumed)
The headline claim is "find *idle* capital", so the skill actually distinguishes it. Each token is classified as **idle** (free to put to work) or **deployed** (already in an LP / vault / lending / staked position) via:
1. an explicit registry — `DEPLOYED_TOKEN_ADDRESSES` (comma-separated) plus built-ins, and
2. conservative receipt-token symbol patterns (`LP`, `AMM`, `VAULT`, `STAKED`, `-V2`, `SLP`).

Deployed holdings are **excluded** from idle capital and shown separately, and recommendations size against idle capital only.

## Data provenance (important)
Pharos DeFi is not yet indexed on DeFiLlama, so when no live pools are returned the Skill surfaces a small set of **clearly-labelled simulated** reference points. Every opportunity carries `source: 'live' | 'simulated'`; simulated rows always rank below live data, render with a `(sim)` tag, and recommendations against them are flagged `[SIMULATED — verify before acting]`. Disable them entirely with `INCLUDE_SIMULATED_POOLS=false`. Live data is never presented as anything but live.

## Quickstart
```bash
npm install
cp .env.example .env        # PHAROS_RPC_URL (+ optional keys)
npm run build

npm run scout -- --wallet 0xYourWallet           # human report
npm run scout -- --wallet 0xYourWallet --json     # agent-consumable JSON
npm run mcp                                        # MCP server
```

## Environment
| Var | Required | Purpose |
|---|---|---|
| `PHAROS_RPC_URL` | no (defaults to testnet) | Pharos RPC endpoint |
| `INCLUDE_SIMULATED_POOLS` | no (default `true`) | Set `false` to show live pools only |
| `DEPLOYED_TOKEN_ADDRESSES` | no | Comma-separated addresses to treat as deployed positions |

## Network
Pharos Atlantic testnet — chain id `688689`, RPC `https://atlantic.dplabs-internal.com`, explorer `https://atlantic.pharosscan.xyz`.

## Composition (Phase 2)
Pairs with [`pharos-agent-pay`](https://github.com/ronkenx9/pharos-agent-pay) to charge per scan, and [`pharos-identity-auditor`](https://github.com/ronkenx9/pharos-identity-auditor) to verify a counterparty before deploying capital.

See [SKILL.md](./SKILL.md) for the full action reference. MIT.
