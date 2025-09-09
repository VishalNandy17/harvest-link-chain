import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';

interface WalletContextType {
  address: string | null;
  jwt: string | null;
  connect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [jwt, setJwt] = useState<string | null>(localStorage.getItem('jwt'));

  useEffect(() => {
    if (jwt) localStorage.setItem('jwt', jwt);
  }, [jwt]);

  const connect = async () => {
    if (!(window as any).ethereum) throw new Error('No wallet found');
    const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
    const addr = accounts[0];
    setAddress(addr);
    // Get nonce from backend
    const { data } = await api.post('/auth/nonce', { address: addr });
    const nonce = data.nonce;
    // Sign nonce
    const signature = await signMessage(nonce);
    // Verify and get JWT
    const verifyRes = await api.post('/auth/verify', { address: addr, signature });
    setJwt(verifyRes.data.token);
  };

  const signMessage = async (message: string) => {
    if (!(window as any).ethereum || !address) throw new Error('Wallet not connected');
    return await (window as any).ethereum.request({
      method: 'personal_sign',
      params: [message, address],
    });
  };

  return (
    <WalletContext.Provider value={{ address, jwt, connect, signMessage }}>
      {children}
    </WalletContext.Provider>
  );
};

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
