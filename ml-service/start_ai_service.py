#!/usr/bin/env python3
"""
Startup script for the Perfect AI Crop Price Prediction Service
This script ensures the model is trained and the service is ready to run
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def check_dependencies():
    """Check if all required dependencies are installed"""
    print("🔍 Checking dependencies...")
    
    required_packages = [
        'pandas', 'numpy', 'scikit-learn', 'fastapi', 'uvicorn',
        'joblib', 'python-jose', 'passlib', 'python-multipart'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package}")
    
    if missing_packages:
        print(f"\n⚠️  Missing packages: {', '.join(missing_packages)}")
        print("Installing missing packages...")
        
        for package in missing_packages:
            try:
                subprocess.check_call([sys.executable, '-m', 'pip', 'install', package])
                print(f"✅ Installed {package}")
            except subprocess.CalledProcessError:
                print(f"❌ Failed to install {package}")
                return False
    
    return True

def check_data_file():
    """Check if the crop prices data file exists"""
    data_file = Path("data/processed/crop_prices.csv")
    
    if not data_file.exists():
        print("📊 Data file not found. Generating sample data...")
        
        # Create data directory if it doesn't exist
        data_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Run data preparation script
        try:
            from data.prepare_data import fetch_and_prepare_data
            fetch_and_prepare_data()
            print("✅ Sample data generated successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to generate data: {e}")
            return False
    else:
        print("✅ Data file found")
        return True

def train_model():
    """Train the AI model if it doesn't exist"""
    model_file = Path("models/perfect_crop_price_model.pkl")
    
    if not model_file.exists():
        print("🤖 Model not found. Training new model...")
        
        try:
            from train_perfect_ai_model import PerfectCropPricePredictor
            predictor = PerfectCropPricePredictor()
            predictor.train('data/processed/crop_prices.csv')
            print("✅ Model trained successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to train model: {e}")
            return False
    else:
        print("✅ Model file found")
        return True

def start_service():
    """Start the FastAPI service"""
    print("🚀 Starting AI service...")
    
    try:
        # Start the service
        subprocess.run([
            sys.executable, '-m', 'uvicorn', 
            'app.main_perfect:app', 
            '--host', '0.0.0.0', 
            '--port', '8000',
            '--reload'
        ])
    except KeyboardInterrupt:
        print("\n🛑 Service stopped by user")
    except Exception as e:
        print(f"❌ Failed to start service: {e}")

def main():
    """Main startup function"""
    print("=" * 60)
    print("🌾 PERFECT AI CROP PRICE PREDICTION SERVICE")
    print("=" * 60)
    
    # Change to the script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Check and install dependencies
    if not check_dependencies():
        print("❌ Dependency check failed. Please install missing packages manually.")
        return
    
    # Check data file
    if not check_data_file():
        print("❌ Data preparation failed. Please check the data directory.")
        return
    
    # Train model
    if not train_model():
        print("❌ Model training failed. Please check the training script.")
        return
    
    print("\n✅ All checks passed! Starting service...")
    print("🌐 Service will be available at: http://localhost:8000")
    print("📚 API documentation: http://localhost:8000/docs")
    print("🔍 Health check: http://localhost:8000/health")
    print("\nPress Ctrl+C to stop the service")
    print("=" * 60)
    
    # Start the service
    start_service()

if __name__ == "__main__":
    main()

