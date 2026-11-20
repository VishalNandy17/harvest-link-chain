import { ethers } from 'ethers';
import { readFileSync } from 'fs';

const RPC = 'https://eth-sepolia.g.alchemy.com/v2/alch_85BacZtapOQPfIwVVcp9v';
const WALLET = '0x01a35D2A021D101A03C3d5f4bD4235A6643614D9';
const KEY = '0xf096135617c8ec6c3d82467be175e099663e4e13aa99cb534023994bb1f14469';

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(KEY, provider);

const artifact = JSON.parse(readFileSync('./artifacts/contracts/HarvestLink.sol/HarvestLink.json', 'utf8'));
const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

// Get current block gas limit
const block = await provider.getBlock('latest');
console.log('Current Sepolia block gas limit:', block.gasLimit.toString());
console.log('Current block number:', block.number);

const deployTx = await factory.getDeployTransaction(WALLET);

// Try eth_call first (simulation) — this tells us if it would succeed
console.log('\nRunning eth_call simulation...');
try {
  const result = await provider.call(deployTx);
  console.log('eth_call OK — bytecode length returned:', result.length / 2 - 1, 'bytes');
} catch (err) {
  console.error('eth_call FAILED:', err.message);
}

// Now try with a reasonable manual gas override of 5M
console.log('\nTrying gas estimate with manual override 5_000_000...');
try {
  const result = await provider.call({ ...deployTx, gasLimit: 5_000_000n });
  console.log('5M gas call OK — length:', result.length);
} catch (err) {
  console.error('5M gas call failed:', err.message.substring(0, 200));
}

// Try 3M
console.log('\nTrying 3_000_000...');
try {
  const result = await provider.call({ ...deployTx, gasLimit: 3_000_000n });
  console.log('3M gas call OK');
} catch (err) {
  console.error('3M gas call failed:', err.message.substring(0, 200));
}

// Try 2M
console.log('\nTrying 2_000_000...');
try {
  const result = await provider.call({ ...deployTx, gasLimit: 2_000_000n });
  console.log('2M gas call OK');
} catch (err) {
  console.error('2M gas call failed:', err.message.substring(0, 200));
}
