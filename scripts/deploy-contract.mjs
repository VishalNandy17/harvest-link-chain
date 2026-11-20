import { ethers } from 'ethers';
import { readFileSync } from 'fs';

const RPC = 'https://eth-sepolia.g.alchemy.com/v2/alch_85BacZtapOQPfIwVVcp9v';
const WALLET = '0x01a35D2A021D101A03C3d5f4bD4235A6643614D9';
const KEY = '0xf096135617c8ec6c3d82467be175e099663e4e13aa99cb534023994bb1f14469';

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(KEY, provider);

const artifact = JSON.parse(readFileSync('./artifacts/contracts/HarvestLink.sol/HarvestLink.json', 'utf8'));
const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

console.log('=== HarvestLink Deployment ===');
console.log('Network: Sepolia (11155111)');
console.log('Deployer:', WALLET);

const bal = await provider.getBalance(WALLET);
console.log('Balance:', ethers.formatEther(bal), 'ETH');

const feeData = await provider.getFeeData();
console.log('Base fee (gwei):', ethers.formatUnits(feeData.gasPrice, 'gwei'));

// Use 20M gas limit (well under 200M block limit, well over the 17.9M estimate)
// This ensures the tx won't revert due to OOG
const deployTx = await factory.getDeployTransaction(WALLET);
const nonce = await provider.getTransactionCount(WALLET);

const tx = {
  ...deployTx,
  gasLimit: 20_000_000n,
  maxFeePerGas: feeData.maxFeePerGas,
  maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
  nonce,
  chainId: 11155111n,
};

console.log('\nSending deployment tx with 20M gas limit...');
const sentTx = await wallet.sendTransaction(tx);
console.log('Tx hash:', sentTx.hash);
console.log('Waiting for confirmation...');

const receipt = await sentTx.wait(1);
console.log('Status:', receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED');
console.log('Gas used:', receipt.gasUsed.toString());
console.log('Block:', receipt.blockNumber);

if (receipt.status === 1 && receipt.contractAddress) {
  console.log('\n🎉 CONTRACT DEPLOYED!');
  console.log('Contract address:', receipt.contractAddress);
  console.log('Etherscan:', 'https://sepolia.etherscan.io/address/' + receipt.contractAddress);
  
  // Write deployment info
  import('fs').then(({ writeFileSync, mkdirSync }) => {
    mkdirSync('deployments', { recursive: true });
    writeFileSync('deployments/11155111.json', JSON.stringify({
      contractAddress: receipt.contractAddress,
      deploymentBlock: receipt.blockNumber,
      deploymentTx: sentTx.hash,
      deployer: WALLET,
      chainId: 11155111,
      network: 'sepolia',
      timestamp: new Date().toISOString(),
    }, null, 2));
    console.log('Saved to deployments/11155111.json');
  });
} else {
  console.error('Deployment failed — status 0');
}
