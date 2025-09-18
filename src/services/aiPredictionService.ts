/**
 * Perfect AI Crop Price Prediction Service
 * Integrates with the enhanced ML service for accurate price predictions
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
  date?: string;
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

export interface BatchPredictionRequest {
  predictions: PredictionInput[];
  include_insights: boolean;
}

export interface BatchPredictionResponse {
  results: PredictionResponse[];
  summary: {
    total_predictions: number;
    average_price: number;
    price_range: [number, number];
    currency: string;
  };
}

export interface MarketInsight {
  crop: string;
  state?: string;
  insight_type: string;
  insights: any;
  generated_at: string;
}

export interface AnalyticsDashboard {
  user_id: number;
  statistics: {
    total_predictions: number;
    average_predicted_price: number;
    price_range: [number, number];
    active_alerts: number;
  };
  recent_predictions: Array<{
    crop: string;
    price: number;
    timestamp: string;
  }>;
  generated_at: string;
}

class AIPredictionService {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    this.loadToken();
  }

  private loadToken() {
    this.token = localStorage.getItem('ai_prediction_token');
  }

  private saveToken(token: string) {
    this.token = token;
    localStorage.setItem('ai_prediction_token', token);
  }

  private clearToken() {
    this.token = null;
    localStorage.removeItem('ai_prediction_token');
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

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error('Authentication failed. Please login again.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Authentication methods
  async login(username: string, password: string): Promise<{ access_token: string; token_type: string }> {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${this.baseUrl}/token`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Login failed');
    }

    const data = await response.json();
    this.saveToken(data.access_token);
    return data;
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
    role?: string;
  }): Promise<any> {
    return this.makeRequest('/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout() {
    this.clearToken();
  }

  // Prediction methods
  async predictPrice(input: PredictionInput): Promise<PredictionResponse> {
    return this.makeRequest<PredictionResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async predictBatch(request: BatchPredictionRequest): Promise<BatchPredictionResponse> {
    return this.makeRequest<BatchPredictionResponse>('/predict/batch', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getPredictionHistory(limit: number = 10, offset: number = 0): Promise<any[]> {
    return this.makeRequest<any[]>(`/predictions/history?limit=${limit}&offset=${offset}`);
  }

  // Market insights
  async getMarketInsights(
    crop: string,
    state?: string,
    insightType: string = 'price_trend'
  ): Promise<MarketInsight> {
    const params = new URLSearchParams({ crop, insight_type: insightType });
    if (state) params.append('state', state);

    return this.makeRequest<MarketInsight>(`/insights/market?${params}`);
  }

  // Analytics
  async getAnalyticsDashboard(): Promise<AnalyticsDashboard> {
    return this.makeRequest<AnalyticsDashboard>('/analytics/dashboard');
  }

  // Available data
  async getAvailableCrops(): Promise<{
    crops: string[];
    states: string[];
    soil_types: string[];
    crop_categories: string[];
  }> {
    return this.makeRequest('/crops/available');
  }

  // Price alerts
  async createPriceAlert(alert: {
    crop: string;
    state?: string;
    target_price: number;
    alert_type?: string;
  }): Promise<{ message: string }> {
    return this.makeRequest('/alerts', {
      method: 'POST',
      body: JSON.stringify(alert),
    });
  }

  async getPriceAlerts(activeOnly: boolean = true): Promise<any[]> {
    return this.makeRequest<any[]>(`/alerts?active_only=${activeOnly}`);
  }

  // Health check
  async healthCheck(): Promise<{
    status: string;
    model_loaded: boolean;
    database_connected: boolean;
    timestamp: string;
    version: string;
  }> {
    return this.makeRequest('/health');
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  // Helper method to format prediction input for the UI
  formatPredictionInput(formData: any): PredictionInput {
    return {
      crop: formData.crop,
      state: formData.state,
      soil_type: formData.soil_type,
      month: parseInt(formData.month),
      temperature: parseFloat(formData.temperature),
      rainfall: parseFloat(formData.rainfall),
      humidity: parseFloat(formData.humidity),
      prev_year_price: parseFloat(formData.prev_year_price),
      area: formData.area ? parseFloat(formData.area) : undefined,
      date: formData.date || new Date().toISOString().split('T')[0],
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
export const aiPredictionService = new AIPredictionService();

// Export types and service
export default aiPredictionService;

