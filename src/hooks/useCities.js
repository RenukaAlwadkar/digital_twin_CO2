import { useState, useEffect } from 'react';
import CITIES from '../data/cities';

const API_KEY = '4eba3a521b5042e954fb52fc90d13eea';

/**
 * Fetches real weather + air pollution data for a single city.
 */
const fetchCityData = async (city) => {
  const { lat, lng } = city;
  try {
    const [weatherRes, pollutionRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${API_KEY}&units=metric`),
      fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${API_KEY}`),
    ]);

    const weather   = await weatherRes.json();
    const pollution = await pollutionRes.json();

    const components = pollution.list[0].components;
    const aqiRaw     = pollution.list[0].main.aqi; // 1=Good … 5=Very Poor

    // Convert AQI 1-5 to 0-500 scale for display consistency
    const aqiScaled = (aqiRaw / 5) * 500;

    // Estimate CO2 from NO2 and CO proxies (OpenWeather doesn't give CO2 directly)
    // Using CO (mg/m³) converted to ppm + NO2 contribution as a realistic proxy
    const coPpm  = components.co  / 1.145; // convert µg/m³ → ppm approx
    const no2Ppm = components.no2 / 1000;
    const co2Estimated = Math.max(400, 420 + coPpm * 0.12 + no2Ppm * 8000 + (aqiRaw - 1) * 80);

    const node = {
      id:          `city-${city.id}`,
      name:        `${city.name} Air Quality`,
      location:    city.name,
      state:       city.state,
      type:        'air_quality',
      category:    'Air quality sensor',
      source:      'api',
      sourceState: 'live',
      active:      true,
      lat:         city.lat,
      lng:         city.lng,
      zone:        city.state,

      // Real API values
      temperatureC: weather.main.temp,
      humidityPct:  weather.main.humidity,
      wind_speed:   weather.wind.speed,
      pm25:         components.pm2_5,
      pm10:         components.pm10,
      no2:          components.no2,
      so2:          components.so2,
      co:           components.co,
      o3:           components.o3,
      nh3:          components.nh3,
      aqi:          aqiScaled,
      aqiRaw:       aqiRaw,
      co2ppm:       co2Estimated,

      // Extra weather info
      weatherDesc:  weather.weather?.[0]?.description ?? '',
      pressure:     weather.main.pressure,
      visibility:   weather.visibility,
      feelsLike:    weather.main.feels_like,

      signalStrength: Math.max(0.2, 1 - (aqiRaw - 1) / 4),
      updatedAt:      Date.now(),
    };

    console.log(`🌆 [API] ${city.name}:`, {
      temp: node.temperatureC,
      humidity: node.humidityPct,
      aqi: node.aqiRaw,
      pm25: node.pm25,
      co2ppm: node.co2ppm.toFixed(0),
    });

    return node;
  } catch (err) {
    console.error(`Failed to fetch data for ${city.name}:`, err);
    return null;
  }
};

/**
 * Hook: fetches live weather data for all Indian cities every 60s.
 */
const useCities = () => {
  const [cityNodes, setCityNodes] = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetchAll = async () => {
    const results = await Promise.all(CITIES.map(city => fetchCityData(city)));
    const valid = results.filter(Boolean);
    setCityNodes(valid);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60 * 1000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  return { cityNodes, loading };
};

export default useCities;
