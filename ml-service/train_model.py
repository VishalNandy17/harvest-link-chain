import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import joblib
import os

# Create models directory if it doesn't exist
os.makedirs('app/models', exist_ok=True)

# Sample data generation (in a real app, you would load real historical data)
def generate_sample_data():
    np.random.seed(42)
    n_samples = 1000
    
    # Base prices per kg for different crops (in INR)
    base_prices = {
        'Rice': 25, 'Wheat': 20, 'Maize': 18, 'Cotton': 60, 
        'Sugarcane': 5, 'Soybean': 45, 'Potato': 15, 'Onion': 30
    }
    
    crops = list(base_prices.keys())
    states = ["Andhra Pradesh", "Punjab", "Maharashtra", "Karnataka", "Uttar Pradesh", "Madhya Pradesh"]
    
    data = {
        'Crop': np.random.choice(crops, n_samples),
        'State': np.random.choice(states, n_samples),
        'Month': np.random.randint(1, 13, n_samples),
        'Year': np.random.randint(2018, 2024, n_samples),
        'Area': np.random.uniform(0.1, 10, n_samples),  # in hectares
        'Rainfall': np.random.uniform(20, 400, n_samples),  # in mm
        'Temperature': np.random.uniform(15, 45, n_samples),  # in Celsius
        'Humidity': np.random.uniform(30, 90, n_samples)  # in percentage
    }
    
    # Calculate price based on features with some randomness
    prices = []
    for i in range(n_samples):
        base_price = base_prices[data['Crop'][i]]
        # Simple price factors (in a real app, this would be more sophisticated)
        month_factor = 1 + (data['Month'][i] % 12) * 0.02  # Seasonal variation
        state_factor = 0.8 + (hash(data['State'][i]) % 10) * 0.04  # State-specific variation
        weather_factor = 1 + (data['Rainfall'][i] / 1000) - (data['Temperature'][i] / 100)  # Weather impact
        
        price = base_price * month_factor * state_factor * weather_factor * np.random.uniform(0.9, 1.1)
        prices.append(price)
    
    data['Price'] = prices
    return pd.DataFrame(data)

def train_and_save_model():
    # Generate or load your dataset
    df = generate_sample_data()
    
    # Encode categorical variables
    encoders = {}
    for col in ['Crop', 'State']:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col])
        encoders[col] = le
    
    # Prepare features and target
    X = df.drop('Price', axis=1)
    y = df['Price']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train model
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    print(f"Training R²: {train_score:.4f}")
    print(f"Test R²: {test_score:.4f}")
    
    # Save model and encoders
    joblib.dump(model, 'app/models/crop_price_model.joblib')
    joblib.dump(encoders, 'app/models/encoders.joblib')
    print("Model and encoders saved successfully!")

if __name__ == "__main__":
    train_and_save_model()
