import { ethers } from 'ethers';
import abi from './abis/SupplyChainRegistry.json';

export function getProvider() {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return new ethers.providers.Web3Provider((window as any).ethereum);
  }
  return new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
}

export function getSigner() {
  const provider = getProvider();
  return provider.getSigner();
}

export function getContract(address: string) {
  const provider = getProvider();
  return new ethers.Contract(address, abi, provider);
}

export function formatWeiToKgPrice(wei: string | number) {
  return parseFloat(ethers.utils.formatUnits(wei, 'ether'));
}

export function fromWei(wei: string | number) {
  return ethers.utils.formatUnits(wei, 'ether');
}
