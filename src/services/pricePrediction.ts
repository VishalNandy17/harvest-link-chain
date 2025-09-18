const API_BASE_URL = 'http://localhost:8000';

export interface PredictionInput {
  crop: string;
  state: string;
  month: number;
  year: number;
  area: number;
  rainfall: number;
  temperature: number;
  humidity: number;
}

export interface PredictionResponse {
  predicted_price: number;
  confidence_interval: [number, number];
  currency: string;
}

export interface CropData {
  crops: string[];
  states: string[];
}

export async function predictCropPrice(input: PredictionInput): Promise<PredictionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to get prediction');
  }
  
  return response.json();
}

export async function getAvailableCrops(): Promise<CropData> {
  const response = await fetch(`${API_BASE_URL}/api/crops`);
  if (!response.ok) {
    // Fallback to default data if API is not available
    return {
      crops: ["Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Soybean", "Potato", "Onion"],
      states: ["Andhra Pradesh", "Punjab", "Maharashtra", "Karnataka", "Uttar Pradesh", "Madhya Pradesh"]
    };
  }
  return response.json();
}
