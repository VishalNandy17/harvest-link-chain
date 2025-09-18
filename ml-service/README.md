# Crop Price Prediction ML Service

This service provides machine learning-based crop price predictions for the Harvest Link Chain project.

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Train the model:
   ```bash
   python train_model.py
   ```

## Running the Service

Start the FastAPI server:
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Endpoints

- `GET /api/crops` - Get list of available crops and states
- `POST /api/predict` - Predict crop price

### Prediction Request Example

```json
{
  "crop": "Rice",
  "state": "Punjab",
  "month": 10,
  "year": 2023,
  "area": 5.0,
  "rainfall": 120.5,
  "temperature": 28.0,
  "humidity": 65.0
}
```

### Response Example

```json
{
  "predicted_price": 2850.75,
  "confidence_interval": [2565.68, 3135.83],
  "currency": "INR"
}
```

## Integration with Frontend

To integrate with your React frontend, you can create a service like this:

```typescript
// src/services/pricePrediction.ts
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

export async function predictCropPrice(input: PredictionInput): Promise<PredictionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    throw new Error('Failed to get prediction');
  }
  
  return response.json();
}

export async function getAvailableCrops() {
  const response = await fetch(`${API_BASE_URL}/api/crops`);
  if (!response.ok) {
    throw new Error('Failed to fetch available crops');
  }
  return response.json();
}
```
