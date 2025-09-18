import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const useBlockchain = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const registerCrop = async (cropData: any) => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('register-crop', {
        body: { cropData },
        headers
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Crop registered and QR generated",
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

  const assignDistributor = async (batchId: string, distributorUserId: string, route?: string, vehicleCode?: string) => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('assign-distributor', {
        body: { batchId, distributorUserId, route, vehicleCode },
        headers
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Distributor assigned",
        description: "Batch assigned to distributor and tracking started",
      });

      return data;
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
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('purchase-batch', {
        body: { batchId, quantity },
        headers
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
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('verify-qr', {
        body: { qrCode },
        headers
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
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('ai-price-prediction', {
        body: { cropName, currentPrice, quantity, location, season: 'current' },
        headers
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