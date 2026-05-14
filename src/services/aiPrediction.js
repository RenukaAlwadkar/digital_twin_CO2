const API_URL = 'http://localhost:8000';

export const fetchCo2Predictions = async (data) => {
  try {
    const payload = {
      temperature: data.temperature || 30,
      humidity: data.humidity || 50,
      wind_speed: data.wind_speed || 5.0,
      pollution_index: data.pollution_index || 100,
      time_of_day: data.time_of_day || new Date().getHours(),
      traffic_factor: data.trafficDensity || 50
    };

    const response = await fetch(`${API_URL}/forecast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error('Prediction API error');
    }
    
    return await response.json();
  } catch (error) {
    console.warn("Prediction service unavailable, returning mock predictions:", error);
    // Return mock prediction if backend is not running
    const base = data.co2ppm || 400;
    return {
      forecast_5m: [base + 10, base + 25, base + 15, base + 5, base + 2]
    };
  }
};
