/**
 * Classifies a held token as *idle* (undeployed capital, free to put to work) or
 * *deployed* (already in a yield position — an LP token, vault share, lending
 * receipt, or staked derivative). Subtracting deployed balances is what makes
 * "idle capital" mean what it says, rather than counting the whole wallet.
 *
 * Detection sources, in order:
 *   1. Explicit registry — DEPLOYED_TOKEN_ADDRESSES (comma-separated) + built-ins.
 *   2. Symbol heuristics — LP / AMM / VAULT / STAKED receipt-token patterns.
 * Anything not matched is treated as idle.
 */

// Built-in known position/receipt tokens on Pharos (extend as protocols ship).
const KNOWN_DEPLOYED_ADDRESSES: string[] = [];

function registryAddresses(): Set<string> {
  const fromEnv = (process.env.DEPLOYED_TOKEN_ADDRESSES ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...KNOWN_DEPLOYED_ADDRESSES.map((a) => a.toLowerCase()), ...fromEnv]);
}

// Receipt-token symbol patterns. Conservative on purpose — false positives would
// hide genuinely idle capital.
const DEPLOYED_SYMBOL_PATTERNS = [
  /(^|[^A-Z])LP([^A-Z]|$)/i, // "LP", "USDC-LP", "ETH/USDC LP"
  /AMM/i,
  /VAULT/i,
  /STAKED/i,
  /-V2$/i, // Uniswap-style pair tokens
  /^SLP$/i, // Sushi LP
];

export interface PositionClass {
  deployed: boolean;
  reason: string;
}

export function classifyPosition(token: { symbol: string; address: string }): PositionClass {
  if (registryAddresses().has(token.address.toLowerCase())) {
    return { deployed: true, reason: 'registry' };
  }
  for (const re of DEPLOYED_SYMBOL_PATTERNS) {
    if (re.test(token.symbol)) {
      return { deployed: true, reason: `symbol:${token.symbol}` };
    }
  }
  return { deployed: false, reason: 'idle' };
}
