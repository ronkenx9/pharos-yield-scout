import { PharosAgentKit, startMcpServer } from 'pharos-agent-kit';
import { pharosYieldScoutAction } from './actions/yield-scout.js';
import dotenv from 'dotenv';

dotenv.config();

const privateKey = process.env.WALLET_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001';
const rpcUrl = process.env.PHAROS_RPC_URL || 'https://atlantic.dplabs-internal.com';

const agent = new PharosAgentKit(privateKey, rpcUrl);

const actions = {
  PHAROS_YIELD_SCOUT: pharosYieldScoutAction as any,
};

async function main() {
  console.error('Starting Pharos Yield Scout MCP Server...');
  await startMcpServer(actions, agent, {
    name: 'pharos-yield-scout',
    version: '1.0.0',
  });
}

main().catch((err) => {
  console.error('Failed to start MCP server:', err);
  process.exit(1);
});
