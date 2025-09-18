from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
import joblib
from datetime import datetime
import os

# Initialize FastAPI app
app = FastAPI(title="Crop Price Prediction API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the model and encoders
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'crop_price_model.joblib')
ENCODER_PATH = os.path.join(os.path.dirname(__file__), 'models', 'encoders.joblib')

# Sample data for demonstration (in a real app, this would be a database)
CROPS = ["Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Soybean", "Potato", "Onion"]
STATES = ["Andhra Pradesh", "Punjab", "Maharashtra", "Karnataka", "Uttar Pradesh", "Madhya Pradesh"]

# Pydantic models for request/response
class CropPredictionInput(BaseModel):
    crop: str
    state: str
    month: int
    year: int
    area: float  # in hectares
    rainfall: float  # in mm
    temperature: float  # in Celsius
    humidity: float  # in percentage
    
class PredictionResponse(BaseModel):
    predicted_price: float
    confidence_interval: List[float]
    currency: str = "INR"

# Load model and encoders
try:
    model = joblib.load(MODEL_PATH)
    encoders = joblib.load(ENCODER_PATH)
except Exception as e:
    print(f"Error loading model: {e}")
    model = None
    encoders = None

@app.get("/api/crops")
async def get_available_crops():
    """Get list of available crops for prediction"""
    return {"crops": CROPS, "states": STATES}

@app.post("/api/predict", response_model=PredictionResponse)
async def predict_price(input_data: CropPredictionInput):
    """Predict crop price based on input parameters"""
    if model is None or encoders is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Prepare input features
        features = {
            'Crop': [input_data.crop],
            'State': [input_data.state],
            'Month': [input_data.month],
            'Year': [input_data.year],
            'Area': [input_data.area],
            'Rainfall': [input_data.rainfall],
            'Temperature': [input_data.temperature],
            'Humidity': [input_data.humidity]
        }
        
        df = pd.DataFrame(features)
        
        # Encode categorical variables
        for col in ['Crop', 'State']:
            if col in encoders:
                df[col] = encoders[col].transform(df[col])
        
        # Make prediction
        prediction = model.predict(df)[0]
        
        # Simple confidence interval (in a real app, this would be calculated properly)
        confidence = [prediction * 0.9, prediction * 1.1]
        
        return {
            "predicted_price": round(float(prediction), 2),
            "confidence_interval": [round(float(x), 2) for x in confidence],
            "currency": "INR"
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
