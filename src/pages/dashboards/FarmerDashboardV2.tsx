import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, QrCode, ShieldCheck, Tractor, DollarSign, Clock } from 'lucide-react';
import { useBlockchain } from '@/hooks/useBlockchain';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Produce {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  status: 'Listed' | 'In Transit' | 'Sold';
  blockchainId?: string;
}

export default function FarmerDashboardV2() {
  const { user } = useAuth();
  const { registerCrop } = useBlockchain();
  
  const [produceList, setProduceList] = useState<Produce[]>([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch produce list on component mount
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchProduceList = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`/api/farmers/${user.id}/produce`, {
          signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (isMounted) {
          setProduceList(data);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching produce list:', error);
          toast({
            title: "Error",
            description: "Failed to load your produce list. Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProduceList();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [user?.id]);
  
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'kg',
    price: ''
  });

  // Connect to wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddress(accounts[0]);
      return accounts[0];
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return null;
    }
  };

  // List new produce on blockchain and save to backend
  const handleListProduce = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletAddress) {
      const connected = await connectWallet();
      if (!connected) return;
    }
    
    try {
      setIsLoading(true);
      const newProduce = {
        name: formData.name,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        price: parseFloat(formData.price),
        status: 'Listed' as const,
        farmerId: user?.id,
        walletAddress
      };
      
      // 1. First register on blockchain
      const result = await registerCrop(newProduce);
      
      // 2. Then save to backend
      const savedProduce = {
        ...newProduce,
        blockchainId: result.transactionHash
      };
      
      const response = await fetch('/api/produce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(savedProduce)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save produce to backend');
      }
      
      const savedData = await response.json();
      
      // 3. Update UI with the saved data (including database ID)
      setProduceList(prev => [
        ...prev,
        savedData
      ]);
      
      // 4. Reset form
      setFormData({ name: '', quantity: '', unit: 'kg', price: '' });
      
    } catch (error) {
      console.error('Error listing produce:', error);
      alert('Failed to list produce. ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate earnings
  const calculateEarnings = () => {
    const soldItems = produceList.filter(item => item.status === 'Sold');
    return soldItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{calculateEarnings().toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">From {produceList.length} items</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <Tractor className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {produceList.filter(p => p.status === 'Listed').length}
            </div>
            <p className="text-sm text-muted-foreground">Currently listed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Blockchain</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {produceList.filter(p => p.blockchainId).length}
            </div>
            <p className="text-sm text-muted-foreground">Verified transactions</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>List New Produce</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleListProduce} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="name">Crop Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <div className="flex">
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    required
                  />
                  <select
                    className="ml-2 rounded-r-md border-l-0 border-gray-300"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="ton">ton</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="price">Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  required
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  List on Blockchain
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Your Produce Listings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {produceList.map((produce) => (
              <div key={produce.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{produce.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {produce.quantity} {produce.unit} • ₹{produce.price}/{produce.unit}
                  </div>
                  <div className="mt-1">
                    <Badge variant={produce.status === 'Listed' ? 'default' : produce.status === 'In Transit' ? 'secondary' : 'outline'}>
                      {produce.status}
                    </Badge>
                    {produce.blockchainId && (
                      <Badge variant="secondary" className="ml-2">
                        <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => {}}>
                    <QrCode className="h-4 w-4 mr-2" /> QR Code
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {}}>
                    View Details
                  </Button>
                </div>
              </div>
            ))}
            {produceList.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No produce listed yet. Add your first item above.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
