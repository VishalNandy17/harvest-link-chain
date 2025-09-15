import { ethers } from 'ethers';

// Mock ABI for our smart contract
const FARMER_CONTRACT_ABI = [
  'function listProduce(uint256 id, string memory crop, uint256 quantity, uint256 price) public',
  'function getProduceDetails(uint256 id) public view returns (string memory, uint256, uint256, address, bool)',
  'function verifyProduceOwnership(uint256 id, address farmer) public view returns (bool)'
];

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0xYourContractAddress';

class BlockchainService {
  private provider: ethers.providers.Web3Provider;
  private signer: ethers.providers.JsonRpcSigner;
  private contract: ethers.Contract;

  constructor() {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('Please install MetaMask!');
    }

    this.provider = new ethers.providers.Web3Provider(window.ethereum);
    this.signer = this.provider.getSigner();
    this.contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      FARMER_CONTRACT_ABI,
      this.signer
    );
  }

  async connectWallet(): Promise<string> {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    return accounts[0];
  }

  async listProduce(id: number, crop: string, quantity: number, price: number): Promise<any> {
    const tx = await this.contract.listProduce(id, crop, quantity, price);
    return tx.wait();
  }

  async getProduceDetails(id: number): Promise<{
    crop: string;
    quantity: number;
    price: number;
    owner: string;
    isAvailable: boolean;
  }> {
    const [crop, quantity, price, owner, isAvailable] = await this.contract.getProduceDetails(id);
    return {
      crop,
      quantity: quantity.toNumber(),
      price: parseFloat(ethers.utils.formatEther(price)),
      owner,
      isAvailable
    };
  }

  async verifyOwnership(id: number, farmerAddress: string): Promise<boolean> {
    return await this.contract.verifyProduceOwnership(id, farmerAddress);
  }
}

export const blockchainService = new BlockchainService();
