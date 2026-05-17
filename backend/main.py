from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import database
import models
from validators import EnvironmentalMetrics, ExtendedMetrics, ScenarioParams
from logger import APILogger, HealthMonitor, ErrorTracker

app = FastAPI(
    title="EcoTwin CO2 Prediction API",
    version="2.0.0",
    description="AI-powered digital twin for urban CO2 monitoring and what-if scenario analysis"
)

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
MODEL_TYPE = "unknown"

def load_ml_assets():
    global model, scaler, MODEL_TYPE
    try:
        # Try to load the 20-feature model first
        model_path = "backend/co2_model-Copy1.pkl"
        if os.path.exists(model_path):
            model = joblib.load(model_path)
            MODEL_TYPE = "20-feature"
            APILogger.log_model_status("20-feature", True, 20)
            HealthMonitor.update_model_status(True)
        else:
            # Fallback to 6-feature model
            if os.path.exists("backend/rf_model.joblib"):
                model = joblib.load("backend/rf_model.joblib")
                scaler = joblib.load("backend/scaler.joblib")
                MODEL_TYPE = "6-feature"
                APILogger.log_model_status("6-feature", True, 6)
                HealthMonitor.update_model_status(True)
            else:
                APILogger.log_model_status("unknown", False)
                print("[MODEL] Warning: No pre-trained models found. Please run train_model.py")
                HealthMonitor.update_model_status(False)
    except Exception as e:
        error_msg = f"Error loading ML models: {e}"
        APILogger.log_error("MODEL_LOAD", error_msg, critical=True)
        ErrorTracker.log_error("MODEL_LOAD", error_msg)
        HealthMonitor.update_model_status(False)

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
        error_msg = "Model not loaded"
        ErrorTracker.log_error("PREDICT_ERROR", error_msg)
        raise HTTPException(status_code=503, detail=error_msg)
    
    try:
        # Use 20-feature model if available
        if model.n_features_in_ == 20:
            features = map_20_features(data)
            predicted_co2 = model.predict(features)[0]
        else:
            # Fallback to old model
            if scaler is None:
                raise HTTPException(status_code=503, detail="Scaler missing for old model")
            features = np.array([[data.temperature, data.humidity, data.wind_speed, data.pollution_index, data.time_of_day, data.traffic_factor]])
            scaled_features = scaler.transform(features)
            predicted_co2 = model.predict(scaled_features)[0]
        
        anomaly = predicted_co2 > 1200
        APILogger.log_prediction(data.dict(), predicted_co2, anomaly)
        
        return {
            "predicted_co2": float(predicted_co2),
            "anomaly": anomaly,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        error_msg = f"Prediction failed: {str(e)}"
        ErrorTracker.log_error("PREDICT_ERROR", error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/simulate")
def simulate_scenario(data: SimulateRequest):
    if model is None:
        error_msg = "Model not loaded"
        ErrorTracker.log_error("SIMULATE_ERROR", error_msg)
        raise HTTPException(status_code=503, detail=error_msg)
    
    try:
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
        
        APILogger.log_simulation(data.dict(), {
            'change_percent': change_pct,
            'impact': impact_str
        })
        
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
            APILogger.log_db_operation("SIMULATION_SAVE", True)
        except Exception as e:
            error_msg = f"Database save failed: {e}"
            APILogger.log_error("DB_SAVE", error_msg)
        
        return {
            "base_co2": float(base_co2),
            "new_co2": float(raw_simulated_co2),
            "change_percent": float(change_pct),
            "impact": impact_str,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        error_msg = f"Simulation failed: {str(e)}"
        ErrorTracker.log_error("SIMULATE_ERROR", error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

# Rest of the history endpoints remain the same
@app.post("/history/save")
def save_telemetry(data: PredictRequest, db: Session = Depends(database.get_db)):
    """Save telemetry data to the database."""
    try:
        telemetry = models.TelemetryHistory(
            temperature=data.temperature,
            humidity=data.humidity,
            wind_speed=data.wind_speed,
            pollution_index=data.pollution_index,
            co2ppm=getattr(data, 'predicted_co2', 400.0),  # Fallback value
            traffic_factor=data.traffic_factor
        )
        db.add(telemetry)
        db.commit()
        db.refresh(telemetry)
        APILogger.log_db_operation("TELEMETRY_SAVE", True)
        return {"status": "saved", "id": telemetry.id, "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        error_msg = f"Error saving telemetry: {e}"
        APILogger.log_error("DB_SAVE", error_msg)
        ErrorTracker.log_error("TELEMETRY_SAVE", error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/history/telemetry")
def get_telemetry_history(
    limit: int = Query(100, ge=1, le=1000), 
    db: Session = Depends(database.get_db)
):
    """Get telemetry history with optional limit."""
    try:
        records = db.query(models.TelemetryHistory)\
            .order_by(models.TelemetryHistory.timestamp.desc())\
            .limit(limit)\
            .all()
        APILogger.log_db_operation("TELEMETRY_FETCH", True, len(records))
        return records
    except Exception as e:
        error_msg = f"Failed to fetch telemetry: {str(e)}"
        ErrorTracker.log_error("TELEMETRY_FETCH", error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/history/simulations")
def get_simulation_history(
    limit: int = Query(50, ge=1, le=500), 
    db: Session = Depends(database.get_db)
):
    """Get simulation history with optional limit."""
    try:
        records = db.query(models.SimulationRecord)\
            .order_by(models.SimulationRecord.timestamp.desc())\
            .limit(limit)\
            .all()
        APILogger.log_db_operation("SIMULATION_FETCH", True, len(records))
        return records
    except Exception as e:
        error_msg = f"Failed to fetch simulations: {str(e)}"
        ErrorTracker.log_error("SIMULATION_FETCH", error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/health")
def health_check():
    """Health check endpoint."""
    status = HealthMonitor.get_status()
    return {
        "status": "healthy" if (status['model'] and status['database']) else "degraded",
        "api": status['api'],
        "model_loaded": status['model'],
        "database_connected": status['database'],
        "model_type": MODEL_TYPE,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/stats/summary")
def get_stats_summary(db: Session = Depends(database.get_db)):
    """Get summary statistics from telemetry and simulation records."""
    try:
        telemetry_count = db.query(models.TelemetryHistory).count()
        simulation_count = db.query(models.SimulationRecord).count()
        
        # Get latest telemetry
        latest_telemetry = db.query(models.TelemetryHistory)\
            .order_by(models.TelemetryHistory.timestamp.desc())\
            .first()
        
        APILogger.log_db_operation("STATS_FETCH", True, telemetry_count + simulation_count)
        
        return {
            "telemetry_count": telemetry_count,
            "simulation_count": simulation_count,
            "latest_telemetry": latest_telemetry,
            "model_type": MODEL_TYPE,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        error_msg = f"Failed to get stats: {str(e)}"
        ErrorTracker.log_error("STATS_ERROR", error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/logs/errors")
def get_recent_errors(limit: int = Query(10, ge=1, le=100)):
    """Get recent errors for debugging."""
    return {
        "errors": ErrorTracker.get_recent_errors(limit),
        "summary": ErrorTracker.get_error_summary(),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/logs/status")
def get_system_status():
    """Get overall system status and diagnostics."""
    return {
        "health": HealthMonitor.get_status(),
        "model": {
            "type": MODEL_TYPE,
            "loaded": model is not None,
            "scaler_loaded": scaler is not None
        },
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
