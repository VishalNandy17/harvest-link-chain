import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import os
from datetime import datetime

def create_quick_model():
    """Create a quick but effective model for demonstration"""
    print("🚀 Creating Quick AI Model...")
    
    # Load data
    df = pd.read_csv('data/processed/crop_prices.csv')
    print(f"📊 Loaded {len(df)} records")
    
    # Sample data for faster training (use 10% of data)
    df_sample = df.sample(n=min(25000, len(df)), random_state=42)
    print(f"📈 Using {len(df_sample)} records for training")
    
    # Basic feature engineering
    df_sample['temp_rainfall_ratio'] = df_sample['temperature'] / (df_sample['rainfall'] + 1)
    df_sample['humidity_temp_interaction'] = df_sample['humidity'] * df_sample['temperature']
    df_sample['season'] = df_sample['month'].map({
        12: 'Winter', 1: 'Winter', 2: 'Winter',
        3: 'Spring', 4: 'Spring', 5: 'Spring',
        6: 'Summer', 7: 'Summer', 8: 'Summer',
        9: 'Autumn', 10: 'Autumn', 11: 'Autumn'
    })
    
    # Define features
    categorical_features = ['state', 'crop', 'soil_type', 'season']
    numerical_features = [
        'month', 'temperature', 'rainfall', 'humidity', 'prev_year_price',
        'temp_rainfall_ratio', 'humidity_temp_interaction'
    ]
    
    X = df_sample[categorical_features + numerical_features]
    y = df_sample['price']
    
    # Create preprocessing pipeline
    numerical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='unknown')),
        ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numerical_transformer, numerical_features),
            ('cat', categorical_transformer, categorical_features)
        ],
        remainder='drop'
    )
    
    # Create model pipeline
    model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        ))
    ])
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print("🤖 Training model...")
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"✅ Model Performance:")
    print(f"   MAE: {mae:.2f}")
    print(f"   R²: {r2:.3f}")
    
    # Save model
    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/quick_crop_price_model.pkl')
    print("💾 Model saved as 'models/quick_crop_price_model.pkl'")
    
    return model

def predict_price(model, input_data):
    """Make prediction using the model"""
    # Convert input to DataFrame
    df_input = pd.DataFrame([input_data])
    
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
    prediction = model.predict(df_input)[0]
    
    # Calculate confidence interval
    confidence_interval = [
        prediction * 0.9,  # 10% below
        prediction * 1.1   # 10% above
    ]
    
    return {
        'predicted_price': round(prediction, 2),
        'confidence_interval': [round(ci, 2) for ci in confidence_interval],
        'currency': 'INR',
        'model_metadata': {
            'model_type': 'RandomForest',
            'features_used': len(df_input.columns),
            'prediction_timestamp': datetime.now().isoformat()
        }
    }

if __name__ == "__main__":
    # Create and train model
    model = create_quick_model()
    
    # Test prediction
    sample_input = {
        'crop': 'Rice',
        'state': 'Punjab',
        'soil_type': 'Alluvial',
        'month': 10,
        'temperature': 28.5,
        'rainfall': 120.0,
        'humidity': 65.0,
        'prev_year_price': 2000.0
    }
    
    print("\n🧪 Testing prediction...")
    result = predict_price(model, sample_input)
    print(f"Input: {sample_input}")
    print(f"Prediction: {result}")

