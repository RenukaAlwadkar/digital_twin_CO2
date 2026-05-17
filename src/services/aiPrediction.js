const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 10000; // 10 seconds

// Helper function for API calls with timeout
const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export const fetchCo2Predictions = async (data) => {
  try {
    const payload = {
      temperature: data.temperature || 30,
      humidity: data.humidity || 50,
      wind_speed: data.wind_speed || 5.0,
      pollution_index: data.pollution_index || 100,
      time_of_day: data.time_of_day || new Date().getHours(),
      traffic_factor: data.trafficDensity || 50,
      // Add optional 20-feature model fields
      pm2_5: data.pm2_5 || 25,
      pm10: data.pm10 || 40,
      no: data.no || 5,
      no2: data.no2 || 15,
      nox: data.nox || 20,
      nh3: data.nh3 || 2,
      co: data.co || 400,
      so2: data.so2 || 10,
      o3: data.o3 || 30,
      aqi: data.aqi || 2,
    };

    const response = await fetchWithTimeout(`${API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`Prediction API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.warn("Prediction service unavailable, returning mock predictions:", error.message);
    // Return mock prediction if backend is not running
    const base = data.co2ppm || 400;
    return {
      predicted_co2: base + Math.random() * 50,
      anomaly: false,
    };
  }
};

export const simulateScenario = async (baseData, scenarioParams) => {
  try {
    const payload = {
      base_data: {
        temperature: baseData.temperature || 30,
        humidity: baseData.humidity || 50,
        wind_speed: baseData.wind_speed || 5.0,
        pollution_index: baseData.pollution_index || 100,
        time_of_day: baseData.time_of_day || new Date().getHours(),
        traffic_factor: baseData.trafficDensity || 50,
        pm2_5: baseData.pm2_5 || 25,
        pm10: baseData.pm10 || 40,
        no: baseData.no || 5,
        no2: baseData.no2 || 15,
        nox: baseData.nox || 20,
        nh3: baseData.nh3 || 2,
        co: baseData.co || 400,
        so2: baseData.so2 || 10,
        o3: baseData.o3 || 30,
        aqi: baseData.aqi || 2,
      },
      traffic_level: scenarioParams.traffic_level || 'medium',
      green_cover_increase: scenarioParams.green_cover_increase || 0,
      wind_speed_change: scenarioParams.wind_speed_change || 0,
      industrial_emissions: scenarioParams.industrial_emissions || 0,
    };

    const response = await fetchWithTimeout(`${API_URL}/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`Simulation API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn("Simulation service unavailable:", error.message);
    return null;
  }
};

export const fetchTelemetryHistory = async (limit = 100) => {
  try {
    const response = await fetchWithTimeout(
      `${API_URL}/history/telemetry?limit=${Math.min(limit, 1000)}`,
      { method: 'GET' }
    );
    
    if (!response.ok) {
      throw new Error(`History API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn("Failed to fetch telemetry history:", error.message);
    return [];
  }
};

export const fetchSimulationHistory = async (limit = 50) => {
  try {
    const response = await fetchWithTimeout(
      `${API_URL}/history/simulations?limit=${Math.min(limit, 500)}`,
      { method: 'GET' }
    );
    
    if (!response.ok) {
      throw new Error(`Simulations API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn("Failed to fetch simulation history:", error.message);
    return [];
  }
};

export const saveTelemetryData = async (data) => {
  try {
    const payload = {
      temperature: data.temperature || 30,
      humidity: data.humidity || 50,
      wind_speed: data.wind_speed || 5.0,
      pollution_index: data.pollution_index || 100,
      time_of_day: data.time_of_day || new Date().getHours(),
      traffic_factor: data.trafficDensity || 50,
    };

    const response = await fetchWithTimeout(`${API_URL}/history/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`Save telemetry API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn("Failed to save telemetry data:", error.message);
    return { status: 'failed' };
  }
};

export const fetchHealthStatus = async () => {
  try {
    const response = await fetchWithTimeout(`${API_URL}/health`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn("Backend health check failed:", error.message);
    return { status: 'offline', model_loaded: false };
  }
};

export const fetchStatsSummary = async () => {
  try {
    const response = await fetchWithTimeout(`${API_URL}/stats/summary`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`Stats API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn("Failed to fetch stats summary:", error.message);
    return null;
  }
};
