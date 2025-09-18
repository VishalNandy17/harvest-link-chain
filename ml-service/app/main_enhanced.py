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
from typing import List, Optional, Dict, Any

# Configuration
SECRET_KEY = "your-secret-key-here"  # In production, use environment variables
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Database setup
def init_db():
    conn = sqlite3.connect('crop_prediction.db')
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        full_name TEXT,
        is_active BOOLEAN DEFAULT TRUE
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
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Create price alerts table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS price_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        crop TEXT NOT NULL,
        target_price REAL NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        triggered_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id)
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
    is_active: Optional[bool] = True

class UserInDB(User):
    hashed_password: str

class UserCreate(User):
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class PredictionInput(BaseModel):
    crop: str
    state: str
    soil_type: str
    month: int = Field(..., ge=1, le=12)
    temperature: float
    rainfall: float
    humidity: float
    prev_year_price: float
    area: float = Field(..., gt=0, description="Area in hectares")

class PredictionResponse(BaseModel):
    predicted_price: float
    confidence_interval: List[float]
    currency: str = "INR"
    model_metadata: Dict[str, Any]

class PriceAlertCreate(BaseModel):
    crop: str
    target_price: float

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
app = FastAPI(title="Enhanced Crop Price Prediction API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the enhanced model and prediction function
PREDICT_FN = None
try:
    from train_enhanced_model import create_prediction_pipeline
    PREDICT_FN = create_prediction_pipeline()
except Exception as e:
    print(f"Error loading model: {e}")

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
        INSERT INTO users (username, email, hashed_password, full_name)
        VALUES (?, ?, ?, ?)
        """,
        (user.username, user.email, hashed_password, user.full_name)
    )
    db.commit()
    
    # Return the created user (without password)
    cursor.execute("SELECT id, username, email, full_name, is_active FROM users WHERE username = ?", 
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
        # Convert input data to dict and add derived fields
        input_dict = input_data.dict()
        
        # Make prediction
        result = PREDICT_FN(input_dict)
        
        # Save prediction to history
        cursor = db.cursor()
        cursor.execute(
            """
            INSERT INTO predictions (user_id, input_data, prediction_result)
            VALUES (?, ?, ?)
            """,
            (current_user.id, json.dumps(input_dict), json.dumps(result))
        )
        db.commit()
        
        return result
        
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
        SELECT id, timestamp, input_data, prediction_result 
        FROM predictions 
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
        """,
        (current_user.id, limit, offset)
    )
    
    predictions = []
    for row in cursor.fetchall():
        prediction_id, timestamp, input_data, prediction_result = row
        predictions.append({
            "id": prediction_id,
            "timestamp": timestamp,
            "input_data": json.loads(input_data),
            "prediction_result": json.loads(prediction_result)
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
        INSERT INTO price_alerts (user_id, crop, target_price)
        VALUES (?, ?, ?)
        """,
        (current_user.id, alert.crop, alert.target_price)
    )
    db.commit()
    
    return {"message": "Price alert created successfully"}

@app.get("/alerts", response_model=List[Dict[str, Any]])
async def get_price_alerts(
    active_only: bool = True,
    current_user: User = Depends(get_current_user)
):
    query = """
    SELECT id, crop, target_price, is_active, created_at, triggered_at
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
        (alert_id, crop, target_price, is_active, created_at, triggered_at) = row
        alerts.append({
            "id": alert_id,
            "crop": crop,
            "target_price": target_price,
            "is_active": bool(is_active),
            "created_at": created_at,
            "triggered_at": triggered_at
        })
    
    return alerts

@app.get("/crops/available")
async def get_available_crops():
    """Get list of available crops, states, and soil types"""
    return {
        "crops": ["Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Soybean", "Potato", "Onion"],
        "states": ["Andhra Pradesh", "Punjab", "Maharashtra", "Karnataka", "Uttar Pradesh", "Madhya Pradesh"],
        "soil_types": ["Alluvial", "Black", "Red", "Laterite", "Arid", "Mountain"]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": PREDICT_FN is not None,
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
