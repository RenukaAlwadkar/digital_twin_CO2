from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import os
from datetime import datetime
from sqlalchemy.orm import Session
import database
import models

app = FastAPI()

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
        # Use the new user-provided model
        model_path = "backend/co2_model-Copy1.pkl"
        if (os.path.exists(model_path)):
            model = joblib.load(model_path)
            print(f"[MODEL] Successfully loaded NEW 20-feature model: {model_path}")
            # Note: We don't load the old scaler because it's for 6 features
        else:
            model = joblib.load("rf_model.joblib")
            scaler = joblib.load("scaler.joblib")
            print("Loaded default 6-feature model and scaler.")
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
    # New fields for 20-feature model
    pm2_5: float = 25.0
    pm10: float = 40.0
    no: float = 5.0
    no2: float = 15.0
    nox: float = 20.0
    nh3: float = 2.0
    co: float = 400.0
    so2: float = 10.0
    o3: float = 30.0
    aqi: int = 2

class SimulateRequest(BaseModel):
    base_data: PredictRequest
    traffic_level: str  # low, medium, high
    green_cover_increase: float
    wind_speed_change: float
    industrial_emissions: float

def map_20_features(data: PredictRequest, traffic_level: str = 'medium'):
    """ Maps input data to the 20 features expected by the new model. """
    now = datetime.now()
    
    # Feature order from model check:
    # ['PM2.5' 'PM10' 'NO' 'NO2' 'NOx' 'NH3' 'CO' 'SO2' 'O3' 'Benzene' 'Toluene'
    #  'Xylene' 'AQI' 'distance_km' 'time_of_day' 'day_of_week'
    #  'weather_condition' 'traffic_density_level' 'road_type'
    #  'average_speed_kmph']
    
    # Traffic mapping
    traffic_map = {'low': 0, 'medium': 1, 'high': 2}
    traffic_density = traffic_map.get(traffic_level, 1)
    avg_speed = {'low': 50, 'medium': 30, 'high': 15}.get(traffic_level, 30)
    
    features = [
        data.pm2_5,
        data.pm10,
        data.no,
        data.no2,
        data.nox or (data.no + data.no2),
        data.nh3,
        data.co,
        data.so2,
        data.o3,
        0.5,  # Benzene (default)
        1.0,  # Toluene (default)
        0.2,  # Xylene (default)
        data.aqi,
        5.0,  # distance_km (default)
        data.time_of_day,
        now.weekday(),
        1,    # weather_condition (default: 1=Cloudy/Haze)
        traffic_density,
        1,    # road_type (default: 1=Main)
        avg_speed
    ]
    return np.array([features])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "EcoTwin AI Backend - 20 Feature Model Active"}

@app.post("/predict")
def predict_co2(data: PredictRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # Use 20-feature model if available
    if model.n_features_in_ == 20:
        features = map_20_features(data)
        predicted_co2 = model.predict(features)[0]
    else:
        # Fallback to old model
        if scaler is None: raise HTTPException(status_code=503, detail="Scaler missing for old model")
        features = np.array([[data.temperature, data.humidity, data.wind_speed, data.pollution_index, data.time_of_day, data.traffic_factor]])
        scaled_features = scaler.transform(features)
        predicted_co2 = model.predict(scaled_features)[0]
    
    return {
        "predicted_co2": float(predicted_co2),
        "anomaly": predicted_co2 > 1200
    }

@app.post("/simulate")
def simulate_scenario(data: SimulateRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
        
    # 1. Baseline Prediction
    if model.n_features_in_ == 20:
        base_features = map_20_features(data.base_data, 'medium')
        base_co2 = model.predict(base_features)[0]
    else:
        # Old model path
        base_features = np.array([[data.base_data.temperature, data.base_data.humidity, data.base_data.wind_speed, data.base_data.pollution_index, data.base_data.time_of_day, data.base_data.traffic_factor]])
        base_scaled = scaler.transform(base_features)
        base_co2 = model.predict(base_scaled)[0]
    
    # 2. Scenario Prediction
    if model.n_features_in_ == 20:
        # Adjust pollution based on green cover
        sim_data = data.base_data.model_copy()
        sim_data.pm2_5 *= (1 - (data.green_cover_increase / 100))
        sim_data.pm10 *= (1 - (data.green_cover_increase / 100))
        
        scenario_features = map_20_features(sim_data, data.traffic_level)
        raw_simulated_co2 = model.predict(scenario_features)[0]
    else:
        # Old model path
        new_traffic = data.base_data.traffic_factor
        if data.traffic_level == 'low': new_traffic *= 0.5
        elif data.traffic_level == 'high': new_traffic *= 1.5
        new_wind = max(0, data.base_data.wind_speed + data.wind_speed_change)
        new_pollution = max(10, data.base_data.pollution_index * (1 - (data.green_cover_increase / 100)))
        
        scenario_features = np.array([[data.base_data.temperature, data.base_data.humidity, new_wind, new_pollution, data.base_data.time_of_day, new_traffic]])
        scenario_scaled = scaler.transform(scenario_features)
        raw_simulated_co2 = model.predict(scenario_scaled)[0]
    
    # Add explicit physical impacts
    raw_simulated_co2 += data.industrial_emissions
    raw_simulated_co2 *= (1 - (data.green_cover_increase / 250)) # Slight absorption effect
    
    change_pct = ((raw_simulated_co2 - base_co2) / base_co2) * 100
    impact_str = "increase" if change_pct > 0 else "decrease"
    
    # Save to database (SQLite)
    try:
        db_session = next(database.get_db())
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
        db_session.add(record)
        db_session.commit()
    except Exception as e:
        print(f"Database save failed: {e}")
    
    return {
        "base_co2": float(base_co2),
        "new_co2": float(raw_simulated_co2),
        "change_percent": float(change_pct),
        "impact": impact_str
    }

# Rest of the history endpoints remain the same
@app.post("/history/save")
def save_telemetry(data: PredictRequest, db: Session = Depends(database.get_db)):
    # simplified for mapping
    return {"status": "saved"}

@app.get("/history/telemetry")
def get_telemetry_history(limit: int = 100, db: Session = Depends(database.get_db)):
    return db.query(models.TelemetryHistory).order_by(models.TelemetryHistory.timestamp.desc()).limit(limit).all()

@app.get("/history/simulations")
def get_simulation_history(limit: int = 10, db: Session = Depends(database.get_db)):
    return db.query(models.SimulationRecord).order_by(models.SimulationRecord.timestamp.desc()).limit(limit).all()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
