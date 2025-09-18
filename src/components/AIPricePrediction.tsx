import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Brain, TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import aiPredictionService, { PredictionInput, PredictionResponse } from '@/services/aiPredictionService';

interface AIPricePredictionProps {
  onPredictionComplete?: (prediction: PredictionResponse) => void;
}

export default function AIPricePrediction({ onPredictionComplete }: AIPricePredictionProps) {
  const [formData, setFormData] = useState<Partial<PredictionInput>>({
    crop: '',
    state: '',
    soil_type: '',
    month: new Date().getMonth() + 1,
    temperature: 25,
    rainfall: 100,
    humidity: 60,
    prev_year_price: 2000,
    area: 1,
  });

  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableData, setAvailableData] = useState<any>(null);
  const [predictionHistory, setPredictionHistory] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthentication();
    loadAvailableData();
    loadPredictionHistory();
  }, []);

  const checkAuthentication = () => {
    setIsAuthenticated(aiPredictionService.isAuthenticated());
  };

  const loadAvailableData = async () => {
    try {
      const data = await aiPredictionService.getAvailableCrops();
      setAvailableData(data);
    } catch (error) {
      console.error('Failed to load available data:', error);
    }
  };

  const loadPredictionHistory = async () => {
    if (!isAuthenticated) return;
    
    try {
      const history = await aiPredictionService.getPredictionHistory(5);
      setPredictionHistory(history);
    } catch (error) {
      console.error('Failed to load prediction history:', error);
    }
  };

  const handleInputChange = (field: keyof PredictionInput, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePredict = async () => {
    if (!isAuthenticated) {
      setError('Please login to use AI predictions');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const input = aiPredictionService.formatPredictionInput(formData);
      const errors = aiPredictionService.validatePredictionInput(input);
      
      if (errors.length > 0) {
        setError(errors.join(', '));
        setLoading(false);
        return;
      }

      const result = await aiPredictionService.predictPrice(input);
      setPrediction(result);
      onPredictionComplete?.(result);
      loadPredictionHistory(); // Refresh history
    } catch (error: any) {
      setError(error.message || 'Failed to get prediction');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getConfidenceColor = (confidence: [number, number]) => {
    const range = confidence[1] - confidence[0];
    const percentage = (range / confidence[1]) * 100;
    
    if (percentage < 10) return 'text-green-600';
    if (percentage < 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Crop Price Prediction
          </CardTitle>
          <CardDescription>
            Get accurate crop price predictions using advanced machine learning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="prediction" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prediction">Prediction</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="prediction" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="crop">Crop Type</Label>
                  <Select value={formData.crop} onValueChange={(value) => handleInputChange('crop', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select crop" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableData?.crops?.map((crop: string) => (
                        <SelectItem key={crop} value={crop}>{crop}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableData?.states?.map((state: string) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="soil_type">Soil Type</Label>
                  <Select value={formData.soil_type} onValueChange={(value) => handleInputChange('soil_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select soil type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableData?.soil_types?.map((soil: string) => (
                        <SelectItem key={soil} value={soil}>{soil}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="month">Month</Label>
                  <Select value={formData.month?.toString()} onValueChange={(value) => handleInputChange('month', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {new Date(2024, i, 1).toLocaleString('default', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    value={formData.temperature}
                    onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                    placeholder="25"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rainfall">Rainfall (mm)</Label>
                  <Input
                    id="rainfall"
                    type="number"
                    value={formData.rainfall}
                    onChange={(e) => handleInputChange('rainfall', parseFloat(e.target.value))}
                    placeholder="100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="humidity">Humidity (%)</Label>
                  <Input
                    id="humidity"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.humidity}
                    onChange={(e) => handleInputChange('humidity', parseFloat(e.target.value))}
                    placeholder="60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prev_year_price">Previous Year Price (₹)</Label>
                  <Input
                    id="prev_year_price"
                    type="number"
                    value={formData.prev_year_price}
                    onChange={(e) => handleInputChange('prev_year_price', parseFloat(e.target.value))}
                    placeholder="2000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">Area (hectares)</Label>
                  <Input
                    id="area"
                    type="number"
                    step="0.1"
                    value={formData.area}
                    onChange={(e) => handleInputChange('area', parseFloat(e.target.value))}
                    placeholder="1"
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handlePredict} 
                disabled={loading || !isAuthenticated}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Predicting...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Predict Price
                  </>
                )}
              </Button>

              {!isAuthenticated && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Please login to use AI predictions. You can register a new account or use existing credentials.
                  </AlertDescription>
                </Alert>
              )}

              {prediction && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Prediction Result
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {formatCurrency(prediction.predicted_price)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Predicted Price per Quintal
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Confidence Interval</Label>
                        <div className={`text-lg font-semibold ${getConfidenceColor(prediction.confidence_interval)}`}>
                          {formatCurrency(prediction.confidence_interval[0])} - {formatCurrency(prediction.confidence_interval[1])}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Model Type</Label>
                        <div className="text-lg font-semibold">
                          {prediction.model_metadata.model_type}
                        </div>
                      </div>
                    </div>

                    {prediction.market_insights && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Market Insights</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <Badge variant="outline">
                            Trend: {prediction.market_insights.price_trend}
                          </Badge>
                          <Badge variant="outline">
                            Demand: {prediction.market_insights.demand_forecast}
                          </Badge>
                          <Badge variant="outline">
                            Weather: {prediction.market_insights.weather_impact}
                          </Badge>
                          <Badge variant="outline">
                            Volatility: {prediction.market_insights.market_volatility}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {prediction.recommendations && prediction.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Recommendations</Label>
                        <ul className="space-y-1">
                          {prediction.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Recent Predictions</h3>
                {predictionHistory.length === 0 ? (
                  <p className="text-gray-500">No prediction history found</p>
                ) : (
                  <div className="space-y-2">
                    {predictionHistory.map((pred, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold">
                                {pred.input_data.crop} - {pred.input_data.state}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(pred.timestamp).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">
                                {formatCurrency(pred.prediction_result.predicted_price)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {pred.model_used}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Market Insights</h3>
                <p className="text-gray-500">
                  Get detailed market insights and recommendations for your crops
                </p>
                {/* Add market insights component here */}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

