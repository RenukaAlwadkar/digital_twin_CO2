"""
Data validation and error handling utilities for EcoTwin API.
Provides schema validation, data cleaning, and error responses.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from datetime import datetime

class EnvironmentalMetrics(BaseModel):
    """Validates environmental sensor data."""
    temperature: float = Field(..., ge=-50, le=60, description="Temperature in Celsius")
    humidity: float = Field(..., ge=0, le=100, description="Relative humidity percentage")
    wind_speed: float = Field(..., ge=0, le=150, description="Wind speed in m/s")
    pollution_index: float = Field(..., ge=0, le=500, description="Air pollution index")
    time_of_day: int = Field(..., ge=0, le=23, description="Hour of day (0-23)")
    traffic_factor: float = Field(..., ge=0, le=100, description="Traffic density factor (0-100)")
    
    @validator('temperature', pre=True, always=True)
    def validate_temperature(cls, v):
        if v is None:
            return 25.0  # Default to room temperature
        return float(v)
    
    @validator('humidity', pre=True, always=True)
    def validate_humidity(cls, v):
        if v is None:
            return 50.0  # Default to moderate humidity
        return float(v)

class ExtendedMetrics(EnvironmentalMetrics):
    """Validates extended metrics for 20-feature model."""
    pm2_5: float = Field(default=25.0, ge=0, le=500, description="PM2.5 micrograms/m3")
    pm10: float = Field(default=40.0, ge=0, le=500, description="PM10 micrograms/m3")
    no: float = Field(default=5.0, ge=0, le=100, description="NO ppb")
    no2: float = Field(default=15.0, ge=0, le=200, description="NO2 ppb")
    nox: float = Field(default=20.0, ge=0, le=300, description="NOx ppb")
    nh3: float = Field(default=2.0, ge=0, le=50, description="NH3 ppb")
    co: float = Field(default=400.0, ge=0, le=5000, description="CO ppb")
    so2: float = Field(default=10.0, ge=0, le=200, description="SO2 ppb")
    o3: float = Field(default=30.0, ge=0, le=400, description="O3 ppb")
    aqi: int = Field(default=2, ge=0, le=5, description="Air Quality Index (0-5)")

class ScenarioParams(BaseModel):
    """Validates what-if scenario parameters."""
    base_data: ExtendedMetrics
    traffic_level: Literal['low', 'medium', 'high'] = Field(default='medium')
    green_cover_increase: float = Field(default=0, ge=-100, le=100, description="Green cover change %")
    wind_speed_change: float = Field(default=0, ge=-50, le=50, description="Wind speed change m/s")
    industrial_emissions: float = Field(default=0, ge=-100, le=100, description="Industrial emission adjustment")

class TelemetryRecord(BaseModel):
    """Schema for telemetry records saved to database."""
    temperature: float
    humidity: float
    wind_speed: float
    pollution_index: float
    co2ppm: float
    traffic_factor: float
    timestamp: Optional[datetime] = None

class SimulationRecord(BaseModel):
    """Schema for simulation records saved to database."""
    base_co2: float
    traffic_level: str
    industrial_emissions: float
    green_cover_increase: float
    wind_speed_change: float
    new_co2: float
    change_percent: float
    impact: Literal['increase', 'decrease']
    timestamp: Optional[datetime] = None

def clean_sensor_data(data: dict) -> dict:
    """Clean and normalize sensor data from IoT devices."""
    cleaned = {}
    
    # Remove None values and use defaults
    if 'temperature' in data and data['temperature'] is not None:
        cleaned['temperature'] = float(data['temperature'])
    else:
        cleaned['temperature'] = 25.0
    
    if 'humidity' in data and data['humidity'] is not None:
        cleaned['humidity'] = float(data['humidity'])
    else:
        cleaned['humidity'] = 50.0
    
    if 'wind_speed' in data and data['wind_speed'] is not None:
        cleaned['wind_speed'] = max(0, float(data['wind_speed']))
    else:
        cleaned['wind_speed'] = 5.0
    
    if 'pollution_index' in data and data['pollution_index'] is not None:
        cleaned['pollution_index'] = max(0, float(data['pollution_index']))
    else:
        cleaned['pollution_index'] = 100.0
    
    if 'time_of_day' in data and data['time_of_day'] is not None:
        cleaned['time_of_day'] = int(data['time_of_day']) % 24
    else:
        cleaned['time_of_day'] = datetime.utcnow().hour
    
    if 'traffic_factor' in data and data['traffic_factor'] is not None:
        cleaned['traffic_factor'] = max(0, min(100, float(data['traffic_factor'])))
    else:
        cleaned['traffic_factor'] = 50.0
    
    return cleaned

def validate_and_clean(data: dict, model_class=EnvironmentalMetrics):
    """Validate and clean data using Pydantic model."""
    try:
        cleaned = clean_sensor_data(data)
        validated = model_class(**cleaned)
        return validated, None
    except Exception as e:
        return None, str(e)

class APIResponse(BaseModel):
    """Standard API response wrapper."""
    status: Literal['success', 'error', 'warning']
    data: Optional[dict] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
