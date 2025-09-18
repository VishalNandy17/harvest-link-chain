import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, TrendingUp, History, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PriceTrends } from './PriceTrends';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Interfaces
export interface PredictionResult {
  predicted_price: number;
  confidence_interval: [number, number];
  currency: string;
  model_metadata?: {
    model_type: string;
    training_date: string;
    r2_score?: number;
  };
}

interface CropData {
  crops: string[];
  states: string[];
  soil_types: string[];
}

// Constants
const defaultCropData: CropData = {
  crops: ["Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Soybean", "Potato", "Onion"],
  states: ["Andhra Pradesh", "Punjab", "Maharashtra", "Karnataka", "Uttar Pradesh", "Madhya Pradesh"],
  soil_types: ["Alluvial", "Black", "Red", "Laterite", "Arid", "Mountain"]
};

const months = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

export function CropPricePrediction() {
  const { user } = useAuth();
  const [cropData, setCropData] = useState<CropData>(defaultCropData);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('predict');
  const [predictionHistory, setPredictionHistory] = useState<Array<{
    id: string;
    timestamp: string;
    input: any;
    result: PredictionResult;
  }>>([]);

  const [formData, setFormData] = useState({
    crop: '',
    state: '',
    soil_type: 'Alluvial',
    month: new Date().getMonth() + 1,
    year: currentYear,
    area: 1,
    rainfall: 100,
    temperature: 25,
    humidity: 60,
    prev_year_price: 0,
  });

  // Fetch available crops, states, and soil types
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch('http://localhost:8000/crops/available');
        if (!response.ok) throw new Error('Failed to fetch metadata');
        const data = await response.json();
        setCropData(prev => ({
          crops: data.crops || prev.crops,
          states: data.states || prev.states,
          soil_types: data.soil_types || prev.soil_types
        }));
      } catch (err) {
        console.error('Error fetching metadata:', err);
        // Continue with default data
      }
    };

    fetchMetadata();
  }, []);

  // Fetch prediction history when user is authenticated
  useEffect(() => {
    if (user) {
      fetchPredictionHistory();
    }
  }, [user]);

  const fetchPredictionHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:8000/predictions/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const history = await response.json();
        setPredictionHistory(history);
      }
    } catch (err) {
      console.error('Error fetching prediction history:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const token = user ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to get prediction');
      }
      
      const data = await response.json();
      setPrediction(data);
      
      // If user is logged in, refresh the history
      if (user) {
        await fetchPredictionHistory();
      }
    } catch (err) {
      console.error('Prediction error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSelectChange = (name: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [name]: typeof value === 'string' ? value : Number(value),
    }));
  };

  const calculateTotalValue = () => {
    if (!prediction || !formData.area) return 0;
    return prediction.predicted_price * formData.area * 10; // Assuming 10 quintals per hectare
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="predict" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Price Prediction
        </TabsTrigger>
        <TabsTrigger value="trends" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Market Trends
        </TabsTrigger>
        <TabsTrigger 
          value="history" 
          className="flex items-center gap-2"
          disabled={!user}
        >
          <History className="h-4 w-4" />
          {user ? 'My Predictions' : 'Login to View History'}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="predict">
        <Card>
          <CardHeader>
            <CardTitle>Crop Price Prediction</CardTitle>
            <CardDescription>
              Get accurate price predictions for your crops based on various factors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Crop and State */}
                <div className="space-y-4">
                  <h3 className="font-medium">Crop & Location</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="crop">Crop</Label>
                      <Select
                        value={formData.crop}
                        onValueChange={(value) => handleSelectChange('crop', value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a crop" />
                        </SelectTrigger>
                        <SelectContent>
                          {cropData.crops.map((crop) => (
                            <SelectItem key={crop} value={crop}>
                              {crop}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(value) => handleSelectChange('state', value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {cropData.states.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="soil_type">Soil Type</Label>
                      <Select
                        value={formData.soil_type}
                        onValueChange={(value) => handleSelectChange('soil_type', value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select soil type" />
                        </SelectTrigger>
                        <SelectContent>
                          {cropData.soil_types.map((soil) => (
                            <SelectItem key={soil} value={soil}>
                              {soil}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Date and Weather */}
                <div className="space-y-4">
                  <h3 className="font-medium">Date & Weather</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="month">Month</Label>
                      <Select
                        value={formData.month.toString()}
                        onValueChange={(value) => handleSelectChange('month', value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month) => (
                            <SelectItem key={month.value} value={month.value.toString()}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Select
                        value={formData.year.toString()}
                        onValueChange={(value) => handleSelectChange('year', value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="temperature">Temperature (°C)</Label>
                      <Input
                        id="temperature"
                        name="temperature"
                        type="number"
                        min="-10"
                        max="50"
                        step="0.1"
                        value={formData.temperature}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rainfall">Rainfall (mm)</Label>
                      <Input
                        id="rainfall"
                        name="rainfall"
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.rainfall}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="humidity">Humidity (%)</Label>
                      <Input
                        id="humidity"
                        name="humidity"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={formData.humidity}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prev_year_price">Last Year's Price (₹/quintal)</Label>
                      <Input
                        id="prev_year_price"
                        name="prev_year_price"
                        type="number"
                        min="0"
                        step="1"
                        value={formData.prev_year_price}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Area and Calculation */}
                <div className="space-y-4">
                  <h3 className="font-medium">Cultivation Details</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="area">Area (hectares)</Label>
                      <Input
                        id="area"
                        name="area"
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={formData.area}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {prediction && (
                      <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium">Estimated Yield Value</h4>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">
                            ₹{calculateTotalValue().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            for {formData.area} hectare{formData.area !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Based on {prediction.predicted_price.toLocaleString('en-IN')} ₹/quintal × {formData.area} ha × 10 quintals/ha
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Prediction Result */}
                <div className="space-y-4">
                  <h3 className="font-medium">Prediction</h3>
                  <div className="space-y-4">
                    <Button 
                      type="submit" 
                      disabled={loading} 
                      className="w-full"
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Predicting...
                        </>
                      ) : (
                        'Get Price Prediction'
                      )}
                    </Button>

                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {prediction && (
                      <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Predicted Price</h4>
                          {prediction.model_metadata?.r2_score && (
                            <span className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                              R²: {prediction.model_metadata.r2_score.toFixed(3)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-green-700 dark:text-green-300">
                            ₹{prediction.predicted_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-sm text-muted-foreground">per quintal</span>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-green-200 dark:border-green-800">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Confidence Range:</span>
                            <span className="font-medium">
                              ₹{prediction.confidence_interval[0].toLocaleString('en-IN')} - ₹{prediction.confidence_interval[1].toLocaleString('en-IN')}
                            </span>
                          </div>
                          
                          {prediction.model_metadata && (
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Model:</span>
                              <span>{prediction.model_metadata.model_type} (trained on {new Date(prediction.model_metadata.training_date).toLocaleDateString()})</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2">
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Note</AlertTitle>
                            <AlertDescription className="text-xs">
                              This is an estimate based on current market conditions and historical data.
                              Actual prices may vary based on market conditions, demand, and other factors.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="trends">
        <PriceTrends 
          crop={formData.crop || undefined} 
          state={formData.state || undefined} 
        />
      </TabsContent>

      <TabsContent value="history">
        <Card>
          <CardHeader>
            <CardTitle>Prediction History</CardTitle>
            <CardDescription>
              View your previous price predictions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!user ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Please log in to view your prediction history</p>
                <Button onClick={() => {/* Add login redirection */}}>
                  Log In
                </Button>
              </div>
            ) : predictionHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No prediction history found</p>
                <p className="text-sm text-muted-foreground mt-2">Your predictions will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {predictionHistory.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 hover:bg-muted/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">
                          {item.input.crop} in {item.input.state}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ₹{item.result.predicted_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.input.area} ha × {item.result.predicted_price.toFixed(2)} ₹/quintal
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
