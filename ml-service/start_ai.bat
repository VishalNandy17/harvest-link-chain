@echo off
echo Starting AI Crop Price Prediction Service...
cd /d "%~dp0"
python -c "import uvicorn; uvicorn.run('app.main_simple:app', host='0.0.0.0', port=8000)"
pause

