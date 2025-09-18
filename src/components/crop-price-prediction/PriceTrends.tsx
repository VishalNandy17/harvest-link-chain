import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

interface PriceTrendsProps {
  crop?: string;
  state?: string;
  months?: number;
}

interface PriceDataPoint {
  date: string;
  price: number;
  min_price: number;
  max_price: number;
  avg_price: number;
  volume: number;
}

export function PriceTrends({ crop: initialCrop, state: initialState, months = 12 }: PriceTrendsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PriceDataPoint[]>([]);
  const [selectedCrop, setSelectedCrop] = useState(initialCrop || '');
  const [selectedState, setSelectedState] = useState(initialState || '');
  const [selectedMonths, setSelectedMonths] = useState(months);
  const [availableCrops, setAvailableCrops] = useState<string[]>([]);
  const [availableStates, setAvailableStates] = useState<string[]>([]);

  // Fetch available crops and states
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch('http://localhost:8000/crops/available');
        if (!response.ok) throw new Error('Failed to fetch metadata');
        const { crops, states } = await response.json();
        setAvailableCrops(crops);
        setAvailableStates(states);
        
        // Set initial values if not provided
        if (!initialCrop && crops.length > 0) setSelectedCrop(crops[0]);
        if (!initialState && states.length > 0) setSelectedState(states[0]);
      } catch (err) {
        console.error('Error fetching metadata:', err);
        setError('Failed to load crop and state data');
      }
    };

    fetchMetadata();
  }, [initialCrop, initialState]);

  // Fetch price trends when filters change
  useEffect(() => {
    const fetchPriceTrends = async () => {
      if (!selectedCrop || !selectedState) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({
          crop: selectedCrop,
          state: selectedState,
          months: selectedMonths.toString(),
        });
        
        // In a real app, this would be an actual API endpoint
        // For now, we'll simulate the response
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        
        // Generate mock data
        const mockData = generateMockTrendData(selectedCrop, selectedState, selectedMonths);
        setData(mockData);
      } catch (err) {
        console.error('Error fetching price trends:', err);
        setError('Failed to load price trends data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPriceTrends();
  }, [selectedCrop, selectedState, selectedMonths]);

  // Generate mock trend data (replace with actual API call)
  const generateMockTrendData = (crop: string, state: string, months: number): PriceDataPoint[] => {
    const basePrice = {
      'Rice': 1800, 'Wheat': 2000, 'Maize': 1700, 'Cotton': 5800, 'Sugarcane': 300,
      'Soybean': 3900, 'Potato': 1200, 'Onion': 2000
    }[crop] || 2000;
    
    const stateFactor = 0.9 + (state.length % 10) * 0.02;
    
    const now = new Date();
    const data: PriceDataPoint[] = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(now.getMonth() - i);
      
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      // Seasonal variation
      let seasonalFactor = 1.0;
      if (crop === 'Potato' || crop === 'Wheat') {
        seasonalFactor = month >= 10 || month <= 2 ? 1.2 : 0.9; // Winter crops
      } else if (crop === 'Rice' || crop === 'Cotton') {
        seasonalFactor = month >= 6 && month <= 9 ? 1.2 : 0.9; // Kharif crops
      }
      
      // Random variation
      const randomFactor = 0.9 + Math.random() * 0.2;
      
      const price = basePrice * stateFactor * seasonalFactor * randomFactor;
      const minPrice = price * (0.85 + Math.random() * 0.1);
      const maxPrice = price * (1.05 + Math.random() * 0.1);
      const avgPrice = (minPrice + maxPrice) / 2;
      
      data.push({
        date: date.toISOString().split('T')[0],
        price: parseFloat(price.toFixed(2)),
        min_price: parseFloat(minPrice.toFixed(2)),
        max_price: parseFloat(maxPrice.toFixed(2)),
        avg_price: parseFloat(avgPrice.toFixed(2)),
        volume: Math.floor(1000 + Math.random() * 5000),
      });
    }
    
    return data;
  };

  // Format data for Recharts
  const chartData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
  }));

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl font-bold">Price Trends</CardTitle>
          <p className="text-sm text-muted-foreground">Historical price data for {selectedCrop} in {selectedState}</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="space-y-1">
            <Label htmlFor="crop" className="text-xs">Crop</Label>
            <Select
              value={selectedCrop}
              onValueChange={setSelectedCrop}
              disabled={loading}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select crop" />
              </SelectTrigger>
              <SelectContent>
                {availableCrops.map(crop => (
                  <SelectItem key={crop} value={crop}>
                    {crop}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="state" className="text-xs">State</Label>
            <Select
              value={selectedState}
              onValueChange={setSelectedState}
              disabled={loading}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {availableStates.map(state => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="months" className="text-xs">Period</Label>
            <Select
              value={selectedMonths.toString()}
              onValueChange={(value) => setSelectedMonths(parseInt(value, 10))}
              disabled={loading}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Months</SelectItem>
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">1 Year</SelectItem>
                <SelectItem value="24">2 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading price trends...</span>
          </div>
        ) : error ? (
          <div className="h-80 flex items-center justify-center text-destructive">
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    label={{ 
                      value: 'Price (₹/quintal)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle' }
                    }}
                    width={80}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Price']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="price"
                    name="Current Price"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_price"
                    name="Average Price"
                    stroke="#82ca9d"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="h-60">
              <h3 className="text-lg font-medium mb-2">Price Range</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis 
                    label={{ 
                      value: 'Price (₹/quintal)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle' }
                    }}
                    width={80}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Price']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="min_price" name="Min Price" fill="#8884d8" />
                  <Bar dataKey="max_price" name="Max Price" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-muted-foreground">Current Price</h4>
                <p className="text-2xl font-bold">
                  ₹{data.length > 0 ? data[data.length - 1].price.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">per quintal</p>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-muted-foreground">3-Month Change</h4>
                {data.length >= 3 ? (
                  <>
                    <p className={`text-2xl font-bold ${
                      data[data.length - 1].price > data[data.length - 4].price 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {data[data.length - 1].price > data[data.length - 4].price ? '↑' : '↓'} 
                      {Math.abs(
                        ((data[data.length - 1].price - data[data.length - 4].price) / 
                         data[data.length - 4].price) * 100
                      ).toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      from ₹{data[data.length - 4].price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Insufficient data</p>
                )}
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-muted-foreground">Price Range</h4>
                {data.length > 0 ? (
                  <>
                    <p className="text-2xl font-bold">
                      ₹{Math.min(...data.map(d => d.price)).toLocaleString('en-IN', { maximumFractionDigits: 2 })} - 
                      ₹{Math.max(...data.map(d => d.price)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      over last {selectedMonths} months
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">No data available</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PriceTrends;
