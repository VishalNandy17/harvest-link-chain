# 🌾 Harvest Chain - Blockchain-Powered Supply Chain Management

A comprehensive blockchain-based supply chain management system for agricultural products with real-time monitoring, QR code generation, and role-based access control.

## 🚀 Features

### 🔗 **Blockchain Integration**
- **Smart Contract**: Comprehensive Solidity contract for supply chain management
- **Real-time Events**: Live blockchain event monitoring via WebSocket
- **Role-based Access**: Single role per user (Farmer, Distributor, Retailer, Consumer)
- **Immutable Records**: All transactions recorded on blockchain
- **Quality Tracking**: Automated quality scoring and assessment

### 👥 **Role-Based Functionality**

#### **🌾 Farmers**
- Create new product batches with detailed information
- Set initial quality metrics and pricing
- Transfer ownership to distributors
- Track products through the entire supply chain
- View batch history and analytics

#### **📦 Distributors**
- Receive batches from farmers
- Perform quality assessments with automated scoring
- Update pricing based on market conditions
- Transfer products to retailers
- Monitor inventory and performance metrics

#### **🏪 Retailers**
- Receive products from distributors
- Finalize batch information for consumer sale
- Generate QR codes for product traceability
- Handle customer disputes and quality issues
- Manage inventory and sales analytics

#### **👤 Consumers**
- Scan QR codes to view complete product history
- Verify product authenticity and origin
- Access quality metrics and pricing data
- View supply chain transparency information
- Report issues and provide feedback

### 📱 **QR Code System**
- **Automatic Generation**: QR codes generated when batches are finalized
- **Real-time Updates**: QR codes update with new information
- **Traceability**: Complete supply chain journey tracking
- **Mobile Scanning**: Consumer-friendly QR code scanning
- **Blockchain Verification**: Immutable QR code data

### 🔍 **Real-time Monitoring**
- **Live Updates**: Real-time blockchain event streaming
- **Transaction Tracking**: Monitor all supply chain transactions
- **Performance Metrics**: Live analytics and reporting
- **Alert System**: Notifications for important events
- **Dashboard**: Real-time supply chain visualization

## 🛠 Tech Stack

### **Frontend**
- **React 18** with TypeScript
- **Vite** for fast development
- **shadcn/ui** for modern UI components
- **Tailwind CSS** for styling
- **Ethers.js** for blockchain interaction
- **Socket.io** for real-time updates
- **React Query** for data fetching
- **React Hook Form** with Zod validation

### **Backend**
- **Node.js** with Express
- **TypeScript** for type safety
- **Socket.io** for real-time communication
- **Ethers.js** for blockchain integration
- **MongoDB** for additional data storage
- **JWT** for authentication
- **Pino** for logging

### **Blockchain**
- **Solidity** smart contracts
- **Hardhat** development environment
- **OpenZeppelin** for security
- **Ethereum** compatible networks
- **MetaMask** wallet integration

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** package manager
- **MetaMask** browser extension
- **Git**

## 🚀 Quick Start

### 1. **Clone and Install**
```bash
git clone <repository-url>
cd harvest-link-chain
pnpm install
```

### 2. **Environment Setup**
Create a `.env` file in the root directory:

```env
# Frontend Environment Variables
VITE_API_BASE_URL=http://localhost:4000
VITE_RPC_URL=http://localhost:8545
VITE_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Backend Environment Variables
RPC_URL=http://localhost:8545
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
MONGO_URI=mongodb://localhost:27017/harvest-chain
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
API_BASE_URL=http://localhost:4000
PORT=4000
PRIVATE_KEY=your-private-key-for-admin-operations
```

### 3. **Deploy Smart Contract**
```bash
# Navigate to contracts directory
cd packages/contracts

# Install dependencies
pnpm install

# Start local blockchain
pnpm dev

# In another terminal, deploy contract
pnpm deploy
```

### 4. **Start Development Servers**
```bash
# Start all services (contracts, API, frontend)
pnpm dev:all

# Or start individually:
pnpm dev:contracts  # Start local blockchain
pnpm dev:api        # Start API server
pnpm dev:web        # Start frontend
```

## 🔧 Configuration

