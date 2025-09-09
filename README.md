# 🌾 Harvest Chain

A blockchain-based supply chain management system for agricultural products, enabling transparent tracking from farm to consumer.

![Harvest Chain Banner](https://via.placeholder.com/1200x400/4CAF50/FFFFFF?text=Harvest+Chain)

## 🚀 Features

- **End-to-End Traceability**: Track agricultural products from farm to consumer
- **Blockchain Integration**: Immutable record-keeping using smart contracts
- **User Authentication**: Secure login and registration system
- **Batch Management**: Create and manage product batches with detailed information
- **Real-time Tracking**: Monitor product movement through the supply chain
- **Responsive Design**: Works on desktop and mobile devices

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Components**: shadcn/ui with Radix UI primitives
- **State Management**: React Query
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

### Backend
- **Blockchain**: Ethereum-compatible smart contracts (Solidity)
- **API**: Node.js with Express
- **Database**: MongoDB
- **Authentication**: JWT

## 📦 Prerequisites

- Node.js 18+
- npm or pnpm
- MongoDB instance
- Ethereum-compatible wallet (e.g., MetaMask)
- Git

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/VishalNandy17/harvest-link-chain.git
cd harvest-link-chain
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Set Up Environment Variables
Create a `.env` file in the root directory and add the following variables:
```env
VITE_API_BASE_URL=http://localhost:4000
VITE_RPC_URL=your_ethereum_rpc_url
VITE_CONTRACT_ADDRESS=your_smart_contract_address
```

### 4. Start Development Servers
In separate terminal windows, run:

```bash
# Start the frontend
pnpm dev:web

# Start the API server
pnpm dev:api

# Start local blockchain node (optional)
pnpm dev:contracts
```

## 🌐 Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/      # React contexts
├── hooks/         # Custom React hooks
├── lib/           # Utility functions and configurations
├── pages/         # Application pages
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   ├── SignUp.tsx
│   └── ...
└── services/      # API and blockchain services
```

## 🔧 Development

### Available Scripts

- `dev`: Start development server
- `build`: Build for production
- `lint`: Run ESLint
- `preview`: Preview production build
- `dev:all`: Start all services (web, api, contracts)

### Code Style

- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use TypeScript types wherever possible
- Write meaningful commit messages

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the amazing component library
- [Vite](https://vitejs.dev/) for the excellent development experience
- [Ethereum](https://ethereum.org/) for the blockchain infrastructure

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
