import { ethers } from 'ethers';
import fs from 'fs';

const rpcUrl = 'https://eth-sepolia.g.alchemy.com/v2/alch_85BacZtapOQPfIwVVcp9v';
const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet('0xf096135617c8ec6c3d82467be175e099663e4e13aa99cb534023994bb1f14469', provider);

const artifact = JSON.parse(fs.readFileSync('artifacts/contracts/HarvestLink.sol/HarvestLink.json', 'utf8'));
const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
const tx = await factory.getDeployTransaction(wallet.address);

for (const limit of [26000000, 27000000, 28000000, 29000000, 30000000]) {
  try {
    const res = await provider.send('eth_call', [{ ...tx, gas: '0x' + limit.toString(16) }, 'latest']);
    console.log(`gasLimit ${limit}: SUCCESS!`);
    break;
  } catch (e) {
    console.log(`gasLimit ${limit}: FAILED`);
  }
}
