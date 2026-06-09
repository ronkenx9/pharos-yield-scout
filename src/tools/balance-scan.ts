import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { pharosTestnet, KNOWN_TOKENS } from '../chains.js';

export interface TokenBalance {
  symbol: string;
  address: string;
  raw: bigint;
  formatted: string;
  decimals: number;
  usdValue?: number;
}

export interface WalletBalances {
  address: string;
  native: TokenBalance;
  tokens: TokenBalance[];
  totalUsdValue: number;
  fetchedAt: Date;
}

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

export async function scanWalletBalances(
  walletAddress: string,
  rpcUrl?: string,
): Promise<WalletBalances> {
  const client = createPublicClient({
    chain: pharosTestnet,
    transport: http(rpcUrl ?? process.env.PHAROS_RPC_URL ?? pharosTestnet.rpcUrls.default.http[0]),
  });

  const address = walletAddress as Address;

  // Fetch native ETH balance
  const nativeRaw = await client.getBalance({ address });
  const nativeFormatted = formatUnits(nativeRaw, 18);

  const native: TokenBalance = {
    symbol: 'ETH',
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    raw: nativeRaw,
    formatted: parseFloat(nativeFormatted).toFixed(6),
    decimals: 18,
  };

  // Fetch ERC20 balances in parallel
  const tokenResults = await Promise.allSettled(
    KNOWN_TOKENS.map(async (token) => {
      const raw = await client.readContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      return {
        symbol: token.symbol,
        address: token.address,
        raw,
        formatted: parseFloat(formatUnits(raw, token.decimals)).toFixed(token.decimals === 6 ? 2 : 6),
        decimals: token.decimals,
      } satisfies TokenBalance;
    }),
  );

  const tokens = tokenResults
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .map((r) => r.value as TokenBalance)
    .filter((t) => t.raw > 0n); // Only include non-zero balances

  return {
    address: walletAddress,
    native,
    tokens,
    totalUsdValue: 0, // enriched downstream by price fetcher
    fetchedAt: new Date(),
  };
}
