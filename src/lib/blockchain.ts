import { ethers, type BrowserProvider, EventLog } from 'ethers';
import HarvestLinkABI from '../contracts/HarvestLink.json';

// Contract address (replace with your deployed contract address)
const CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';

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
        throw new Error('MetaMask not detected. Install MetaMask extension and refresh the page.');
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

      // Listen for ProductCreated
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

      // Listen for BatchCreated
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

      // Listen for BatchLocationUpdated
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

      // Listen for BatchPurchased
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

      // Listen for OwnershipTransferred
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
  }

  // Subscribe to specific event types
  public on(eventType: BlockchainEventType | '*', callback: EventCallback): () => void {
    if (!this.eventListeners[eventType]) {
      this.eventListeners[eventType] = [];
    }
    this.eventListeners[eventType].push(callback);
    return () => {
      this.eventListeners[eventType] = this.eventListeners[eventType].filter(cb => cb !== callback);
    };
  }

  // Public method to get product count
  public async getProductCount(): Promise<number> {
    const contract = await this.getContract();
    const count = await contract.productCount();
    return Number(count);
  }

  // Public method to get batch count
  public async getBatchCount(): Promise<number> {
    const contract = await this.getContract();
    const count = await contract.batchCount();
    return Number(count);
  }

  // Get event history
  public getEventHistory(): BlockchainEvent[] {
    return [...this.eventHistory];
  }

  // Helper to wire event listener
  private async setupEventListener(
    contract: ethers.Contract,
    eventName: string,
    transform: (event: any) => Promise<BlockchainEvent>
  ): Promise<() => void> {
    const listener = async (...args: any[]) => {
      try {
        const event = args[args.length - 1] as EventLog;
        const formatted = await transform({ args: event.args, log: event });
        this.eventHistory = [formatted, ...this.eventHistory];
        if (this.eventListeners[eventName]) {
          this.eventListeners[eventName].forEach(cb => cb(formatted));
        }
        if (this.eventListeners['*']) {
          this.eventListeners['*'].forEach(cb => cb(formatted));
        }
      } catch (e) {
        console.error(`Error processing ${eventName} event:`, e);
      }
    };
    contract.on(eventName, listener);
    return () => contract.off(eventName, listener);
  }

  // Wallet and read/write methods
  async connectWallet(): Promise<string> {
    try {
      const provider = await this.getProvider();
      let accounts: string[] = [];
      try {
        accounts = await provider.send('eth_requestAccounts', []);
      } catch (requestError: any) {
        // User denied or provider error
        if (requestError?.code === 4001) {
          throw new Error('Request denied in MetaMask. Please approve the connection request.');
        }
        throw new Error(requestError?.message || 'Failed to request accounts from MetaMask.');
      }

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned by MetaMask. Ensure an account is unlocked.');
      }

      const account = accounts[0];

      // Do not hard-fail on role checks; log a warning instead to avoid blocking connection
      try {
        const contract = await this.getContract();
        const hasFarmerRole = await contract.hasRole?.(this.FARMER_ROLE, account);
        if (!hasFarmerRole) {
          console.warn('Connected account lacks FARMER_ROLE. Some on-chain actions may be restricted.');
        }
      } catch (roleCheckError) {
        console.warn('Role check skipped due to contract/provider issue:', roleCheckError);
      }

      return account;
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      throw new Error(error?.message || 'Unable to connect MetaMask.');
    }
  }

  // Add role constants
  get FARMER_ROLE() {
    return ethers.id('FARMER_ROLE');
  }

  get DISTRIBUTOR_ROLE() {
    return ethers.id('DISTRIBUTOR_ROLE');
  }

  get RETAILER_ROLE() {
    return ethers.id('RETAILER_ROLE');
  }

  get CONSUMER_ROLE() {
    return ethers.id('CONSUMER_ROLE');
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

  async createProduct(name: string, description: string, imageHash: string, price: string): Promise<number> {
    const contract = await this.getContract();
    const tx = await contract.createProduct(name, description, imageHash, ethers.parseEther(price));
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

  async verifyProduct(productId: number): Promise<{ product: Product; owners: string[] }> {
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
        certificates: product.certificates,
      },
      owners,
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
      certificates: product.certificates,
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
      status: batch.status,
    };
  }

  getProductStatus(status: number): string {
    const statuses = [
      'Harvested',      // 0
      'Processed',      // 1
      'Packed',         // 2
      'ForSale',        // 3
      'Sold',           // 4
      'Shipped',        // 5
      'Received',       // 6
      'Purchased'       // 7
    ];
    return statuses[status] || 'Unknown';
  }

  // QR Code generation utilities
  generateProductQRCode(productId: number): string {
    const externalBase = 'https://krishtisetu.vercel.app';
    const unique = (globalThis as any).crypto && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `${externalBase}/p/${productId}/${unique}`;
  }

  generateBatchQRCode(batchId: number): string {
    const externalBase = 'https://krishtisetu.vercel.app';
    const unique = (globalThis as any).crypto && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `${externalBase}/b/${batchId}/${unique}`;
  }

  // Generate QR code data URL for display
  async generateQRCodeDataURL(data: string): Promise<string> {
    // In a real implementation, you would use a QR code library like qrcode
    // For now, we'll use a simple API service
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
    return qrApiUrl;
  }

  // Parse QR code data to extract product/batch ID
  parseQRCodeData(qrData: string): { type: 'product' | 'batch' | 'unknown', id?: number } {
    try {
      const url = new URL(qrData);
      const pathParts = url.pathname.split('/');
      
      // Support legacy format: /verify/product/:id
      if (pathParts.includes('product') && pathParts.length > 2) {
        const id = parseInt(pathParts[pathParts.indexOf('product') + 1]);
        return { type: 'product', id: isNaN(id) ? undefined : id };
      }
      
      if (pathParts.includes('batch') && pathParts.length > 2) {
        const id = parseInt(pathParts[pathParts.indexOf('batch') + 1]);
        return { type: 'batch', id: isNaN(id) ? undefined : id };
      }

      // New public format: /p/:id/:unique? and /b/:id/:unique?
      if (pathParts.includes('p') && pathParts.length > 2) {
        const id = parseInt(pathParts[pathParts.indexOf('p') + 1]);
        return { type: 'product', id: isNaN(id) ? undefined : id };
      }
      if (pathParts.includes('b') && pathParts.length > 2) {
        const id = parseInt(pathParts[pathParts.indexOf('b') + 1]);
        return { type: 'batch', id: isNaN(id) ? undefined : id };
      }
      
      return { type: 'unknown' };
    } catch {
      return { type: 'unknown' };
    }
  }

  // Convert INR to ETH (using a fixed rate for demo - in production, use real exchange rate)
  convertINRToETH(inrAmount: number): string {
    // Using approximate rate: 1 ETH = 200,000 INR (adjust as needed)
    const ethAmount = inrAmount / 200000;
    return ethAmount.toString();
  }

  // Convert ETH to INR for display
  convertETHToINR(ethAmount: string): number {
    const eth = parseFloat(ethAmount);
    return eth * 200000; // Using approximate rate
  }

  // Create product with INR pricing
  async createProductWithINR(
    name: string, 
    description: string, 
    imageHash: string, 
    inrPrice: number
  ): Promise<number> {
    const ethPrice = this.convertINRToETH(inrPrice);
    return this.createProduct(name, description, imageHash, ethPrice);
  }
}