### **Smart Contract Deployment**
1. Deploy the `HarvestChainRegistry` contract
2. Update `VITE_CONTRACT_ADDRESS` and `CONTRACT_ADDRESS` in `.env`
3. Verify contract deployment

### **API Configuration**
1. Set up MongoDB (optional for development)
2. Configure JWT secret
3. Set admin private key for contract operations
4. Configure CORS settings

### **Frontend Configuration**
1. Connect MetaMask wallet
2. Switch to local network (localhost:8545)
3. Import test accounts for different roles

## 🧪 Testing the System

### **1. User Registration**
```bash
# Register as Farmer
curl -X POST http://localhost:4000/api/blockchain/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Farmer",
    "email": "john@farm.com",
    "organization": "Green Valley Farm",
    "location": "Salinas Valley, CA",
    "role": 1
  }'
```

### **2. Create Batch**
```bash
# Create a new batch (requires farmer wallet)
curl -X POST http://localhost:4000/api/blockchain/batches \
  -H "Content-Type: application/json" \
  -d '{
    "cropType": "Tomatoes",
    "variety": "Heirloom",
    "farmRef": "Green Valley Farm",
    "quantityKg": 1000,
    "basePricePerKgWei": "1000000000000000000",
    "harvestDate": 1704067200,
    "location": "Salinas Valley, CA",
    "description": "Organic heirloom tomatoes"
  }'
```

### **3. Quality Assessment**
```bash
# Assess quality (requires distributor wallet)
curl -X POST http://localhost:4000/api/blockchain/batches/BATCH1/quality \
  -H "Content-Type: application/json" \
  -d '{
    "moisture": 1200,
    "protein": 800,
    "fiber": 600,
    "organic": true
  }'
```

### **4. Generate QR Code**
```bash
# Generate QR code (requires retailer wallet)
curl -X POST http://localhost:4000/api/blockchain/batches/BATCH1/qr
```

## 📊 API Endpoints

### **User Management**
- `POST /api/blockchain/users/register` - Register new user
- `GET /api/blockchain/users/:address` - Get user information
- `POST /api/blockchain/users/:address/verify` - Verify user

### **Batch Management**
- `POST /api/blockchain/batches` - Create new batch
- `GET /api/blockchain/batches/:batchId` - Get batch details
- `POST /api/blockchain/batches/:batchId/transfer` - Transfer batch
- `POST /api/blockchain/batches/:batchId/quality` - Assess quality
- `POST /api/blockchain/batches/:batchId/price` - Update price
- `POST /api/blockchain/batches/:batchId/finalize` - Finalize batch

### **QR Code Management**
- `POST /api/blockchain/batches/:batchId/qr` - Generate QR code
- `GET /api/blockchain/batches/:batchId/qr` - Get QR code info
- `POST /api/blockchain/batches/:batchId/scan` - Scan QR code

### **Analytics**
- `GET /api/blockchain/stats` - Get system statistics
- `GET /api/blockchain/health` - Health check
- `GET /api/blockchain/network` - Network information

## 🔐 Security Features

- **Role-based Access Control**: Single role per user
- **Smart Contract Security**: OpenZeppelin security patterns
- **Input Validation**: Comprehensive validation with Zod
- **JWT Authentication**: Secure API access
- **Private Key Management**: Secure admin operations
- **Event Logging**: Comprehensive audit trail

## 🚀 Production Deployment

### **Smart Contract**
1. Deploy to target network (Ethereum, Polygon, etc.)
2. Verify contract on block explorer
3. Update environment variables
4. Configure gas optimization

### **Backend API**
1. Deploy to cloud provider (AWS, GCP, Azure)
2. Configure production database
3. Set up SSL certificates
4. Configure monitoring and logging

### **Frontend**
1. Build for production
2. Deploy to CDN
3. Configure domain and SSL
4. Set up monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the smart contract code

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] IoT sensor integration
- [ ] AI-powered quality prediction
- [ ] Cross-chain compatibility
- [ ] Advanced analytics dashboard
- [ ] Supply chain optimization algorithms
- [ ] Carbon footprint tracking
- [ ] Fair trade certification integration

---

**Built with ❤️ for transparent and efficient supply chains**
