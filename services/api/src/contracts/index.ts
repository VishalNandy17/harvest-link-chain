import { ethers } from 'ethers';
import { config } from '../config';
import abi from './SupplyChainRegistry.json';

const provider = new ethers.providers.JsonRpcProvider(config.RPC_URL);
const contract = new ethers.Contract(config.CONTRACT_ADDRESS, abi, provider);

export { provider, contract };
