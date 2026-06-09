import { defineChain } from 'viem';

export const pharosTestnet = defineChain({
  id: 688689,
  name: 'Pharos Atlantic Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://atlantic.dplabs-internal.com'] },
    public: { http: ['https://atlantic.dplabs-internal.com'] },
  },
  blockExplorers: {
    default: {
      name: 'Pharos Scan',
      url: 'https://atlantic.pharosscan.xyz',
    },
  },
  testnet: true,
});

export const pharosMainnet = defineChain({
  id: 1672,
  name: 'Pharos',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.PHAROS_MAINNET_RPC_URL ?? ''] },
    public: { http: [process.env.PHAROS_MAINNET_RPC_URL ?? ''] },
  },
  testnet: false,
});

// Known Pharos DeFi contract addresses (testnet)
// Add new protocol addresses here as the ecosystem grows
export const KNOWN_DEFI_CONTRACTS: Record<string, string> = {
  // Real addresses / placeholders
  PHAROS_DEX_ROUTER: '0xd579c2FF374fCf31a380f40fc7876Bea959e42e1', // Using Multicall3 or others as placeholders
  PHAROS_LENDING_MARKET: '0xBF2928a5969F930EbAAe06F2f984a544D8514cb3',
  PHAROS_VAULT_FACTORY: '0x5A74dC7aeacC22e325240838eDDcf1A96E9BC5c6',
};

// Common ERC20 tokens on Pharos Atlantic testnet
export const KNOWN_TOKENS: Array<{ symbol: string; address: `0x${string}`; decimals: number }> = [
  { symbol: 'USDC', address: '0x72df0bcd7276f2dFbAc900D1CE63c272C4BCcCED', decimals: 6 },
  { symbol: 'USDT', address: '0xD4071393f8716661958F766DF660033b3d35fD29', decimals: 6 },
  { symbol: 'WETH', address: '0x4E28826d32F1C398DED160DC16Ac6873357d048f', decimals: 18 },
  { symbol: 'WBTC', address: '0x8275c526d1bCEc59a31d673929d3cE8d108fF5c7', decimals: 8 },
  { symbol: 'WPHRS', address: '0x3019B247381c850ab53Dc0EE53bCe7A07Ea9155f', decimals: 18 },
];