// Export a singleton instance and types
const blockchainService = BlockchainService.getInstance();
export { blockchainService };
// Convenience function exports expected by dashboards
export async function connectWallet(): Promise<string> {
  return blockchainService.connectWallet();
}

export async function getCurrentAccount(): Promise<string | null> {
  return blockchainService.getCurrentAccount();
}

export async function createProduct(
  name: string,
  description: string,
  imageHash: string,
  price: string
): Promise<number> {
  return blockchainService.createProduct(name, description, imageHash, price);
}

export async function createBatch(productIds: number[], location: string): Promise<number> {
  return blockchainService.createBatch(productIds, location);
}

export async function updateBatchLocation(batchId: number, newLocation: string): Promise<void> {
  return blockchainService.updateBatchLocation(batchId, newLocation);
}

export async function purchaseBatch(batchId: number, price: string): Promise<void> {
  return blockchainService.purchaseBatch(batchId, price);
}

export async function verifyProduct(
  productId: number
): Promise<{ product: Product; owners: string[] }> {
  return blockchainService.verifyProduct(productId);
}

export async function getProduct(productId: number): Promise<Product> {
  return blockchainService.getProduct(productId);
}

export async function getBatch(batchId: number): Promise<Batch> {
  return blockchainService.getBatch(batchId);
}

export function getProductStatus(status: number): string {
  return blockchainService.getProductStatus(status);
}

// QR Code utility exports
export function generateProductQRCode(productId: number): string {
  return blockchainService.generateProductQRCode(productId);
}

export function generateBatchQRCode(batchId: number): string {
  return blockchainService.generateBatchQRCode(batchId);
}

export async function generateQRCodeDataURL(data: string): Promise<string> {
  return blockchainService.generateQRCodeDataURL(data);
}

export function parseQRCodeData(qrData: string): { type: 'product' | 'batch' | 'unknown', id?: number } {
  return blockchainService.parseQRCodeData(qrData);
}

// INR conversion utilities
export function convertINRToETH(inrAmount: number): string {
  return blockchainService.convertINRToETH(inrAmount);
}

export function convertETHToINR(ethAmount: string): number {
  return blockchainService.convertETHToINR(ethAmount);
}

export async function createProductWithINR(
  name: string, 
  description: string, 
  imageHash: string, 
  inrPrice: number
): Promise<number> {
  return blockchainService.createProductWithINR(name, description, imageHash, inrPrice);
}
