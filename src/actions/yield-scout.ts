import { z } from 'zod';
import { runYieldScout } from '../tools/yield-scout.js';

export interface ActionExample {
  input: Record<string, any>;
  output: Record<string, any>;
  explanation: string;
}

export interface Action {
  name: string;
  similes: string[];
  description: string;
  examples: ActionExample[][];
  schema: z.ZodType<any>;
  handler: (agent: any, input: Record<string, any>) => Promise<any>;
}

export const pharosYieldScoutAction: Action = {
  name: 'PHAROS_YIELD_SCOUT',
  similes: [
    'scout yield',
    'find yield on pharos',
    'scan pharos wallet for yield',
    'show pharos yield opportunities',
  ],
  description: 'Scans a Pharos wallet for idle capital and surfaces ranked yield opportunities across Pharos DeFi protocols.',
  examples: [
    [
      {
        input: {
          wallet_address: '0x72df0bcd7276f2dFbAc900D1CE63c272C4BCcCED',
        },
        output: {
          status: 'success',
          data: {
            walletAddress: '0x72df0bcd7276f2dFbAc900D1CE63c272C4BCcCED',
            totalValueUsd: 14.2,
            idleCapitalUsd: 14.2,
            topOpportunity: {
              protocol: 'PharosDEX',
              apy: '8.40%',
              token: 'USDC',
            },
          },
          message: 'Yield scan completed successfully.',
        },
        explanation: 'Scans a Pharos testnet wallet and returns idle balance and ranked yield opportunities.',
      },
    ],
  ],
  schema: z.object({
    wallet_address: z.string().describe('The Pharos wallet address to scan'),
    rpc_url: z.string().optional().describe('Optional custom Pharos RPC URL'),
  }),
  handler: async (agent: any, input: Record<string, any>) => {
    const { wallet_address, rpc_url } = input;
    const report = await runYieldScout({
      walletAddress: wallet_address,
      rpcUrl: rpc_url,
    });
    return {
      status: 'success',
      data: report,
      message: 'Yield scan completed successfully.',
    };
  },
};
