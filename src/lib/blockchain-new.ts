import { ethers, type BrowserProvider, type Contract, type JsonRpcSigner } from 'ethers';
import HarvestLinkABI from '../contracts/HarvestLink.json';

// Contract address (replace with your deployed contract address)
const CONTRACT_ADDRESS = '0x1234...';

// Event types
type BlockchainEventType = 'ProductCreated' | 'BatchCreated' | 'OwnershipTransferred' | 'StatusUpdated';

// Interfaces
export interface BlockchainEvent {
  type: BlockchainEventType;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  data: any;
}

export interface EventFilter {
  fromBlock?: number;
  toBlock?: number | 'latest';
  filter?: any;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  imageHash: string;
  farmer: string;
  currentOwner: string;
  price: string;
  createdAt: number;
  status: number;
  certificates: string[];
}

export interface Batch {
  id: number;
  productIds: number[];
  currentHandler: string;
  createdAt: number;
  location: string;
  status: number;
}

// Singleton service for blockchain interactions
class BlockchainService {
  private static instance: BlockchainService;
  private provider: BrowserProvider | null = null;
  private contract: Contract | null = null;
  private eventListeners: { [key: string]: (event: BlockchainEvent) => void } = {};
  private eventHistory: BlockchainEvent[] = [];
  private isListening = false;

  private constructor() {}

  public static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }

  private async getProvider(): Promise<BrowserProvider> {
    if (!this.provider) {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('Please install MetaMask!');
      }
      this.provider = new ethers.BrowserProvider(window.ethereum);
    }
    return this.provider;
  }

  private async getContract() {
    if (!this.contract) {
      const provider = await this.getProvider();
      const signer = await provider.getSigner();
      this.contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        HarvestLinkABI.abi,
        signer
      );
    }
    return this.contract;
  }

  // Wallet connection
  async connectWallet(): Promise<string> {
    try {
      const provider = await this.getProvider();
      const accounts = await provider.send('eth_requestAccounts', []);
      return accounts[0];
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  async getCurrentAccount(): Promise<string | null> {
    try {
      const provider = await this.getProvider();
      const accounts = await provider.listAccounts();
      return accounts[0]?.address || null;
    } catch (error) {
      console.error('Error getting current account:', error);
      return null;
    }
  }

  // Product functions
  async createProduct(
    name: string,
    description: string,
    imageHash: string,
    price: string
  ): Promise<number> {
    const contract = await this.getContract();
    const tx = await contract.createProduct(
      name,
      description,
      imageHash,
      ethers.parseEther(price)
    );
    const receipt = await tx.wait();
    const event = receipt.events?.find((e: any) => e.event === 'ProductCreated');
    return event?.args?.productId.toNumber();
  }

  // Batch functions
  async createBatch(productIds: number[], location: string): Promise<number> {
    const contract = await this.getContract();
    const tx = await contract.createBatch(productIds, location);
    const receipt = await tx.wait();
    const event = receipt.events?.find((e: any) => e.event === 'BatchCreated');
    return event?.args?.batchId.toNumber();
  }

  async updateBatchLocation(batchId: number, newLocation: string): Promise<void> {
    const contract = await this.getContract();
    const tx = await contract.updateBatchLocation(batchId, newLocation);
    await tx.wait();
  }

  // Verification
  async verifyProduct(
    productId: number
  ): Promise<{ product: Product; owners: string[] }> {
    const contract = await this.getContract();
    const [product, owners] = await contract.getProductWithHistory(productId);
    
    return {
      product: {
        id: product.id.toNumber(),
        name: product.name,
        description: product.description,
        imageHash: product.imageHash,
        farmer: product.farmer,
        currentOwner: product.currentOwner,
        price: ethers.formatEther(product.price),
        createdAt: product.createdAt.toNumber(),
        status: product.status,
        certificates: product.certificates
      },
      owners
    };
  }

  // Getters
  async getProduct(productId: number): Promise<Product> {
    const contract = await this.getContract();
    const product = await contract.products(productId);
    
    return {
      id: product.id.toNumber(),
      name: product.name,
      description: product.description,
      imageHash: product.imageHash,
      farmer: product.farmer,
      currentOwner: product.currentOwner,
      price: ethers.formatEther(product.price),
      createdAt: product.createdAt.toNumber(),
      status: product.status,
      certificates: product.certificates
    };
  }

  async getBatch(batchId: number): Promise<Batch> {
    const contract = await this.getContract();
    const batch = await contract.batches(batchId);
    
    return {
      id: batch.id.toNumber(),
      productIds: batch.productIds.map((id: any) => id.toNumber()),
      currentHandler: batch.currentHandler,
      createdAt: batch.createdAt.toNumber(),
      location: batch.location,
      status: batch.status
    };
  }

  // Event handling
  async startEventListener() {
    if (this.isListening) return;
    
    try {
      const contract = await this.getContract();
      const provider = await this.getProvider();
      
      // Listen for ProductCreated events
      contract.on('ProductCreated', async (productId, name, farmer, event) => {
        const block = await provider.getBlock(event.blockNumber);
        this.handleEvent({
          type: 'ProductCreated',
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          timestamp: block?.timestamp || 0,
          data: { productId: productId.toNumber(), name, farmer }
        });
      });
      
      // Add other event listeners as needed...
      
      this.isListening = true;
    } catch (error) {
      console.error('Error starting event listener:', error);
    }
  }

  stopEventListener() {
    if (!this.isListening) return;
    
    // Remove all listeners
    this.contract?.removeAllListeners();
    this.isListening = false;
  }

  private handleEvent(event: BlockchainEvent) {
    // Add to history
    this.eventHistory = [...this.eventHistory, event];
    
    // Notify listeners
    Object.values(this.eventListeners).forEach(callback => callback(event));
  }

  // Subscribe to events
  subscribe(callback: (event: BlockchainEvent) => void): string {
    const id = Math.random().toString(36).substring(7);
    this.eventListeners[id] = callback;
    return id;
  }

  // Unsubscribe from events
  unsubscribe(id: string) {
    delete this.eventListeners[id];
  }

  // Get event history
  getEventHistory(): BlockchainEvent[] {
    return [...this.eventHistory];
  }

  // Helper to get status text
  getProductStatus(status: number): string {
    const statuses = [
      'Pending',     // 0
      'Harvested',   // 1
      'In Transit',  // 2
      'Processed',   // 3
      'Distributed', // 4
      'Sold'         // 5
    ];
    return statuses[status] || 'Unknown';
  }
}

// Export a singleton instance
const blockchainService = BlockchainService.getInstance();

export { blockchainService };
export type { Product, Batch, BlockchainEvent, EventFilter };

// Helper functions
export const formatEther = (wei: bigint | string): string => {
  return ethers.formatEther(wei);
};

export const parseEther = (ether: string): bigint => {
  return ethers.parseEther(ether);
};
