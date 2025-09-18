import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder, RobustScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, ExtraTreesRegressor
from sklearn.linear_model import Ridge, Lasso, ElasticNet
from sklearn.svm import SVR
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error
from sklearn.feature_selection import SelectKBest, f_regression
import joblib
import warnings
from datetime import datetime
import os

warnings.filterwarnings('ignore')

class PerfectCropPricePredictor:
    """
    Advanced AI model for crop price prediction using ensemble methods
    and comprehensive feature engineering
    """
    
    def __init__(self):
        self.models = {}
        self.preprocessor = None
        self.feature_selector = None
        self.best_model = None
        self.feature_importance = None
        self.model_performance = {}
        
    def load_and_prepare_data(self, file_path):
        """Load and prepare the dataset with advanced feature engineering"""
        print("Loading dataset...")
        df = pd.read_csv(file_path)
        
        # Convert date to datetime
        df['date'] = pd.to_datetime(df['date'])
        
        # Feature Engineering
        print("Performing advanced feature engineering...")
        
        # Temporal features
        df['day_of_year'] = df['date'].dt.dayofyear
        df['quarter'] = df['date'].dt.quarter
        df['is_weekend'] = df['date'].dt.weekday >= 5
        
        # Seasonal features
        df['season'] = df['month'].map({
            12: 'Winter', 1: 'Winter', 2: 'Winter',
            3: 'Spring', 4: 'Spring', 5: 'Spring',
            6: 'Summer', 7: 'Summer', 8: 'Summer',
            9: 'Autumn', 10: 'Autumn', 11: 'Autumn'
        })
        
        # Weather-based features
        df['temp_rainfall_ratio'] = df['temperature'] / (df['rainfall'] + 1)
        df['humidity_temp_interaction'] = df['humidity'] * df['temperature']
        df['weather_stress'] = np.where(
            (df['temperature'] > 35) | (df['rainfall'] < 10), 1, 0
        )
        
        # Price-based features
        df['price_volatility'] = df.groupby(['crop', 'state'])['price'].transform('std')
        df['price_trend'] = df.groupby(['crop', 'state'])['price'].transform(
            lambda x: x.pct_change().fillna(0)
        )
        df['prev_year_price_ratio'] = df['price'] / (df['prev_year_price'] + 1)
        
        # Crop-specific features
        df['crop_category'] = df['crop'].map({
            'Rice': 'Cereal', 'Wheat': 'Cereal', 'Maize': 'Cereal', 'Jowar': 'Cereal',
            'Bajra': 'Cereal', 'Ragi': 'Cereal',
            'Cotton': 'Fiber', 'Sugarcane': 'Sugar',
            'Soybean': 'Oilseed', 'Groundnut': 'Oilseed',
            'Potato': 'Vegetable', 'Onion': 'Vegetable',
            'Turmeric': 'Spice', 'Arhar': 'Pulse'
        })
        
        # State-specific features (economic indicators)
        state_economic_factors = {
            'Punjab': 1.2, 'Maharashtra': 1.1, 'Karnataka': 1.0, 'Uttar Pradesh': 0.9,
            'Madhya Pradesh': 0.95, 'Andhra Pradesh': 1.05, 'West Bengal': 0.9,
            'Gujarat': 1.1, 'Rajasthan': 0.85, 'Haryana': 1.15
        }
        df['state_economic_factor'] = df['state'].map(state_economic_factors)
        
        # Soil productivity mapping
        soil_productivity = {
            'Alluvial': 1.2, 'Black': 1.1, 'Red': 1.0, 'Laterite': 0.9,
            'Arid': 0.8, 'Mountain': 0.7
        }
        df['soil_productivity'] = df['soil_type'].map(soil_productivity)
        
        # Market demand features
        df['crop_demand_score'] = df.groupby('crop')['price'].transform('mean')
        df['state_crop_specialization'] = df.groupby(['state', 'crop'])['price'].transform('count')
        
        print(f"Dataset shape after feature engineering: {df.shape}")
        return df
    
    def prepare_features_and_target(self, df):
        """Prepare features and target variable"""
        # Define feature columns
        categorical_features = ['state', 'crop', 'soil_type', 'season', 'crop_category']
        numerical_features = [
            'month', 'day_of_year', 'quarter', 'is_weekend',
            'temperature', 'rainfall', 'humidity', 'prev_year_price',
            'temp_rainfall_ratio', 'humidity_temp_interaction', 'weather_stress',
            'price_volatility', 'price_trend', 'prev_year_price_ratio',
            'state_economic_factor', 'soil_productivity', 'crop_demand_score',
            'state_crop_specialization'
        ]
        
        # Prepare features
        X = df[categorical_features + numerical_features]
        y = df['price']
        
        print(f"Features shape: {X.shape}")
        print(f"Target shape: {y.shape}")
        
        return X, y, categorical_features, numerical_features
    
    def create_preprocessing_pipeline(self, categorical_features, numerical_features):
        """Create comprehensive preprocessing pipeline"""
        # Numerical preprocessing
        numerical_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', RobustScaler())  # More robust to outliers than StandardScaler
        ])
        
        # Categorical preprocessing
        categorical_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='constant', fill_value='unknown')),
            ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])
        
        # Combine preprocessing
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', numerical_transformer, numerical_features),
                ('cat', categorical_transformer, categorical_features)
            ],
            remainder='drop'
        )
        
        return preprocessor
    
    def train_ensemble_models(self, X_train, y_train, X_test, y_test):
        """Train multiple models and create ensemble"""
        print("Training ensemble of models...")
        
        # Define models with optimized parameters
        models = {
            'RandomForest': RandomForestRegressor(
                n_estimators=200,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            ),
            'GradientBoosting': GradientBoostingRegressor(
                n_estimators=300,
                learning_rate=0.05,
                max_depth=8,
                min_samples_split=10,
                min_samples_leaf=4,
                random_state=42
            ),
            'ExtraTrees': ExtraTreesRegressor(
                n_estimators=200,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            ),
            'Ridge': Ridge(alpha=1.0),
            'Lasso': Lasso(alpha=0.1),
            'ElasticNet': ElasticNet(alpha=0.1, l1_ratio=0.5),
            'SVR': SVR(kernel='rbf', C=100, gamma='scale')
        }
        
        # Train each model
        for name, model in models.items():
            print(f"Training {name}...")
            
            # Create full pipeline
            pipeline = Pipeline([
                ('preprocessor', self.preprocessor),
                ('feature_selector', SelectKBest(f_regression, k=15)),
                ('model', model)
            ])
            
            # Train model
            pipeline.fit(X_train, y_train)
            
            # Evaluate model
            y_pred = pipeline.predict(X_test)
            mae = mean_absolute_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            rmse = np.sqrt(mean_squared_error(y_test, y_pred))
            
            self.model_performance[name] = {
                'mae': mae,
                'r2': r2,
                'rmse': rmse
            }
            
            print(f"{name} - MAE: {mae:.2f}, R²: {r2:.3f}, RMSE: {rmse:.2f}")
            
            # Store model
            self.models[name] = pipeline
        
        # Select best model based on R² score
        best_model_name = max(self.model_performance.keys(), 
                             key=lambda x: self.model_performance[x]['r2'])
        self.best_model = self.models[best_model_name]
        
        print(f"\nBest model: {best_model_name}")
        print(f"Best R² score: {self.model_performance[best_model_name]['r2']:.3f}")
        
        return best_model_name
    
    def create_ensemble_predictor(self, X_train, y_train):
        """Create ensemble predictor using voting"""
        from sklearn.ensemble import VotingRegressor
        
        # Select top 3 models
        top_models = sorted(self.model_performance.items(), 
                           key=lambda x: x[1]['r2'], reverse=True)[:3]
        
        print(f"Creating ensemble with top 3 models: {[m[0] for m in top_models]}")
        
        # Create voting regressor
        estimators = [(name, self.models[name]) for name, _ in top_models]
        ensemble = VotingRegressor(estimators=estimators)
        
        # Train ensemble
        ensemble.fit(X_train, y_train)
        
        return ensemble
    
    def train(self, file_path):
        """Main training function"""
        print("=" * 60)
        print("PERFECT AI CROP PRICE PREDICTION MODEL")
        print("=" * 60)
        
        # Load and prepare data
        df = self.load_and_prepare_data(file_path)
        
        # Prepare features
        X, y, cat_features, num_features = self.prepare_features_and_target(df)
        
        # Create preprocessing pipeline
        self.preprocessor = self.create_preprocessing_pipeline(cat_features, num_features)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=df['crop']
        )
        
        print(f"Training set size: {X_train.shape[0]}")
        print(f"Test set size: {X_test.shape[0]}")
        
        # Train individual models
        best_model_name = self.train_ensemble_models(X_train, y_train, X_test, y_test)
        
        # Create ensemble
        ensemble_model = self.create_ensemble_predictor(X_train, y_train)
        
        # Evaluate ensemble
        y_pred_ensemble = ensemble_model.predict(X_test)
        ensemble_mae = mean_absolute_error(y_test, y_pred_ensemble)
        ensemble_r2 = r2_score(y_test, y_pred_ensemble)
        ensemble_rmse = np.sqrt(mean_squared_error(y_test, y_pred_ensemble))
        
        print(f"\nEnsemble Performance:")
        print(f"MAE: {ensemble_mae:.2f}")
        print(f"R²: {ensemble_r2:.3f}")
        print(f"RMSE: {ensemble_rmse:.2f}")
        
        # Store ensemble as best model
        self.best_model = ensemble_model
        
        # Save models
        self.save_models()
        
        return self.best_model
    
    def predict(self, input_data):
        """Make prediction using the best model"""
        if self.best_model is None:
            raise ValueError("Model not trained yet. Call train() first.")
        
        # Convert input to DataFrame
        if isinstance(input_data, dict):
            df_input = pd.DataFrame([input_data])
        else:
            df_input = input_data.copy()
        
        # Apply same feature engineering
        df_input = self._apply_feature_engineering(df_input)
        
        # Make prediction
        prediction = self.best_model.predict(df_input)[0]
        
        # Calculate confidence interval (simplified)
        confidence_interval = [
            prediction * 0.9,  # 10% below
            prediction * 1.1   # 10% above
        ]
        
        return {
            'predicted_price': round(prediction, 2),
            'confidence_interval': [round(ci, 2) for ci in confidence_interval],
            'currency': 'INR',
            'model_metadata': {
                'model_type': 'Ensemble',
                'features_used': len(df_input.columns),
                'prediction_timestamp': datetime.now().isoformat()
            }
        }
    
    def _apply_feature_engineering(self, df):
        """Apply feature engineering to input data"""
        # Convert date if present
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
            df['day_of_year'] = df['date'].dt.dayofyear
            df['quarter'] = df['date'].dt.quarter
            df['is_weekend'] = df['date'].dt.weekday >= 5
        else:
            # Use month for day_of_year approximation
            df['day_of_year'] = df['month'] * 30
            df['quarter'] = ((df['month'] - 1) // 3) + 1
            df['is_weekend'] = False
        
        # Seasonal features
        df['season'] = df['month'].map({
            12: 'Winter', 1: 'Winter', 2: 'Winter',
            3: 'Spring', 4: 'Spring', 5: 'Spring',
            6: 'Summer', 7: 'Summer', 8: 'Summer',
            9: 'Autumn', 10: 'Autumn', 11: 'Autumn'
        })
        
        # Weather-based features
        df['temp_rainfall_ratio'] = df['temperature'] / (df['rainfall'] + 1)
        df['humidity_temp_interaction'] = df['humidity'] * df['temperature']
        df['weather_stress'] = np.where(
            (df['temperature'] > 35) | (df['rainfall'] < 10), 1, 0
        )
        
        # Price-based features (use defaults for missing data)
        df['price_volatility'] = 100  # Default volatility
        df['price_trend'] = 0  # No trend
        df['prev_year_price_ratio'] = df['price'] / (df['prev_year_price'] + 1) if 'price' in df.columns else 1
        
        # Crop-specific features
        df['crop_category'] = df['crop'].map({
            'Rice': 'Cereal', 'Wheat': 'Cereal', 'Maize': 'Cereal', 'Jowar': 'Cereal',
            'Bajra': 'Cereal', 'Ragi': 'Cereal',
            'Cotton': 'Fiber', 'Sugarcane': 'Sugar',
            'Soybean': 'Oilseed', 'Groundnut': 'Oilseed',
            'Potato': 'Vegetable', 'Onion': 'Vegetable',
            'Turmeric': 'Spice', 'Arhar': 'Pulse'
        }).fillna('Other')
        
        # State-specific features
        state_economic_factors = {
            'Punjab': 1.2, 'Maharashtra': 1.1, 'Karnataka': 1.0, 'Uttar Pradesh': 0.9,
            'Madhya Pradesh': 0.95, 'Andhra Pradesh': 1.05, 'West Bengal': 0.9,
            'Gujarat': 1.1, 'Rajasthan': 0.85, 'Haryana': 1.15
        }
        df['state_economic_factor'] = df['state'].map(state_economic_factors).fillna(1.0)
        
        # Soil productivity mapping
        soil_productivity = {
            'Alluvial': 1.2, 'Black': 1.1, 'Red': 1.0, 'Laterite': 0.9,
            'Arid': 0.8, 'Mountain': 0.7
        }
        df['soil_productivity'] = df['soil_type'].map(soil_productivity).fillna(1.0)
        
        # Market demand features (use defaults)
        df['crop_demand_score'] = 2000  # Default demand score
        df['state_crop_specialization'] = 100  # Default specialization
        
        return df
    
    def save_models(self):
        """Save trained models"""
        os.makedirs('models', exist_ok=True)
        
        # Save best model
        joblib.dump(self.best_model, 'models/perfect_crop_price_model.pkl')
        
        # Save all models
        for name, model in self.models.items():
            joblib.dump(model, f'models/{name.lower()}_model.pkl')
        
        # Save metadata
        metadata = {
            'model_performance': self.model_performance,
            'training_timestamp': datetime.now().isoformat(),
            'best_model': 'ensemble'
        }
        
        import json
        with open('models/model_metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print("Models saved successfully!")
    
    def load_model(self, model_path='models/perfect_crop_price_model.pkl'):
        """Load trained model"""
        self.best_model = joblib.load(model_path)
        print("Model loaded successfully!")

def create_prediction_pipeline():
    """Create prediction pipeline for API integration"""
    predictor = PerfectCropPricePredictor()
    
    # Try to load existing model, otherwise train new one
    try:
        predictor.load_model()
    except FileNotFoundError:
        print("No existing model found. Training new model...")
        predictor.train('data/processed/crop_prices.csv')
    
    return predictor.predict

# Main execution
if __name__ == "__main__":
    # Create predictor instance
    predictor = PerfectCropPricePredictor()
    
    # Train model
    model = predictor.train('data/processed/crop_prices.csv')
    
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
    
    print("\n" + "=" * 60)
    print("SAMPLE PREDICTION")
    print("=" * 60)
    result = predictor.predict(sample_input)
    print(f"Input: {sample_input}")
    print(f"Prediction: {result}")
