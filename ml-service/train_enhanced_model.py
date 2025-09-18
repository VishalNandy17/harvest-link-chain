import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

# =============================
# Load Dataset
# =============================
def load_data(file_path):
    df = pd.read_csv(file_path)
    print("\nDataset Loaded:")
    print(df.head())
    return df

# =============================
# Train Model
# =============================
def train_model(df):
    # Define features and target
    categorical_features = ['state', 'district', 'market', 'commodity', 'variety']
    numeric_features = ['min_price', 'max_price']
    target = 'modal_price'

    # Separate X and y
    X = df[categorical_features + numeric_features]
    y = df[target]

    # Preprocessing for numeric features
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    # Preprocessing for categorical features
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse=False))
    ])

    # Combine preprocessing
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ],
        remainder='drop'
    )

    # Define model pipeline
    model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', GradientBoostingRegressor(
            n_estimators=200,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        ))
    ])

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("\nTraining model...")
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print("\nModel Performance:")
    print(f"Mean Absolute Error (MAE): {mae:.2f}")
    print(f"R² Score: {r2:.2f}")

    # Save model
    joblib.dump(model, "crop_price_model.pkl")
    print("\nModel saved as 'crop_price_model.pkl'")

    return model

# =============================
# Predict Function
# =============================
def predict_price(model, sample_input):
    df_sample = pd.DataFrame([sample_input])
    predicted_price = model.predict(df_sample)[0]

    print("\nPrediction for sample input:")
    print(sample_input)
    print(f"Predicted Modal Price: {predicted_price:.2f}")

    return predicted_price

# =============================
# Main Execution
# =============================
if __name__ == "__main__":
    # Load dataset
    df = load_data("crop_data.csv")  # <-- Replace with your dataset file

    # Train model
    model = train_model(df)

    # Sample prediction
    sample_input = {
        'state': 'West Bengal',
        'district': 'Murshidabad',
        'market': 'Berhampore',
        'commodity': 'Sugarcane',
        'variety': 'Co-0238',
        'min_price': 2800,
        'max_price': 3200
    }

    predict_price(model, sample_input)