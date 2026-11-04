import { useState } from 'react';
import { ethers } from 'ethers';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { connectWallet, ensureBlockchainReady, registerPdsLot, signWalletLinkProof, transferPdsCustody, purchaseBatch as purchaseBatchOnChain } from '@/lib/blockchain';

export const useBlockchain = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const registerCrop = async (cropData: any) => {
    setLoading(true);
    try {
      // Require authenticated session (edge function enforces auth)
      const session = await supabase.auth.getSession();
      const hasToken = Boolean(session?.data?.session?.access_token);
      if (!hasToken) {
        throw new Error('Please login to register crops');
      }

      const wallet = await connectWallet();
      await ensureBlockchainReady();
      const userId = session.data.session!.user.id;
      const walletProof = await signWalletLinkProof(userId);
      const { error: linkError } = await supabase.functions.invoke('link-wallet', { body: walletProof });
      if (linkError) throw linkError;

      const { data, error } = await supabase.functions.invoke('register-crop', {
        body: { cropData: { ...cropData, farmerWallet: wallet } }
      });

      // If supabase-js surfaced an error, throw it
      if (error) {
        throw error;
      }

      // The function may return a 200 with an `{ error: '...' }` payload; treat that as an error
      if (data && (data as any).error) {
        throw new Error((data as any).error);
      }

      if (!(data as any)?.batch?.id || !(data as any)?.blockchainHash) {
        throw new Error('Crop was saved without a verifiable on-chain commitment. Retry after checking the registration record.');
      }

      const chainReceipt = await registerPdsLot({
        lotId: String((data as any).batch.id),
        commodity: String((data as any).crop.name),
        quantity: String((data as any).batch.quantity),
        unit: String((data as any).batch.unit || 'kg'),
        custodian: wallet,
        dataHash: String((data as any).blockchainHash),
      });

      const { data: confirmation, error: confirmationError } = await supabase.functions.invoke('confirm-chain-record', {
        body: {
          batchId: String((data as any).batch.id),
          transactionHash: chainReceipt.transactionHash,
          lotId: chainReceipt.lotId,
          chainId: chainReceipt.chainId,
        },
      });
      if (confirmationError) throw confirmationError;
      if (!(confirmation as any)?.verified) throw new Error('Ethereum transaction was mined, but server verification did not confirm its event.');

      toast({
        title: "Success",
        description: "Crop registered and confirmed on the configured Ethereum network",
      });

      return { ...(data as object), chain: confirmation };
    } catch (error) {
      console.error('Error registering crop:', error);
      toast({
        title: "Error",
        description: "Failed to register crop",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const assignDistributor = async (lotId: string, distributorWallet: string, route?: string, vehicleCode?: string) => {
    setLoading(true);
    try {
      const dataHash = ethers.sha256(ethers.toUtf8Bytes(JSON.stringify({
        schema: 'harvestlink.pds.custody-transfer.v1', lotId, route: route || null, vehicleCode: vehicleCode || null,
      })));
      const transactionHash = await transferPdsCustody(lotId, distributorWallet, dataHash);

      toast({
        title: "Custody transfer confirmed",
        description: `Ethereum transaction ${transactionHash.slice(0, 12)}… confirmed`,
      });

      return { transactionHash };
    } catch (error) {
      console.error('Error assigning distributor:', error);
      toast({
        title: "Error",
        description: "Failed to assign distributor",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const purchaseBatch = async (batchId: string, quantity: number) => {
    setLoading(true);
    try {
      const transactionHash = await purchaseBatchOnChain(Number(batchId), String(quantity));

      toast({
        title: "Batch handoff confirmed",
        description: `Ethereum transaction ${transactionHash.slice(0, 12)}… confirmed`,
      });

      return { transactionHash };
    } catch (error) {
      console.error('Error purchasing batch:', error);
      toast({
        title: "Error",
        description: "Failed to complete purchase",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyQR = async (qrCode: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-qr', {
        body: { qrCode }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error verifying QR:', error);
      toast({
        title: "Error",
        description: "Failed to verify QR code",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPricePrediction = async (cropName: string, currentPrice: number, quantity: number, location: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-price-prediction', {
        body: { cropName, currentPrice, quantity, location, season: 'current' }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting price prediction:', error);
      toast({
        title: "Error",
        description: "Failed to get price prediction",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    registerCrop,
    purchaseBatch,
    verifyQR,
    getPricePrediction,
    assignDistributor
  };
};
