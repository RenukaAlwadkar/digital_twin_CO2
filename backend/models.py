from sqlalchemy import Column, Integer, Float, String, DateTime
from datetime import datetime
from database import Base

class TelemetryHistory(Base):
    __tablename__ = "telemetry_history"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    temperature = Column(Float)
    humidity = Column(Float)
    wind_speed = Column(Float)
    pollution_index = Column(Float)
    co2ppm = Column(Float)
    traffic_factor = Column(Float)

class SimulationRecord(Base):
    __tablename__ = "simulation_records"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Inputs
    base_co2 = Column(Float)
    traffic_level = Column(String)
    industrial_emissions = Column(Float)
    green_cover_increase = Column(Float)
    wind_speed_change = Column(Float)
    
    # Outputs
    new_co2 = Column(Float)
    change_percent = Column(Float)
    impact = Column(String)
