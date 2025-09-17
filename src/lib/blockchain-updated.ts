import { ethers, type BrowserProvider, type Contract, type JsonRpcSigner, type ContractTransactionResponse, EventLog, Log } from 'ethers';
import HarvestLinkABI from '../contracts/HarvestLink.json';

// Contract address (replace with your deployed contract address)
const CONTRACT_ADDRESS = '0x1234...';

// Event types
export type BlockchainEventType = 'ProductCreated' | 'BatchCreated' | 'OwnershipTransferred' | 'StatusUpdated' | 'BatchLocationUpdated' | 'BatchPurchased';

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

type EventCallback = (event: BlockchainEvent) => void;

// Singleton service for blockchain interactions
class BlockchainService {
  private static instance: BlockchainService;
  private provider: BrowserProvider | null = null;
  private contract: ethers.Contract | null = null;
  private eventListeners: { [eventName: string]: EventCallback[] } = {};
  private eventHistory: BlockchainEvent[] = [];
  private isListening = false;
  private eventSubscriptions: { [key: string]: () => void } = {};

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

  // Initialize event listeners
  public async startEventListeners() {
    if (this.isListening) return;
    
    try {
      const contract = await this.getContract();
      const provider = await this.getProvider();
      
      // Listen for ProductCreated events
      this.eventSubscriptions.ProductCreated = await this.setupEventListener(
        contract,
        'ProductCreated',
        async (event: any) => {
          const block = await provider.getBlock(event.log.blockNumber);
          return {
            type: 'ProductCreated',
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
            data: {
              productId: event.args[0].toString(),
              name: event.args[1],
              farmer: event.args[2],
              price: ethers.formatEther(event.args[3]),
            },
          };
        }
      );

      // Listen for BatchCreated events
      this.eventSubscriptions.BatchCreated = await this.setupEventListener(
        contract,
        'BatchCreated',
        async (event: any) => {
          const block = await provider.getBlock(event.log.blockNumber);
          return {
            type: 'BatchCreated',
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
            data: {
              batchId: event.args[0].toString(),
              productIds: event.args[1].map((id: any) => id.toString()),
              creator: event.args[2],
              location: event.args[3],
            },
          };
        }
      );

      // Listen for BatchLocationUpdated events
      this.eventSubscriptions.BatchLocationUpdated = await this.setupEventListener(
        contract,
        'BatchLocationUpdated',
        async (event: any) => {
          const block = await provider.getBlock(event.log.blockNumber);
          return {
            type: 'BatchLocationUpdated',
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
            data: {
              batchId: event.args[0].toString(),
              newLocation: event.args[1],
              updatedBy: event.args[2],
            },
          };
        }
      );

      // Listen for BatchPurchased events
      this.eventSubscriptions.BatchPurchased = await this.setupEventListener(
        contract,
        'BatchPurchased',
        async (event: any) => {
          const block = await provider.getBlock(event.log.blockNumber);
          return {
            type: 'BatchPurchased',
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
            data: {
              batchId: event.args[0].toString(),
              buyer: event.args[1],
              seller: event.args[2],
              price: ethers.formatEther(event.args[3]),
            },
          };
        }
      );

      // Listen for OwnershipTransferred events
      this.eventSubscriptions.OwnershipTransferred = await this.setupEventListener(
        contract,
        'OwnershipTransferred',
        async (event: any) => {
          const block = await provider.getBlock(event.log.blockNumber);
          return {
            type: 'OwnershipTransferred',
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
            data: {
              productId: event.args[0].toString(),
              previousOwner: event.args[1],
              newOwner: event.args[2],
            },
          };
        }
      );

      this.isListening = true;
      console.log('Event listeners started');
    } catch (error) {
      console.error('Error starting event listeners:', error);
      throw error;
    }
  }

  // Stop all event listeners
  public stopEventListeners() {
    if (!this.isListening) return;
    
    Object.values(this.eventSubscriptions).forEach(unsubscribe => {
      try {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      } catch (error) {
        console.error('Error unsubscribing from event:', error);
      }
    });
    
    this.eventSubscriptions = {};
    this.isListening = false;
    console.log('Event listeners stopped');
  }

  // Subscribe to specific event types
  public on(eventType: BlockchainEventType, callback: EventCallback): () => void {
    if (!this.eventListeners[eventType]) {
      this.eventListeners[eventType] = [];
    }
    
    this.eventListeners[eventType].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.eventListeners[eventType] = this.eventListeners[eventType].filter(
        cb => cb !== callback
      );
    };
  }

  // Get event history
  public getEventHistory(): BlockchainEvent[] {
    return [...this.eventHistory];
  }

  // Get filtered event history
  public getFilteredEventHistory(filter: (event: BlockchainEvent) => boolean): BlockchainEvent[] {
    return this.eventHistory.filter(filter);
  }

  // Helper method to set up event listeners with proper typing
  private async setupEventListener(
    contract: ethers.Contract,
    eventName: string,
    transform: (event: any) => Promise<BlockchainEvent>
  ): Promise<() => void> {
    const listener = async (...args: any[]) => {
      try {
        const event = args[args.length - 1] as EventLog;
        const formattedEvent = await transform({ args: event.args, log: event });
        
        // Add to history
        this.eventHistory = [formattedEvent, ...this.eventHistory];
        
        // Notify listeners for this specific event type
        if (this.eventListeners[eventName]) {
          this.eventListeners[eventName].forEach(callback => callback(formattedEvent));
        }
        
        // Notify general listeners
        if (this.eventListeners['*']) {
          this.eventListeners['*'].forEach(callback => callback(formattedEvent));
        }
      } catch (error) {
        console.error(`Error processing ${eventName} event:`, error);
      }
    };

    // Set up the listener and return the cleanup function
    contract.on(eventName, listener);
    return () => {
      contract.off(eventName, listener);
    };
  }

  // Existing methods...
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

  async purchaseBatch(batchId: number, price: string): Promise<void> {
    const contract = await this.getContract();
    const tx = await contract.purchaseBatch(batchId, { value: ethers.parseEther(price) });
    await tx.wait();
  }

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
