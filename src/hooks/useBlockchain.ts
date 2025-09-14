import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const useBlockchain = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const registerCrop = async (cropData: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('register-crop', {
        body: { cropData }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Crop registered on blockchain",
      });

      return data;
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

  const purchaseBatch = async (batchId: string, quantity: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('purchase-batch', {
        body: { batchId, quantity }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Purchase completed and recorded on blockchain",
      });

      return data;
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
    getPricePrediction
  };
};