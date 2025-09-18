from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import pandas as pd
import joblib
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

# Models
class PredictionInput(BaseModel):
    crop: str = Field(..., description="Crop type")
    state: str = Field(..., description="State name")
    soil_type: str = Field(..., description="Soil type")
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    temperature: float = Field(..., description="Temperature in Celsius")
    rainfall: float = Field(..., description="Rainfall in mm")
    humidity: float = Field(..., ge=0, le=100, description="Humidity percentage")
    prev_year_price: float = Field(..., gt=0, description="Previous year price")

class PredictionResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    
    predicted_price: float
    confidence_interval: List[float]
    currency: str = "INR"
    model_metadata: Dict[str, Any]

# Initialize FastAPI app
app = FastAPI(
    title="AI Crop Price Prediction API",
    description="Simple and fast AI-powered crop price prediction",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the model
MODEL = None
try:
    MODEL = joblib.load('models/quick_crop_price_model.pkl')
    print("✅ AI Model loaded successfully!")
except Exception as e:
    print(f"❌ Error loading model: {e}")

def predict_price(input_data: PredictionInput) -> PredictionResponse:
    """Make prediction using the loaded model"""
    if MODEL is None:
        raise HTTPException(status_code=503, detail="Model not available")
    
    try:
        # Convert input to DataFrame
        df_input = pd.DataFrame([input_data.dict()])
        
        # Apply feature engineering
        df_input['temp_rainfall_ratio'] = df_input['temperature'] / (df_input['rainfall'] + 1)
        df_input['humidity_temp_interaction'] = df_input['humidity'] * df_input['temperature']
        df_input['season'] = df_input['month'].map({
            12: 'Winter', 1: 'Winter', 2: 'Winter',
            3: 'Spring', 4: 'Spring', 5: 'Spring',
            6: 'Summer', 7: 'Summer', 8: 'Summer',
            9: 'Autumn', 10: 'Autumn', 11: 'Autumn'
        })
        
        # Make prediction
        prediction = MODEL.predict(df_input)[0]
        
        # Calculate confidence interval
        confidence_interval = [
            prediction * 0.9,  # 10% below
            prediction * 1.1   # 10% above
        ]
        
        return PredictionResponse(
            predicted_price=round(prediction, 2),
            confidence_interval=[round(ci, 2) for ci in confidence_interval],
            currency="INR",
            model_metadata={
                'model_type': 'RandomForest',
                'features_used': len(df_input.columns),
                'prediction_timestamp': datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Routes
@app.post("/predict", response_model=PredictionResponse)
async def predict_crop_price(input_data: PredictionInput):
    """Predict crop price using AI"""
    return predict_price(input_data)

@app.get("/crops/available")
async def get_available_crops():
    """Get list of available crops, states, and soil types"""
    return {
        "crops": [
            "Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Soybean", 
            "Potato", "Onion", "Groundnut", "Turmeric", "Jowar", "Bajra", 
            "Ragi", "Arhar"
        ],
        "states": [
            "Punjab", "Maharashtra", "Karnataka", "Uttar Pradesh", 
            "Madhya Pradesh", "Andhra Pradesh", "West Bengal", "Gujarat", 
            "Rajasthan", "Haryana"
        ],
        "soil_types": ["Alluvial", "Black", "Red", "Laterite", "Arid", "Mountain"],
        "seasons": ["Winter", "Spring", "Summer", "Autumn"]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": MODEL is not None,
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "AI Crop Price Prediction API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "predict": "/predict"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
