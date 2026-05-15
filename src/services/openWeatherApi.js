const API_KEY = '4eba3a521b5042e954fb52fc90d13eea';

// AQI label mapping (OpenWeather 1–5 scale)
const AQI_LABELS = {
  1: '🟢 Good',
  2: '🟡 Fair',
  3: '🟠 Moderate',
  4: '🔴 Poor',
  5: '🟣 Very Poor',
};

/**
 * Fetch real weather + air pollution data for any city by lat/lon.
 * Defaults to New Delhi if no coordinates are provided.
 *
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} cityName - Optional city name for logging
 */
export const fetchOpenWeatherData = async (lat = 28.6139, lon = 77.2090, cityName = 'New Delhi') => {
  try {
    const [weatherRes, pollutionRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
      fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`),
    ]);

    const weatherData   = await weatherRes.json();
    const pollutionData = await pollutionRes.json();
    const components    = pollutionData.list[0].components;
    const aqiRaw        = pollutionData.list[0].main.aqi;

    const result = {
      temperature:  weatherData.main.temp,
      humidity:     weatherData.main.humidity,
      wind_speed:   weatherData.wind.speed,
      pressure:     weatherData.main.pressure,
      feels_like:   weatherData.main.feels_like,
      visibility:   weatherData.visibility,
      weatherDesc:  weatherData.weather?.[0]?.description ?? '',

      aqi:   aqiRaw,
      no:    components.no,
      pm2_5: components.pm2_5,
      pm10:  components.pm10,
      no2:   components.no2,
      so2:   components.so2,
      o3:    components.o3,
      co:    components.co,
      nh3:   components.nh3,
    };

    // Clean per-city summary log with AQI label
    console.log(
      `📍 ${cityName.padEnd(15)} | AQI: ${aqiRaw} ${AQI_LABELS[aqiRaw] ?? ''} | ` +
      `Temp: ${result.temperature.toFixed(1)}°C | ` +
      `Humidity: ${result.humidity}% | ` +
      `PM2.5: ${result.pm2_5.toFixed(1)} µg/m³ | ` +
      `PM10: ${result.pm10.toFixed(1)} µg/m³ | ` +
      `NO₂: ${result.no2.toFixed(1)} | ` +
      `Wind: ${result.wind_speed} m/s | ` +
      `${result.weatherDesc}`
    );

    return result;
  } catch (error) {
    console.error(`❌ Failed to fetch OpenWeather API for ${cityName}:`, error);
    return null;
  }
};
