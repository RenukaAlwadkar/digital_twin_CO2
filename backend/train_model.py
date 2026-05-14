import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import joblib
import os
from dataset_generator import generate_synthetic_data

def train_and_save_model():
    data_file = "historical_co2_data.csv"
    if not os.path.exists(data_file):
        print(f"{data_file} not found. Generating data...")
        df = generate_synthetic_data()
        df.to_csv(data_file, index=False)
    else:
        df = pd.read_csv(data_file)
        
    print(f"Dataset loaded with {len(df)} samples.")
    
    # Features and Target
    X = df[['temperature', 'humidity', 'wind_speed', 'pollution_index', 'time_of_day', 'traffic_factor']]
    y = df['co2']
    
    # Train test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train Random Forest
    print("Training Random Forest Regressor...")
    model = RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_scaled)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae = mean_absolute_error(y_test, y_pred)
    
    print(f"Model Evaluation -> RMSE: {rmse:.2f}, MAE: {mae:.2f}")
    
    # Save Model and Scaler
    joblib.dump(model, "rf_model.joblib")
    joblib.dump(scaler, "scaler.joblib")
    print("Model saved to rf_model.joblib and scaler saved to scaler.joblib")

if __name__ == "__main__":
    train_and_save_model()
