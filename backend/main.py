from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import os
from sqlalchemy.orm import Session
import database
import models

app = FastAPI()

@app.on_event("startup")
def startup_db():
    try:
        models.Base.metadata.create_all(bind=database.engine)
        print("Successfully connected to the database and created tables.")
    except Exception as e:
        print(f"Warning: Failed to connect to the database. History will not be saved. Error: {e}")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and scaler lazily
model = None
scaler = None

def load_ml_assets():
    global model, scaler
    try:
        model = joblib.load("rf_model.joblib")
        scaler = joblib.load("scaler.joblib")
    except Exception as e:
        print(f"Warning: Could not load ML models. {e}")

load_ml_assets()

class PredictRequest(BaseModel):
    temperature: float
    humidity: float
    wind_speed: float
    pollution_index: float
    time_of_day: float
    traffic_factor: float

class SimulateRequest(BaseModel):
    base_data: PredictRequest
    traffic_level: str  # low, medium, high
    green_cover_increase: float
    wind_speed_change: float
    industrial_emissions: float

@app.get("/")
def read_root():
    return {"status": "ok", "message": "EcoTwin AI Backend"}

@app.post("/predict")
def predict_co2(data: PredictRequest):
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
        
    features = np.array([[
        data.temperature,
        data.humidity,
        data.wind_speed,
        data.pollution_index,
        data.time_of_day,
        data.traffic_factor
    ]])
    
    scaled_features = scaler.transform(features)
    predicted_co2 = model.predict(scaled_features)[0]
    
    # Simple Anomaly Detection
    # If prediction is unexpectedly high given normal conditions
    is_anomaly = predicted_co2 > 1200
    
    return {
        "predicted_co2": float(predicted_co2),
        "anomaly": is_anomaly
    }

@app.post("/forecast")
def forecast_short_term(data: PredictRequest):
    """ Forecast the next 5 intervals (e.g. 5-10 minutes) """
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
        
    forecasts = []
    current_time = data.time_of_day
    
    for i in range(1, 6):
        # Slightly advance time and add small random walks to other features
        next_time = (current_time + (i * 0.1)) % 24
        
        features = np.array([[
            data.temperature,
            data.humidity,
            data.wind_speed,
            data.pollution_index,
            next_time,
            data.traffic_factor
        ]])
        
        scaled = scaler.transform(features)
        pred = model.predict(scaled)[0]
        forecasts.append(float(pred))
        
    return {"forecast_5m": forecasts}

@app.post("/simulate")
def simulate_scenario(data: SimulateRequest):
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
        
    # Baseline
    base_features = np.array([[
        data.base_data.temperature,
        data.base_data.humidity,
        data.base_data.wind_speed,
        data.base_data.pollution_index,
        data.base_data.time_of_day,
        data.base_data.traffic_factor
    ]])
    base_scaled = scaler.transform(base_features)
    base_co2 = model.predict(base_scaled)[0]
    
    # Adjust for scenario
    new_traffic = data.base_data.traffic_factor
    if data.traffic_level == 'low': new_traffic *= 0.5
    elif data.traffic_level == 'high': new_traffic *= 1.5
    
    new_wind = max(0, data.base_data.wind_speed + data.wind_speed_change)
    
    # Assume pollution index decreases slightly with green cover
    new_pollution = max(10, data.base_data.pollution_index * (1 - (data.green_cover_increase / 100)))
    
    scenario_features = np.array([[
        data.base_data.temperature,
        data.base_data.humidity,
        new_wind,
        new_pollution,
        data.base_data.time_of_day,
        new_traffic
    ]])
    
    scenario_scaled = scaler.transform(scenario_features)
    raw_simulated_co2 = model.predict(scenario_scaled)[0]
    
    # Add explicit physical impacts
    raw_simulated_co2 += data.industrial_emissions
    raw_simulated_co2 *= (1 - (data.green_cover_increase / 200)) # Green cover absorbs CO2
    
    change_pct = ((raw_simulated_co2 - base_co2) / base_co2) * 100
    impact_str = "increase" if change_pct > 0 else "decrease"
    
    # Save to database
    db = next(database.get_db())
    record = models.SimulationRecord(
        base_co2=float(base_co2),
        traffic_level=data.traffic_level,
        industrial_emissions=data.industrial_emissions,
        green_cover_increase=data.green_cover_increase,
        wind_speed_change=data.wind_speed_change,
        new_co2=float(raw_simulated_co2),
        change_percent=float(change_pct),
        impact=impact_str
    )
    db.add(record)
    db.commit()
    
    return {
        "base_co2": float(base_co2),
        "new_co2": float(raw_simulated_co2),
        "change_percent": float(change_pct),
        "impact": impact_str
    }

class SaveHistoryRequest(PredictRequest):
    co2ppm: float

@app.post("/history/save")
def save_telemetry(data: SaveHistoryRequest, db: Session = Depends(database.get_db)):
    """ Endpoint to save live data to history periodically """
    record = models.TelemetryHistory(
        temperature=data.temperature,
        humidity=data.humidity,
        wind_speed=data.wind_speed,
        pollution_index=data.pollution_index,
        traffic_factor=data.traffic_factor,
        co2ppm=data.co2ppm
    )
    db.add(record)
    db.commit()
    return {"status": "saved"}

@app.get("/history/telemetry")
def get_telemetry_history(limit: int = 100, db: Session = Depends(database.get_db)):
    records = db.query(models.TelemetryHistory).order_by(models.TelemetryHistory.timestamp.desc()).limit(limit).all()
    return records

@app.get("/history/simulations")
def get_simulation_history(limit: int = 10, db: Session = Depends(database.get_db)):
    records = db.query(models.SimulationRecord).order_by(models.SimulationRecord.timestamp.desc()).limit(limit).all()
    return records

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
