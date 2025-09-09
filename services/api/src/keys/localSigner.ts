import { ethers } from 'ethers';
import { config } from '../config';

const provider = new ethers.providers.JsonRpcProvider(config.RPC_URL);

export function getLocalSigner() {
  if (!config.PRIVATE_KEY) throw new Error('PRIVATE_KEY not set in env');
  return new ethers.Wallet(config.PRIVATE_KEY, provider);
}

// TODO: Support meta-transactions or user-signed txs via relayers for production
