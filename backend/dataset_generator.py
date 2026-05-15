import pandas as pd
import numpy as np

def generate_synthetic_data(num_samples=10000):
    np.random.seed(42)
    
    # Generate features
    # time_of_day = np.random.randint(0, 24, num_samples)
    # temperature = np.random.uniform(15, 45, num_samples)
    # humidity = np.random.uniform(20, 95, num_samples)
    # wind_speed = np.random.uniform(0, 15, num_samples)
    # pollution_index = np.random.uniform(20, 500, num_samples)
    # traffic_factor = np.random.uniform(0, 100, num_samples)
    
    # Simulate CO2 dependency
    # Base CO2
    co2 = 400.0
    
    # Traffic increases CO2
    co2 += traffic_factor * 8.5
    
    # Pollution index correlates with CO2
    co2 += pollution_index * 1.2
    
    # Wind disperses CO2
    co2 -= wind_speed * 15.0
    
    # Time of day effects (rush hours)
    rush_hour_effect = np.where((time_of_day >= 8) & (time_of_day <= 10) | (time_of_day >= 17) & (time_of_day <= 20), 150, 0)
    co2 += rush_hour_effect
    
    # Temperature/Humidity slight effect
    co2 += (temperature - 25) * 2
    
    # Add some random noise
    co2 += np.random.normal(0, 30, num_samples)
    
    # Clip to realistic values
    co2 = np.clip(co2, 380, 2500)
    
    df = pd.DataFrame({
        'time_of_day': time_of_day,
        'temperature': temperature,
        'humidity': humidity,
        'wind_speed': wind_speed,
        'pollution_index': pollution_index,
        'traffic_factor': traffic_factor,
        'co2': co2
    })
    
    return df

if __name__ == "__main__":
    print("Generating synthetic dataset...")
    df = generate_synthetic_data()
    df.to_csv("historical_co2_data.csv", index=False)
    print("Saved to historical_co2_data.csv")
