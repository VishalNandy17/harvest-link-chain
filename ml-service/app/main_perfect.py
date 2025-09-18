from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import sqlite3
import pandas as pd
import numpy as np
import joblib
import os
import json
import sys
from pathlib import Path

# Add parent directory to path to import training module
sys.path.append(str(Path(__file__).parent.parent))

# Configuration
SECRET_KEY = "harvest-link-chain-secret-key-2024"  # In production, use environment variables
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Database setup
def init_db():
    conn = sqlite3.connect('crop_prediction_perfect.db')
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        full_name TEXT,
        role TEXT DEFAULT 'farmer',
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create predictions history table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        input_data TEXT NOT NULL,
        prediction_result TEXT NOT NULL,
        model_used TEXT DEFAULT 'perfect_ai',
        accuracy_score REAL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Create price alerts table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS price_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        crop TEXT NOT NULL,
        state TEXT,
        target_price REAL NOT NULL,
        current_price REAL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        triggered_at DATETIME,
        alert_type TEXT DEFAULT 'price_reach',
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Create market insights table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS market_insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        crop TEXT NOT NULL,
        state TEXT,
        insight_type TEXT NOT NULL,
        insight_data TEXT NOT NULL,
        confidence_score REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME
    )
    ''')
    
    conn.commit()
    return conn

# Initialize database connection
db = init_db()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Models
class User(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    role: Optional[str] = "farmer"
    is_active: Optional[bool] = True

class UserInDB(User):
    hashed_password: str
    id: int
    created_at: str

class UserCreate(User):
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class PredictionInput(BaseModel):
    crop: str = Field(..., description="Crop type")
    state: str = Field(..., description="State name")
    soil_type: str = Field(..., description="Soil type")
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    temperature: float = Field(..., description="Temperature in Celsius")
    rainfall: float = Field(..., description="Rainfall in mm")
    humidity: float = Field(..., ge=0, le=100, description="Humidity percentage")
    prev_year_price: float = Field(..., gt=0, description="Previous year price")
    area: Optional[float] = Field(None, gt=0, description="Area in hectares")
    date: Optional[str] = Field(None, description="Date in YYYY-MM-DD format")

class PredictionResponse(BaseModel):
    predicted_price: float
    confidence_interval: List[float]
    currency: str = "INR"
    model_metadata: Dict[str, Any]
    market_insights: Optional[Dict[str, Any]] = None
    recommendations: Optional[List[str]] = None

class PriceAlertCreate(BaseModel):
    crop: str
    state: Optional[str] = None
    target_price: float
    alert_type: str = "price_reach"

class MarketInsightRequest(BaseModel):
    crop: str
    state: Optional[str] = None
    insight_type: str = "price_trend"  # price_trend, demand_forecast, weather_impact

class BatchPredictionRequest(BaseModel):
    predictions: List[PredictionInput]
    include_insights: bool = True

class BatchPredictionResponse(BaseModel):
    results: List[PredictionResponse]
    summary: Dict[str, Any]

# Authentication functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_user(username: str):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    user_data = cursor.fetchone()
    if user_data:
        columns = [column[0] for column in cursor.description]
        user_dict = dict(zip(columns, user_data))
        return UserInDB(**user_dict)
    return None

def authenticate_user(username: str, password: str):
    user = get_user(username)
    if not user or not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

# Initialize FastAPI app
app = FastAPI(
    title="Perfect AI Crop Price Prediction API",
    description="Advanced AI-powered crop price prediction with market insights",
    version="2.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the perfect AI model
PREDICT_FN = None
try:
    from train_perfect_ai_model import create_prediction_pipeline
    PREDICT_FN = create_prediction_pipeline()
    print("✅ Perfect AI model loaded successfully!")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    print("Training new model...")
    try:
        from train_perfect_ai_model import PerfectCropPricePredictor
        predictor = PerfectCropPricePredictor()
        predictor.train('data/processed/crop_prices.csv')
        PREDICT_FN = predictor.predict
        print("✅ New model trained and loaded!")
    except Exception as e2:
        print(f"❌ Failed to train model: {e2}")

# Helper functions
def generate_market_insights(crop: str, state: str = None) -> Dict[str, Any]:
    """Generate market insights based on crop and state"""
    insights = {
        "price_trend": "Stable to increasing",
        "demand_forecast": "High demand expected",
        "weather_impact": "Favorable conditions",
        "market_volatility": "Low to moderate",
        "recommended_actions": [
            "Monitor weather forecasts closely",
            "Consider staggered selling strategy",
            "Check local market prices regularly"
        ]
    }
    
    # Crop-specific insights
    if crop.lower() in ['rice', 'wheat']:
        insights["price_trend"] = "Stable with seasonal variations"
        insights["demand_forecast"] = "Consistent high demand"
    elif crop.lower() in ['cotton', 'sugarcane']:
        insights["price_trend"] = "Volatile with export dependencies"
        insights["market_volatility"] = "High"
    elif crop.lower() in ['potato', 'onion']:
        insights["price_trend"] = "Highly seasonal"
        insights["market_volatility"] = "Very high"
        insights["recommended_actions"].append("Consider cold storage for better prices")
    
    return insights

def generate_recommendations(prediction: Dict[str, Any], input_data: Dict[str, Any]) -> List[str]:
    """Generate actionable recommendations based on prediction"""
    recommendations = []
    
    predicted_price = prediction['predicted_price']
    confidence = prediction['confidence_interval']
    
    # Price-based recommendations
    if predicted_price > 3000:
        recommendations.append("High price predicted - consider selling soon")
    elif predicted_price < 1500:
        recommendations.append("Low price predicted - consider holding or finding better markets")
    
    # Weather-based recommendations
    if input_data.get('temperature', 0) > 35:
        recommendations.append("High temperature detected - monitor crop health closely")
    if input_data.get('rainfall', 0) < 50:
        recommendations.append("Low rainfall - consider irrigation if possible")
    
    # Seasonal recommendations
    month = input_data.get('month', 1)
    if month in [10, 11, 12, 1, 2]:  # Winter
        recommendations.append("Winter season - prices typically stable")
    elif month in [6, 7, 8, 9]:  # Monsoon
        recommendations.append("Monsoon season - monitor for weather-related price fluctuations")
    
    return recommendations

# Routes
@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/register", response_model=User)
async def register_user(user: UserCreate):
    # Check if username or email already exists
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ? OR email = ?", 
                  (user.username, user.email))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    cursor.execute(
        """
        INSERT INTO users (username, email, hashed_password, full_name, role)
        VALUES (?, ?, ?, ?, ?)
        """,
        (user.username, user.email, hashed_password, user.full_name, user.role)
    )
    db.commit()
    
    # Return the created user (without password)
    cursor.execute("SELECT id, username, email, full_name, role, is_active, created_at FROM users WHERE username = ?", 
                  (user.username,))
    user_data = cursor.fetchone()
    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, user_data))

@app.post("/predict", response_model=PredictionResponse)
async def predict_price(
    input_data: PredictionInput,
    current_user: User = Depends(get_current_user)
):
    if not PREDICT_FN:
        raise HTTPException(status_code=503, detail="Prediction service not available")
    
    try:
        # Convert input data to dict
        input_dict = input_data.dict()
        
        # Make prediction
        result = PREDICT_FN(input_dict)
        
        # Generate market insights
        market_insights = generate_market_insights(
            input_data.crop, 
            input_data.state
        )
        
        # Generate recommendations
        recommendations = generate_recommendations(result, input_dict)
        
        # Add insights and recommendations to result
        result['market_insights'] = market_insights
        result['recommendations'] = recommendations
        
        # Save prediction to history
        cursor = db.cursor()
        cursor.execute(
            """
            INSERT INTO predictions (user_id, input_data, prediction_result, model_used)
            VALUES (?, ?, ?, ?)
            """,
            (current_user.id, json.dumps(input_dict), json.dumps(result), 'perfect_ai')
        )
        db.commit()
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(
    request: BatchPredictionRequest,
    current_user: User = Depends(get_current_user)
):
    if not PREDICT_FN:
        raise HTTPException(status_code=503, detail="Prediction service not available")
    
    try:
        results = []
        total_predictions = len(request.predictions)
        
        for i, input_data in enumerate(request.predictions):
            input_dict = input_data.dict()
            result = PREDICT_FN(input_dict)
            
            if request.include_insights:
                result['market_insights'] = generate_market_insights(
                    input_data.crop, 
                    input_data.state
                )
                result['recommendations'] = generate_recommendations(result, input_dict)
            
            results.append(result)
            
            # Save each prediction
            cursor = db.cursor()
            cursor.execute(
                """
                INSERT INTO predictions (user_id, input_data, prediction_result, model_used)
                VALUES (?, ?, ?, ?)
                """,
                (current_user.id, json.dumps(input_dict), json.dumps(result), 'perfect_ai')
            )
            db.commit()
        
        # Generate summary
        avg_price = sum(r['predicted_price'] for r in results) / len(results)
        price_range = [
            min(r['predicted_price'] for r in results),
            max(r['predicted_price'] for r in results)
        ]
        
        summary = {
            "total_predictions": total_predictions,
            "average_price": round(avg_price, 2),
            "price_range": [round(p, 2) for p in price_range],
            "currency": "INR"
        }
        
        return BatchPredictionResponse(results=results, summary=summary)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/predictions/history", response_model=List[Dict[str, Any]])
async def get_prediction_history(
    limit: int = 10,
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT id, timestamp, input_data, prediction_result, model_used
        FROM predictions 
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
        """,
        (current_user.id, limit, offset)
    )
    
    predictions = []
    for row in cursor.fetchall():
        prediction_id, timestamp, input_data, prediction_result, model_used = row
        predictions.append({
            "id": prediction_id,
            "timestamp": timestamp,
            "input_data": json.loads(input_data),
            "prediction_result": json.loads(prediction_result),
            "model_used": model_used
        })
    
    return predictions

@app.post("/alerts", status_code=status.HTTP_201_CREATED)
async def create_price_alert(
    alert: PriceAlertCreate,
    current_user: User = Depends(get_current_user)
):
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO price_alerts (user_id, crop, state, target_price, alert_type)
        VALUES (?, ?, ?, ?, ?)
        """,
        (current_user.id, alert.crop, alert.state, alert.target_price, alert.alert_type)
    )
    db.commit()
    
    return {"message": "Price alert created successfully"}

@app.get("/alerts", response_model=List[Dict[str, Any]])
async def get_price_alerts(
    active_only: bool = True,
    current_user: User = Depends(get_current_user)
):
    query = """
    SELECT id, crop, state, target_price, current_price, is_active, created_at, triggered_at, alert_type
    FROM price_alerts
    WHERE user_id = ?
    """
    
    params = [current_user.id]
    
    if active_only:
        query += " AND is_active = 1"
    
    query += " ORDER BY created_at DESC"
    
    cursor = db.cursor()
    cursor.execute(query, params)
    
    alerts = []
    for row in cursor.fetchall():
        (alert_id, crop, state, target_price, current_price, is_active, 
         created_at, triggered_at, alert_type) = row
        alerts.append({
            "id": alert_id,
            "crop": crop,
            "state": state,
            "target_price": target_price,
            "current_price": current_price,
            "is_active": bool(is_active),
            "created_at": created_at,
            "triggered_at": triggered_at,
            "alert_type": alert_type
        })
    
    return alerts

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
        "crop_categories": ["Cereal", "Fiber", "Sugar", "Oilseed", "Vegetable", "Spice", "Pulse"]
    }

@app.get("/insights/market")
async def get_market_insights(
    crop: str,
    state: Optional[str] = None,
    insight_type: str = "price_trend"
):
    """Get market insights for a specific crop and state"""
    insights = generate_market_insights(crop, state)
    
    # Add additional data based on insight type
    if insight_type == "demand_forecast":
        insights["demand_score"] = np.random.uniform(0.6, 1.0)
        insights["supply_score"] = np.random.uniform(0.5, 0.9)
    elif insight_type == "weather_impact":
        insights["weather_score"] = np.random.uniform(0.7, 1.0)
        insights["risk_factors"] = ["Temperature variations", "Rainfall patterns"]
    
    return {
        "crop": crop,
        "state": state,
        "insight_type": insight_type,
        "insights": insights,
        "generated_at": datetime.now().isoformat()
    }

@app.get("/analytics/dashboard")
async def get_analytics_dashboard(current_user: User = Depends(get_current_user)):
    """Get analytics dashboard data for the user"""
    cursor = db.cursor()
    
    # Get prediction statistics
    cursor.execute(
        """
        SELECT COUNT(*) as total_predictions,
               AVG(JSON_EXTRACT(prediction_result, '$.predicted_price')) as avg_predicted_price,
               MIN(JSON_EXTRACT(prediction_result, '$.predicted_price')) as min_price,
               MAX(JSON_EXTRACT(prediction_result, '$.predicted_price')) as max_price
        FROM predictions 
        WHERE user_id = ?
        """,
        (current_user.id,)
    )
    
    stats = cursor.fetchone()
    
    # Get recent predictions
    cursor.execute(
        """
        SELECT crop, JSON_EXTRACT(prediction_result, '$.predicted_price') as price, timestamp
        FROM predictions 
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT 5
        """,
        (current_user.id,)
    )
    
    recent_predictions = cursor.fetchall()
    
    # Get active alerts
    cursor.execute(
        """
        SELECT COUNT(*) as active_alerts
        FROM price_alerts 
        WHERE user_id = ? AND is_active = 1
        """,
        (current_user.id,)
    )
    
    active_alerts = cursor.fetchone()[0]
    
    return {
        "user_id": current_user.id,
        "statistics": {
            "total_predictions": stats[0] or 0,
            "average_predicted_price": round(stats[1] or 0, 2),
            "price_range": [round(stats[2] or 0, 2), round(stats[3] or 0, 2)],
            "active_alerts": active_alerts
        },
        "recent_predictions": [
            {
                "crop": pred[0],
                "price": round(pred[1], 2),
                "timestamp": pred[2]
            }
            for pred in recent_predictions
        ],
        "generated_at": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": PREDICT_FN is not None,
        "database_connected": True,
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

