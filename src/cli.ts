import dotenv from 'dotenv';
import minimist from 'minimist';
import { runYieldScout } from './index.js';

dotenv.config();

async function main() {
  const args = minimist(process.argv.slice(2), {
    string: ['wallet', 'w', 'rpc', 'r'],
  });

  const wallet = args.wallet || args.w;
  const json = args.json || args.j;
  const rpc = args.rpc || args.r;

  if (!wallet) {
    console.error('Error: Wallet address is required. Use --wallet <address>');
    console.error('Example: npm run scout -- --wallet 0xYourWalletAddress');
    process.exit(1);
  }

  try {
    const report = await runYieldScout({
      walletAddress: wallet,
      rpcUrl: rpc,
    });

    if (json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(report.summaryMarkdown);
    }
  } catch (err: any) {
    console.error('Execution failed:', err.message || err);
    process.exit(1);
  }
}

main();
