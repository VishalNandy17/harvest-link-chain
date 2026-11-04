import { ethers, type BrowserProvider, EventLog } from 'ethers';
import HarvestLinkABI from '../contracts/HarvestLink.json';

// Contract address (from env)
const CONTRACT_ADDRESS = (import.meta as any)?.env?.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
const EXPECTED_CHAIN_ID = (import.meta as any)?.env?.VITE_CHAIN_ID ? BigInt((import.meta as any).env.VITE_CHAIN_ID) : null;
const READ_RPC_URL = (import.meta as any)?.env?.VITE_RPC_URL as string | undefined;
const PUBLIC_BASE_URL = ((import.meta as any)?.env?.VITE_PUBLIC_BASE_URL as string | undefined) || (typeof window !== 'undefined' ? window.location.origin : '');
const DEPLOYMENT_BLOCK = Number((import.meta as any)?.env?.VITE_DEPLOYMENT_BLOCK || 0);

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

  private async getReadProvider(): Promise<ethers.Provider> {
    if (READ_RPC_URL) return new ethers.JsonRpcProvider(READ_RPC_URL);
    return this.getProvider();
  }

  async getContract() {
    if (!this.contract) {
      const provider = await this.getProvider();
      const signer = await provider.getSigner();
      if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('Missing VITE_CONTRACT_ADDRESS. Set it to your deployed contract address.');
      }
      if (EXPECTED_CHAIN_ID !== null) {
        const network = await provider.getNetwork();
        if (network.chainId !== EXPECTED_CHAIN_ID) {
          throw new Error(`Wrong network. Switch your wallet to chain ${EXPECTED_CHAIN_ID.toString()}.`);
        }
      }
      this.contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        HarvestLinkABI.abi,
        signer
      );
    }
    return this.contract;
  }

  async ensureReady(): Promise<void> {
    await this.getContract();
  }

  async signWalletLinkProof(userId: string): Promise<{ walletAddress: string; issuedAt: number; nonce: string; signature: string }> {
    const provider = await this.getProvider();
    const signer = await provider.getSigner();
    const walletAddress = ethers.getAddress(await signer.getAddress());
    const issuedAt = Date.now();
    const nonce = crypto.randomUUID();
    const message = `HarvestLink wallet link\nuser:${userId}\naddress:${walletAddress}\nissuedAt:${issuedAt}\nnonce:${nonce}`;
    return { walletAddress, issuedAt, nonce, signature: await signer.signMessage(message) };
  }

  private asBytes32(value: string): string {
    return /^0x[0-9a-fA-F]{64}$/.test(value) ? value : ethers.id(value);
  }

  private quantityUnits(value: string | number): bigint {
    const quantity = Number(value);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be a positive number.');
    return ethers.parseUnits(quantity.toFixed(3), 3);
  }

  async registerPdsLot(input: {
    lotId: string;
    commodity: string;
    quantity: string | number;
    unit: string;
    custodian: string;
    dataHash: string;
  }): Promise<{ transactionHash: string; blockNumber: number; chainId: string; lotId: string }> {
    const contract = await this.getContract();
    const provider = await this.getProvider();
    const tx = await contract.registerLot(
      this.asBytes32(input.lotId),
      this.asBytes32(input.commodity.trim().toLowerCase()),
      this.quantityUnits(input.quantity),
      this.asBytes32(input.unit.trim().toLowerCase()),
      ethers.getAddress(input.custodian),
      input.dataHash.startsWith('0x') ? input.dataHash : `0x${input.dataHash}`,
    );
    const receipt = await tx.wait(2);
    if (!receipt || receipt.status !== 1) throw new Error('Lot registration transaction was not confirmed.');
    const network = await provider.getNetwork();
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      chainId: network.chainId.toString(),
      lotId: this.asBytes32(input.lotId),
    };
  }

  async transferPdsCustody(lotId: string, recipient: string, dataHash: string): Promise<string> {
    const contract = await this.getContract();
    const tx = await contract.transferCustody(this.asBytes32(lotId), ethers.getAddress(recipient), dataHash.startsWith('0x') ? dataHash : `0x${dataHash}`);
    const receipt = await tx.wait(2);
    if (!receipt || receipt.status !== 1) throw new Error('Custody transfer was not confirmed.');
    return receipt.hash;
  }

  async splitPdsLot(parentId: string, childId: string, quantity: string | number, dataHash: string): Promise<string> {
    const contract = await this.getContract();
    const tx = await contract.splitLot(this.asBytes32(parentId), this.asBytes32(childId), this.quantityUnits(quantity), dataHash.startsWith('0x') ? dataHash : `0x${dataHash}`);
    const receipt = await tx.wait(2);
    if (!receipt || receipt.status !== 1) throw new Error('Lot split was not confirmed.');
    return receipt.hash;
  }

  async receivePdsStock(lotId: string, facilityCode: string, dataHash: string): Promise<string> {
    const contract = await this.getContract();
    const tx = await contract.receiveStock(this.asBytes32(lotId), this.asBytes32(facilityCode), dataHash.startsWith('0x') ? dataHash : `0x${dataHash}`);
    const receipt = await tx.wait(2);
    if (!receipt || receipt.status !== 1) throw new Error('Stock receipt was not confirmed.');
    return receipt.hash;
  }

  async recallPdsLot(lotId: string, reasonHash: string): Promise<string> {
    const contract = await this.getContract();
    const tx = await contract.recallLot(this.asBytes32(lotId), reasonHash.startsWith('0x') ? reasonHash : `0x${reasonHash}`);
    const receipt = await tx.wait(2);
    if (!receipt || receipt.status !== 1) throw new Error('Lot recall was not confirmed.');
    return receipt.hash;
  }

  async setPdsOperatorRole(roleName: string, walletAddress: string, enabled: boolean): Promise<string> {
    const roleNames = ['FARMER_ROLE', 'PROCUREMENT_ROLE', 'WAREHOUSE_ROLE', 'DISTRIBUTOR_ROLE', 'RETAILER_ROLE', 'AUDITOR_ROLE'];
    if (!roleNames.includes(roleName)) throw new Error('Unsupported operator role.');
    const contract = await this.getContract();
    const tx = await contract.setRole(ethers.id(roleName), ethers.getAddress(walletAddress), enabled);
    const receipt = await tx.wait(2);
    if (!receipt || receipt.status !== 1) throw new Error('Role change was not confirmed.');
    return receipt.hash;
  }

  async allocatePdsStock(input: { allocationId: string; lotId: string; outlet: string; quantity: string | number; period: string; dataHash: string }): Promise<string> {
    const contract = await this.getContract();
    const tx = await contract.recordAllocation(
      this.asBytes32(input.allocationId), this.asBytes32(input.lotId), ethers.getAddress(input.outlet),
      this.quantityUnits(input.quantity), this.asBytes32(input.period), input.dataHash.startsWith('0x') ? input.dataHash : `0x${input.dataHash}`,
    );
    const receipt = await tx.wait(2);
    if (!receipt || receipt.status !== 1) throw new Error('Stock allocation was not confirmed.');
    return receipt.hash;
  }

  async issuePdsEntitlement(allocationId: string, secret: string): Promise<string> {
    const contract = await this.getContract();
    const secretBytes = /^0x[0-9a-fA-F]{64}$/.test(secret) ? secret : ethers.id(secret);
    const tx = await contract.issueEntitlement(this.asBytes32(allocationId), secretBytes);
    const receipt = await tx.wait(2);
    if (!receipt || receipt.status !== 1) throw new Error('Entitlement issuance was not confirmed.');
    return receipt.hash;
  }

  async redeemPdsAllocation(input: { allocationId: string; secret: string; quantity: string | number; dataHash: string }): Promise<string> {
    const contract = await this.getContract();
    const tx = await contract.recordDistribution(
      this.asBytes32(input.allocationId), /^0x[0-9a-fA-F]{64}$/.test(input.secret) ? input.secret : ethers.id(input.secret), this.quantityUnits(input.quantity),
      input.dataHash.startsWith('0x') ? input.dataHash : `0x${input.dataHash}`,
    );
    const receipt = await tx.wait(2);
    if (!receipt || receipt.status !== 1) throw new Error('Distribution record was not confirmed.');
    return receipt.hash;
  }

  async getPdsLot(lotId: string) {
    const provider = await this.getReadProvider();
    if (!ethers.isAddress(CONTRACT_ADDRESS)) throw new Error('Set VITE_CONTRACT_ADDRESS to a deployed HarvestLink contract.');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, HarvestLinkABI.abi, provider);
    const lot = await contract.lots(this.asBytes32(lotId));
    if (Number(lot.status) === 0) throw new Error('Lot does not exist on the configured chain.');
    return {
      id: lot.id as string,
      parentId: lot.parentId as string,
      commodityCode: lot.commodityCode as string,
      dataHash: lot.dataHash as string,
      unitCode: lot.unitCode as string,
      originator: lot.originator as string,
      custodian: lot.custodian as string,
      quantity: ethers.formatUnits(lot.quantity, 3),
      createdAt: Number(lot.createdAt),
      status: Number(lot.status),
    };
  }

  async getPdsLotEvents(lotId: string) {
    const provider = await this.getReadProvider();
    if (!ethers.isAddress(CONTRACT_ADDRESS)) throw new Error('Set VITE_CONTRACT_ADDRESS to a deployed HarvestLink contract.');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, HarvestLinkABI.abi, provider);
    const id = this.asBytes32(lotId);
    const filters = [
      contract.filters.LotRegistered(id),
      contract.filters.LotSplit(id),
      contract.filters.CustodyTransferred(id),
      contract.filters.StockReceived(id),
      contract.filters.AllocationRecorded(null, id),
      contract.filters.LotRecalled(id),
      contract.filters.RecordCorrected(id),
    ];
    const batches = await Promise.all(filters.map(filter => contract.queryFilter(filter, DEPLOYMENT_BLOCK, 'latest')));
    const allocationIds = batches[4].map(log => String((log as any).args.allocationId));
    for (const allocationId of allocationIds) {
      batches.push(await contract.queryFilter(contract.filters.DistributionRecorded(allocationId), DEPLOYMENT_BLOCK, 'latest'));
    }
    return batches.flat().map((log: any) => ({
      event: log.fragment?.name || log.eventName || 'ChainEvent',
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber,
      args: log.fragment.inputs.reduce((result: Record<string, string>, input: any, index: number) => {
        const value = log.args[index];
        result[input.name || String(index)] = typeof value === 'bigint' ? value.toString() : String(value);
        return result;
      }, {}),
    })).sort((a: any, b: any) => a.blockNumber - b.blockNumber);
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
  public on(eventType: BlockchainEventType, callback: EventCallback): () => void {
    if (!this.eventListeners[eventType]) {
      this.eventListeners[eventType] = [];
    }
    this.eventListeners[eventType].push(callback);
    return () => {
      this.eventListeners[eventType] = this.eventListeners[eventType].filter(cb => cb !== callback);
    };
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
    const tx = await contract.createProduct(name, description, imageHash, ethers.parseUnits(price, 2));
    const receipt = await tx.wait();
    const event = receipt?.logs.map(log => {
      try { return contract.interface.parseLog(log); } catch { return null; }
    }).find(parsed => parsed?.name === 'ProductCreated');
    if (!event) throw new Error('Product transaction confirmed without a ProductCreated event.');
    return Number(event.args.productId);
  }

  async getBatchCount(): Promise<number> {
    const contract = await this.getContract();
    const count = await (contract as any).batchCount?.();
    // Support alternate naming if ABI differs
    const value = typeof count === 'undefined' ? await (contract as any).getBatchCount?.() : count;
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error('Invalid batchCount response');
    return n;
  }

  async createBatch(productIds: number[], location: string): Promise<number> {
    const contract = await this.getContract();
    const tx = await contract.createBatch(productIds, location);
    const receipt = await tx.wait();
    const event = receipt?.logs.map(log => {
      try { return contract.interface.parseLog(log); } catch { return null; }
    }).find(parsed => parsed?.name === 'BatchCreated');
    if (!event) throw new Error('Batch transaction confirmed without a BatchCreated event.');
    return Number(event.args.batchId);
  }

  async updateBatchLocation(batchId: number, newLocation: string): Promise<void> {
    const contract = await this.getContract();
    const tx = await contract.updateBatchLocation(batchId, newLocation);
    await tx.wait();
  }

  async purchaseBatch(batchId: number, _price: string): Promise<string> {
    const contract = await this.getContract();
    const tx = await contract.purchaseBatch(batchId);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error('Batch custody transfer was not confirmed.');
    return receipt.hash;
  }

  async verifyProduct(productId: number): Promise<{ product: Product; owners: string[] }> {
    const contract = await this.getContract();
    const [product, owners] = await contract.getProductWithHistory(productId);
    return {
      product: {
        id: Number(product.id),
        name: product.name,
        description: product.description,
        imageHash: product.imageHash,
        farmer: product.farmer,
        currentOwner: product.currentOwner,
        price: ethers.formatUnits(product.price, 2),
        createdAt: Number(product.createdAt),
        status: Number(product.status),
        certificates: product.certificates,
      },
      owners,
    };
  }

  async getProduct(productId: number): Promise<Product> {
    const contract = await this.getContract();
    const [product] = await contract.getProductWithHistory(productId);
    return {
      id: Number(product.id),
      name: product.name,
      description: product.description,
      imageHash: product.imageHash,
      farmer: product.farmer,
      currentOwner: product.currentOwner,
      price: ethers.formatUnits(product.price, 2),
      createdAt: Number(product.createdAt),
      status: Number(product.status),
      certificates: product.certificates,
    };
  }

  async getBatch(batchId: number): Promise<Batch> {
    const contract = await this.getContract();
    const batch = await contract.getBatchDetail(batchId);
    return {
      id: batch.id.toNumber(),
      productIds: batch.productIds.map((id: any) => Number(id)),
      currentHandler: batch.currentHandler,
      createdAt: Number(batch.createdAt),
      location: batch.location,
      status: Number(batch.status),
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
    const unique = (globalThis as any).crypto && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `${PUBLIC_BASE_URL}/p/${productId}/${unique}`;
  }

  generateBatchQRCode(batchId: number): string {
    const unique = (globalThis as any).crypto && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `${PUBLIC_BASE_URL}/b/${batchId}/${unique}`;
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

  // Legacy method name retained; contract price metadata is stored in INR, not ETH.
  convertINRToETH(inrAmount: number): string {
    return inrAmount.toFixed(2);
  }

  // Legacy method name retained; values are already INR metadata.
  convertETHToINR(ethAmount: string): number {
    return Number(ethAmount);
  }

  // Create product with INR pricing
  async createProductWithINR(
    name: string, 
    description: string, 
    imageHash: string, 
    inrPrice: number
  ): Promise<number> {
    return this.createProduct(name, description, imageHash, this.convertINRToETH(inrPrice));
  }
}

// Export a singleton instance and types
const blockchainService = BlockchainService.getInstance();
export { blockchainService };
// Convenience function exports expected by dashboards
export async function connectWallet(): Promise<string> {
  return blockchainService.connectWallet();
}

export async function ensureBlockchainReady(): Promise<void> {
  return blockchainService.ensureReady();
}

export async function signWalletLinkProof(userId: string) {
  return blockchainService.signWalletLinkProof(userId);
}

export async function getCurrentAccount(): Promise<string | null> {
  return blockchainService.getCurrentAccount();
}

export async function registerPdsLot(input: Parameters<typeof blockchainService.registerPdsLot>[0]) {
  return blockchainService.registerPdsLot(input);
}

export async function transferPdsCustody(lotId: string, recipient: string, dataHash: string) {
  return blockchainService.transferPdsCustody(lotId, recipient, dataHash);
}

export async function splitPdsLot(parentId: string, childId: string, quantity: string | number, dataHash: string) {
  return blockchainService.splitPdsLot(parentId, childId, quantity, dataHash);
}

export async function receivePdsStock(lotId: string, facilityCode: string, dataHash: string) {
  return blockchainService.receivePdsStock(lotId, facilityCode, dataHash);
}

export async function recallPdsLot(lotId: string, reasonHash: string) {
  return blockchainService.recallPdsLot(lotId, reasonHash);
}

export async function setPdsOperatorRole(roleName: string, walletAddress: string, enabled: boolean) {
  return blockchainService.setPdsOperatorRole(roleName, walletAddress, enabled);
}

export async function allocatePdsStock(input: Parameters<typeof blockchainService.allocatePdsStock>[0]) {
  return blockchainService.allocatePdsStock(input);
}

export async function issuePdsEntitlement(allocationId: string, secret: string) {
  return blockchainService.issuePdsEntitlement(allocationId, secret);
}

export async function redeemPdsAllocation(input: Parameters<typeof blockchainService.redeemPdsAllocation>[0]) {
  return blockchainService.redeemPdsAllocation(input);
}

export function generatePdsEntitlementSecret(): string {
  const secret = new Uint8Array(32);
  globalThis.crypto.getRandomValues(secret);
  return ethers.hexlify(secret);
}

export async function getPdsLot(lotId: string) {
  return blockchainService.getPdsLot(lotId);
}

export async function getPdsLotEvents(lotId: string) {
  return blockchainService.getPdsLotEvents(lotId);
}

export function generatePdsLotQRCode(lotId: string): string {
  return `${PUBLIC_BASE_URL}/lot/${encodeURIComponent(lotId)}`;
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

export async function purchaseBatch(batchId: number, price: string): Promise<string> {
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
