import axios from 'axios';
import { scanWalletBalances, type TokenBalance } from './balance-scan.js';

export interface YieldOpportunity {
  protocol: string;
  apy: string;
  apyValue: number;
  token: string;
  tvlUsd: number;
  poolName: string;
  link?: string;
  /**
   * Provenance of the data point:
   * - 'live': sourced from a real, queryable API (DeFiLlama) for the Pharos chain
   * - 'simulated': illustrative placeholder for protocols not yet indexed on testnet
   */
  source: 'live' | 'simulated';
}

export interface YieldScoutReport {
  walletAddress: string;
  totalValueUsd: number;
  idleCapitalUsd: number;
  topOpportunity?: YieldOpportunity;
  opportunities: YieldOpportunity[];
  balances: {
    symbol: string;
    amount: string;
    usdValue: number;
    address: string;
  }[];
  summaryMarkdown: string;
}

// Fallback price map for assets if price API fails or for testnet tokens
const FALLBACK_PRICES: Record<string, number> = {
  ETH: 3000.0,
  WETH: 3000.0,
  USDC: 1.0,
  USDT: 1.0,
  WBTC: 65000.0,
  WPHRS: 0.5,
  PHRS: 0.5,
};

async function getPrice(symbol: string): Promise<number> {
  const normSymbol = symbol.toUpperCase();
  // Try to get live prices from DeFiLlama coin price API (free, no key required)
  try {
    const cgIdMap: Record<string, string> = {
      ETH: 'ethereum',
      WETH: 'ethereum',
      USDC: 'usd-coin',
      USDT: 'tether',
      WBTC: 'bitcoin',
    };
    
    const id = cgIdMap[normSymbol];
    if (id) {
      const url = `https://coins.llama.fi/prices/current/coingecko:${id}`;
      const response = await axios.get(url, { timeout: 3000 });
      const price = response.data?.coins?.[`coingecko:${id}`]?.price;
      if (typeof price === 'number') {
        return price;
      }
    }
  } catch (err) {
    // Ignore and use fallback
  }
  return FALLBACK_PRICES[normSymbol] ?? 0.0;
}

