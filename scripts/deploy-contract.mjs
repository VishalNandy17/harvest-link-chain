import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { ContractFactory, id, JsonRpcProvider, Wallet } from 'ethers';

const rpcUrl = process.env.DEPLOY_RPC_URL;
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
if (!rpcUrl || !privateKey) {
  throw new Error('Set DEPLOY_RPC_URL and DEPLOYER_PRIVATE_KEY in the local shell before deployment.');
}

const artifactPath = resolve('artifacts/contracts/HarvestLink.sol/HarvestLink.json');
const artifact = JSON.parse(await readFile(artifactPath, 'utf8'));
const provider = new JsonRpcProvider(rpcUrl);
const wallet = new Wallet(privateKey, provider);
const network = await provider.getNetwork();
const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
const contract = await factory.deploy(wallet.address);
await contract.waitForDeployment();
const deploymentReceipt = await contract.deploymentTransaction().wait();

const address = await contract.getAddress();
const roleEnv = {
  FARMER_ROLE: 'BOOTSTRAP_FARMER_WALLETS',
  PROCUREMENT_ROLE: 'BOOTSTRAP_PROCUREMENT_WALLETS',
  WAREHOUSE_ROLE: 'BOOTSTRAP_WAREHOUSE_WALLETS',
  TRANSPORTER_ROLE: 'BOOTSTRAP_TRANSPORTER_WALLETS',
  DISTRIBUTOR_ROLE: 'BOOTSTRAP_DISTRIBUTOR_WALLETS',
  RETAILER_ROLE: 'BOOTSTRAP_RETAILER_WALLETS',
  AUDITOR_ROLE: 'BOOTSTRAP_AUDITOR_WALLETS',
};
const configuredContract = contract.connect(wallet);
for (const [role, envName] of Object.entries(roleEnv)) {
  const accounts = (process.env[envName] ?? '').split(',').map(value => value.trim()).filter(Boolean);
  for (const account of accounts) {
    const tx = await configuredContract.setRole(id(role), account, true);
    await tx.wait();
  }
}
const outputPath = resolve(`deployments/${network.chainId}.json`);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ chainId: network.chainId.toString(), contractAddress: address, deployer: wallet.address, deploymentBlock: deploymentReceipt.blockNumber, deployedAt: new Date().toISOString() }, null, 2)}\n`, { flag: 'w' });
console.log(`HarvestLink deployed: chainId=${network.chainId} address=${address}`);
console.log(`Saved deployment metadata to ${outputPath}`);
