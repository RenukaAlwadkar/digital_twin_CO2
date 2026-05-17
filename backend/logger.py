"""
Global error handling and logging for EcoTwin backend.
Provides structured logging, error tracking, and health monitoring.
"""

import logging
import sys
from datetime import datetime
from typing import Any, Dict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(name)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('backend.log')
    ]
)

logger = logging.getLogger(__name__)

class APILogger:
    """Centralized logging for API operations."""
    
    @staticmethod
    def log_prediction(request_data: Dict[str, Any], prediction: float, anomaly: bool):
        """Log CO2 prediction requests."""
        logger.info(
            f"PREDICTION | Temp: {request_data.get('temperature')}°C | "
            f"Traffic: {request_data.get('traffic_factor')} | "
            f"CO2: {prediction:.1f} ppm | Anomaly: {anomaly}"
        )
    
    @staticmethod
    def log_simulation(scenario: Dict[str, Any], result: Dict[str, Any]):
        """Log what-if simulation runs."""
        logger.info(
            f"SIMULATION | Traffic: {scenario.get('traffic_level')} | "
            f"Green: +{scenario.get('green_cover_increase')}% | "
            f"Result: {result.get('change_percent'):.1f}% {result.get('impact')}"
        )
    
    @staticmethod
    def log_error(operation: str, error: str, critical: bool = False):
        """Log API errors."""
        level = logging.ERROR if critical else logging.WARNING
        logger.log(level, f"{operation} FAILED: {error}")
    
    @staticmethod
    def log_model_status(model_type: str, loaded: bool, features: int = None):
        """Log model loading status."""
        if loaded:
            logger.info(f"MODEL LOADED | Type: {model_type} | Features: {features}")
        else:
            logger.warning(f"MODEL NOT AVAILABLE | Type: {model_type}")
    
    @staticmethod
    def log_db_operation(operation: str, success: bool, record_count: int = None):
        """Log database operations."""
        status = "SUCCESS" if success else "FAILED"
        msg = f"DB {operation} {status}"
        if record_count is not None:
            msg += f" | Records: {record_count}"
        logger.info(msg)

class HealthMonitor:
    """Monitor system health and dependencies."""
    
    status = {
        'api': 'healthy',
        'model': False,
        'database': False,
        'timestamp': None
    }
    
    @staticmethod
    def update_model_status(loaded: bool):
        HealthMonitor.status['model'] = loaded
        HealthMonitor.status['timestamp'] = datetime.utcnow().isoformat()
    
    @staticmethod
    def update_database_status(connected: bool):
        HealthMonitor.status['database'] = connected
        HealthMonitor.status['timestamp'] = datetime.utcnow().isoformat()
    
    @staticmethod
    def get_status():
        return HealthMonitor.status

class ErrorTracker:
    """Track API errors for debugging."""
    
    errors = []
    max_history = 100
    
    @staticmethod
    def log_error(error_type: str, message: str, context: Dict[str, Any] = None):
        """Log an error with context."""
        error_record = {
            'timestamp': datetime.utcnow().isoformat(),
            'type': error_type,
            'message': message,
            'context': context or {}
        }
        ErrorTracker.errors.append(error_record)
        
        # Keep only recent errors
        if len(ErrorTracker.errors) > ErrorTracker.max_history:
            ErrorTracker.errors.pop(0)
        
        logger.error(f"{error_type}: {message}", extra={'context': context})
    
    @staticmethod
    def get_recent_errors(count: int = 10):
        """Get recent errors."""
        return ErrorTracker.errors[-count:]
    
    @staticmethod
    def get_error_summary():
        """Get error summary statistics."""
        error_types = {}
        for error in ErrorTracker.errors:
            err_type = error['type']
            error_types[err_type] = error_types.get(err_type, 0) + 1
        return error_types
