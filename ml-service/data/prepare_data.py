import pandas as pd
import numpy as np
from datetime import datetime
import os

# This script prepares the real crop price data for training
def fetch_and_prepare_data():
    # In a real implementation, you would fetch this from an API or database
    # For now, we'll create a more realistic dataset based on public data
    
    # Generate date range for the last 5 years
    dates = pd.date_range(end=datetime.now(), periods=365*5).date
    
    # Indian states with agricultural significance
    states = ["Punjab", "Maharashtra", "Karnataka", "Uttar Pradesh", "Madhya Pradesh", 
              "Andhra Pradesh", "West Bengal", "Gujarat", "Rajasthan", "Haryana"]
    
    # Major crops in India
    crops = ["Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Soybean", "Potato", "Onion",
             "Groundnut", "Turmeric", "Jowar", "Bajra", "Ragi", "Arhar"]
    
    # Base prices (in INR per quintal) - these are approximate market rates
    base_prices = {
        "Rice": 1800, "Wheat": 2000, "Maize": 1700, "Cotton": 5800, "Sugarcane": 300,
        "Soybean": 3900, "Potato": 1200, "Onion": 2000, "Groundnut": 5500,
        "Turmeric": 7000, "Jowar": 2800, "Bajra": 2200, "Ragi": 3500, "Arhar": 6500
    }
    
    # Soil types
    soil_types = ["Alluvial", "Black", "Red", "Laterite", "Arid", "Mountain"]
    
    data = []
    
    for date in dates:
        for state in states:
            for crop in crops:
                # Base price with state-wise variation
                state_factor = 0.9 + (hash(state) % 20) * 0.02
                
                # Seasonal variation (higher in winter for some crops, etc.)
                month = date.month
                if crop in ["Wheat", "Potato"]:  # Winter crops
                    season_factor = 1.2 if month in [10, 11, 12, 1, 2] else 0.9
                elif crop in ["Rice", "Cotton"]:  # Kharif crops
                    season_factor = 1.2 if month in [6, 7, 8, 9] else 0.9
                else:  # All other crops
                    season_factor = 1.0
                
                # Yearly trend (slight increase)
                year_factor = 1 + (date.year - 2020) * 0.05
                
                # Generate realistic price with some randomness
                base_price = base_prices.get(crop, 2000)
                price = base_price * state_factor * season_factor * year_factor * np.random.uniform(0.9, 1.1)
                
                # Generate weather data
                if month in [4, 5, 6]:  # Summer
                    temp = np.random.normal(35, 3)  # Mean 35°C
                    rainfall = np.random.gamma(2, 10)  # Low rainfall
                elif month in [7, 8, 9]:  # Monsoon
                    temp = np.random.normal(30, 2)
                    rainfall = np.random.gamma(10, 15)  # High rainfall
                else:  # Winter
                    temp = np.random.normal(25, 3)
                    rainfall = np.random.gamma(3, 5)  # Moderate rainfall
                
                humidity = np.random.uniform(40, 90)
                
                # Random soil type for this entry
                soil_type = np.random.choice(soil_types)
                
                # Previous year's price (with some variation)
                prev_year_price = price * np.random.uniform(0.85, 1.15)
                
                data.append({
                    'date': date,
                    'year': date.year,
                    'month': date.month,
                    'state': state,
                    'crop': crop,
                    'soil_type': soil_type,
                    'temperature': round(temp, 1),
                    'rainfall': round(rainfall, 1),
                    'humidity': round(humidity, 1),
                    'prev_year_price': round(prev_year_price, 2),
                    'price': round(price, 2)
                })
    
    df = pd.DataFrame(data)
    
    # Add some missing values to simulate real-world data
    mask = np.random.random(len(df)) < 0.05  # 5% missing values
    df.loc[mask, 'prev_year_price'] = np.nan
    
    # Fill missing values with mean
    df['prev_year_price'] = df['prev_year_price'].fillna(df['price'].mean() * 0.9)
    
    # Save to CSV
    os.makedirs('data/processed', exist_ok=True)
    df.to_csv('data/processed/crop_prices.csv', index=False)
    print(f"Generated {len(df)} records of crop price data")
    
    return df

if __name__ == "__main__":
    fetch_and_prepare_data()