export async function runYieldScout(options: {
  walletAddress: string;
  rpcUrl?: string;
}): Promise<YieldScoutReport> {
  const { walletAddress, rpcUrl } = options;

  // 1. Scan balances
  const rawBalances = await scanWalletBalances(walletAddress, rpcUrl);

  // 2. Fetch prices and enrich balances
  const balancesList: YieldScoutReport['balances'] = [];
  let totalValueUsd = 0;

  // Enrich native balance
  const nativePrice = await getPrice(rawBalances.native.symbol);
  const nativeUsd = parseFloat(rawBalances.native.formatted) * nativePrice;
  totalValueUsd += nativeUsd;
  balancesList.push({
    symbol: rawBalances.native.symbol,
    amount: rawBalances.native.formatted,
    usdValue: nativeUsd,
    address: rawBalances.native.address,
  });

  // Enrich token balances
  for (const token of rawBalances.tokens) {
    const tokenPrice = await getPrice(token.symbol);
    const tokenUsd = parseFloat(token.formatted) * tokenPrice;
    totalValueUsd += tokenUsd;
    balancesList.push({
      symbol: token.symbol,
      amount: token.formatted,
      usdValue: tokenUsd,
      address: token.address,
    });
  }

  // Idle capital is defined as the total value of tokens sitting idle in the wallet
  // (In a full protocol indexer, we would subtract tokens locked in LP/farming,
  // but for a wallet balance scan, the scanned balance represents what is undeployed).
  const idleCapitalUsd = totalValueUsd;

  // 3. Discover yield opportunities on Pharos
  let rawPools: any[] = [];
  try {
    const llamaRes = await axios.get('https://yields.llama.fi/pools', { timeout: 5000 });
    rawPools = llamaRes.data?.data || [];
  } catch (err) {
    // Fail silently, fall back to mock pools
  }

  // Filter real pools for Pharos
  const realOpportunities: YieldOpportunity[] = rawPools
    .filter((p: any) => p.chain?.toLowerCase() === 'pharos')
    .map((p: any) => ({
      protocol: p.project || 'Unknown',
      apy: `${(p.apy || 0).toFixed(2)}%`,
      apyValue: p.apy || 0,
      token: p.symbol || 'USDC',
      tvlUsd: p.tvlUsd || 0,
      poolName: p.poolMeta || p.symbol || 'Pool',
      link: `https://defillama.com/yields/pool/${p.pool}`,
      source: 'live' as const,
    }));

  // Illustrative ecosystem opportunities. Pharos DeFi is not yet indexed on
  // DeFiLlama, so when no live pools are returned we surface a small set of
  // clearly-labelled SIMULATED reference points so an agent always has
  // something to reason about. These are never presented as live data —
  // every entry carries source: 'simulated' and is tagged (sim) in output.
  // Opt out entirely with INCLUDE_SIMULATED_POOLS=false.
  const includeSimulated = (process.env.INCLUDE_SIMULATED_POOLS ?? 'true').toLowerCase() !== 'false';
  const simulatedOpportunities: YieldOpportunity[] = includeSimulated
    ? [
        { protocol: 'PharosDEX', apy: '8.40%', apyValue: 8.40, token: 'USDC', poolName: 'USDC/ETH LP', tvlUsd: 2100000, source: 'simulated' },
        { protocol: 'PharSwap', apy: '6.10%', apyValue: 6.10, token: 'USDC', poolName: 'USDC Vault', tvlUsd: 840000, source: 'simulated' },
        { protocol: 'PharLend', apy: '4.80%', apyValue: 4.80, token: 'USDC', poolName: 'Lending Market USDC', tvlUsd: 5200000, source: 'simulated' },
        { protocol: 'PharLend', apy: '4.50%', apyValue: 4.50, token: 'USDT', poolName: 'Lending Market USDT', tvlUsd: 3100000, source: 'simulated' },
        { protocol: 'PharosDEX', apy: '9.20%', apyValue: 9.20, token: 'WBTC', poolName: 'WBTC/ETH LP', tvlUsd: 1500000, source: 'simulated' },
      ]
    : [];

  // Combine real and simulated opportunities (live always ranked ahead of simulated)
  const allOpportunities = [...realOpportunities, ...simulatedOpportunities];

  // Filter and sort opportunities based on tokens actually held in the wallet
  // (If wallet has USDC, prioritize USDC pools, etc.)
  const heldTokens = new Set(balancesList.map(b => b.symbol));
  
  // Rank pools: first priority is pools matching tokens the user holds
  // Second priority is general pools
  const rankedOpportunities = allOpportunities.sort((a, b) => {
    // Live data always ranks ahead of simulated reference points
    const aLive = a.source === 'live' ? 1 : 0;
    const bLive = b.source === 'live' ? 1 : 0;
    if (aLive !== bLive) {
      return bLive - aLive;
    }
    const aHeld = heldTokens.has(a.token) ? 1 : 0;
    const bHeld = heldTokens.has(b.token) ? 1 : 0;
    if (aHeld !== bHeld) {
      return bHeld - aHeld; // Prioritize held tokens
    }
    return b.apyValue - a.apyValue; // Sort by APY descending
  });

  const topOpportunity = rankedOpportunities[0];

  // 4. Generate summary report in markdown
  const holdingLines = balancesList
    .map(b => `  ${b.symbol.padEnd(8)} ${parseFloat(b.amount).toFixed(4).padStart(8)}    ~$${Math.round(b.usdValue).toLocaleString()}`)
    .join('\n');

  const opportunityLines = rankedOpportunities
    .slice(0, 5)
    .map((o, idx) => {
      const tag = o.source === 'simulated' ? ' (sim)' : '';
      return `  ${idx + 1}. ${o.protocol.padEnd(10)} ${o.poolName.padEnd(16)}    ${o.apy.padStart(6)} APY    tvl $${(o.tvlUsd / 1e6).toFixed(1)}M${tag}`;
    })
    .join('\n');

  const hasLive = rankedOpportunities.some(o => o.source === 'live');
  const recommendation = topOpportunity && idleCapitalUsd > 0
    ? `  → Deploy $${Math.round(idleCapitalUsd).toLocaleString()} in ${topOpportunity.protocol} ${topOpportunity.poolName} for ~$${Math.round((idleCapitalUsd * topOpportunity.apyValue) / 100)}/yr at current rates${topOpportunity.source === 'simulated' ? '  [SIMULATED — verify before acting]' : ''}`
    : '  → No clear deployment recommendation at this time.';
  const provenanceNote = hasLive
    ? ''
    : '\n  NOTE: No live Pharos pools indexed yet — opportunities below are simulated reference points.';

  const summaryMarkdown = `PHAROS YIELD SCOUT — ${walletAddress}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOLDINGS
${holdingLines}
  Total           ~$${Math.round(totalValueUsd).toLocaleString()}

IDLE CAPITAL
  Total           ~$${Math.round(idleCapitalUsd).toLocaleString()}  (undeployed in wallet)

YIELD OPPORTUNITIES  (ranked by source, APY, and wallet holdings)${provenanceNote}
${opportunityLines}

${recommendation}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  return {
    walletAddress,
    totalValueUsd,
    idleCapitalUsd,
    topOpportunity,
    opportunities: rankedOpportunities,
    balances: balancesList,
    summaryMarkdown,
  };
}
