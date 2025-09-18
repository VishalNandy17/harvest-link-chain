/**
 * Simple AI Crop Price Prediction Service
 * Works without authentication for easy integration
 */

export interface PredictionInput {
  crop: string;
  state: string;
  soil_type: string;
  month: number;
  temperature: number;
  rainfall: number;
  humidity: number;
  prev_year_price: number;
  area?: number;
}

export interface PredictionResponse {
  predicted_price: number;
  confidence_interval: [number, number];
  currency: string;
  model_metadata: {
    model_type: string;
    features_used: number;
    prediction_timestamp: string;
  };
  market_insights?: {
    price_trend: string;
    demand_forecast: string;
    weather_impact: string;
    market_volatility: string;
    recommended_actions: string[];
  };
  recommendations?: string[];
}

class SimpleAIService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Prediction methods
  async predictPrice(input: PredictionInput): Promise<PredictionResponse> {
    try {
      return await this.makeRequest<PredictionResponse>('/predict', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    } catch (error) {
      // Fallback to mock prediction if AI service is not available
      console.warn('AI service unavailable, using mock prediction:', error);
      return this.getMockPrediction(input);
    }
  }

  async getAvailableCrops(): Promise<{
    crops: string[];
    states: string[];
    soil_types: string[];
    seasons: string[];
  }> {
    try {
      return await this.makeRequest('/crops/available');
    } catch (error) {
      // Fallback to static data
      return {
        crops: [
          "Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Soybean", 
          "Potato", "Onion", "Groundnut", "Turmeric", "Jowar", "Bajra", 
          "Ragi", "Arhar"
        ],
        states: [
          "Punjab", "Maharashtra", "Karnataka", "Uttar Pradesh", 
          "Madhya Pradesh", "Andhra Pradesh", "West Bengal", "Gujarat", 
          "Rajasthan", "Haryana"
        ],
        soil_types: ["Alluvial", "Black", "Red", "Laterite", "Arid", "Mountain"],
        seasons: ["Winter", "Spring", "Summer", "Autumn"]
      };
    }
  }

  async healthCheck(): Promise<{
    status: string;
    model_loaded: boolean;
    timestamp: string;
    version: string;
  }> {
    try {
      return await this.makeRequest('/health');
    } catch (error) {
      return {
        status: 'unavailable',
        model_loaded: false,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
    }
  }

  // Mock prediction for fallback
  private getMockPrediction(input: PredictionInput): PredictionResponse {
    // Simple price calculation based on input
    const basePrices: { [key: string]: number } = {
      'Rice': 2000, 'Wheat': 2200, 'Maize': 1800, 'Cotton': 6000, 'Sugarcane': 300,
      'Soybean': 4000, 'Potato': 1200, 'Onion': 2000, 'Groundnut': 5500,
      'Turmeric': 7000, 'Jowar': 2800, 'Bajra': 2200, 'Ragi': 3500, 'Arhar': 6500
    };

    const stateFactors: { [key: string]: number } = {
      'Punjab': 1.1, 'Maharashtra': 1.0, 'Karnataka': 0.95, 'Uttar Pradesh': 0.9,
      'Madhya Pradesh': 0.9, 'Andhra Pradesh': 1.05, 'West Bengal': 0.95,
      'Gujarat': 1.0, 'Rajasthan': 0.85, 'Haryana': 1.1
    };

    const soilFactors: { [key: string]: number } = {
      'Alluvial': 1.1, 'Black': 1.05, 'Red': 1.0, 'Laterite': 0.95,
      'Arid': 0.9, 'Mountain': 0.85
    };

    const basePrice = basePrices[input.crop] || 2000;
    const stateFactor = stateFactors[input.state] || 1.0;
    const soilFactor = soilFactors[input.soil_type] || 1.0;
    const weatherFactor = 1 + (input.temperature - 25) * 0.01 + (input.rainfall - 100) * 0.001;
    const seasonalFactor = input.month >= 10 && input.month <= 12 ? 1.1 : 1.0;

    const predictedPrice = basePrice * stateFactor * soilFactor * weatherFactor * seasonalFactor;
    const confidence = predictedPrice * 0.1; // 10% confidence interval

    return {
      predicted_price: Math.round(predictedPrice),
      confidence_interval: [
        Math.round(predictedPrice - confidence),
        Math.round(predictedPrice + confidence)
      ],
      currency: 'INR',
      model_metadata: {
        model_type: 'Mock Model',
        features_used: 8,
        prediction_timestamp: new Date().toISOString()
      },
      market_insights: {
        price_trend: predictedPrice > input.prev_year_price ? 'Increasing' : 'Stable',
        demand_forecast: 'Moderate to High',
        weather_impact: input.rainfall > 150 ? 'Favorable' : 'Monitor conditions',
        market_volatility: 'Low to Moderate',
        recommended_actions: [
          'Monitor weather forecasts',
          'Check local market prices regularly',
          'Consider staggered selling strategy'
        ]
      },
      recommendations: this.generateRecommendations(input, predictedPrice)
    };
  }

  private generateRecommendations(input: PredictionInput, predictedPrice: number): string[] {
    const recommendations: string[] = [];

    if (predictedPrice > input.prev_year_price * 1.1) {
      recommendations.push('High price predicted - consider selling soon');
    } else if (predictedPrice < input.prev_year_price * 0.9) {
      recommendations.push('Low price predicted - consider holding or finding better markets');
    }

    if (input.temperature > 35) {
      recommendations.push('High temperature detected - monitor crop health closely');
    }

    if (input.rainfall < 50) {
      recommendations.push('Low rainfall - consider irrigation if possible');
    }

    if (input.month >= 10 && input.month <= 12) {
      recommendations.push('Winter season - prices typically stable');
    } else if (input.month >= 6 && input.month <= 9) {
      recommendations.push('Monsoon season - monitor for weather-related price fluctuations');
    }

    return recommendations;
  }

  // Helper method to format prediction input
  formatPredictionInput(formData: any): PredictionInput {
    return {
      crop: formData.crop || 'Rice',
      state: formData.state || 'Punjab',
      soil_type: formData.soil_type || 'Alluvial',
      month: parseInt(formData.month) || new Date().getMonth() + 1,
      temperature: parseFloat(formData.temperature) || 25,
      rainfall: parseFloat(formData.rainfall) || 100,
      humidity: parseFloat(formData.humidity) || 60,
      prev_year_price: parseFloat(formData.prev_year_price) || 2000,
      area: formData.area ? parseFloat(formData.area) : undefined,
    };
  }

  // Helper method to validate prediction input
  validatePredictionInput(input: PredictionInput): string[] {
    const errors: string[] = [];

    if (!input.crop) errors.push('Crop is required');
    if (!input.state) errors.push('State is required');
    if (!input.soil_type) errors.push('Soil type is required');
    if (input.month < 1 || input.month > 12) errors.push('Month must be between 1 and 12');
    if (input.temperature < -50 || input.temperature > 60) errors.push('Temperature must be between -50°C and 60°C');
    if (input.rainfall < 0) errors.push('Rainfall cannot be negative');
    if (input.humidity < 0 || input.humidity > 100) errors.push('Humidity must be between 0% and 100%');
    if (input.prev_year_price <= 0) errors.push('Previous year price must be positive');

    return errors;
  }
}

// Create singleton instance
export const simpleAIService = new SimpleAIService();

// Export types and service
export default simpleAIService;

