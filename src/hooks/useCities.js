import { useState, useEffect } from 'react';
import CITIES from '../data/cities';
import { fetchOpenWeatherData } from '../services/openWeatherApi';

/**
 * Converts raw OpenWeather API result into a structured node object for a given city.
 */
const buildCityNode = (city, data) => {
  const aqiRaw    = data.aqi;                             // 1–5 scale
  const aqiScaled = (aqiRaw / 5) * 500;                   // normalise to 0–500 for heatmap

  // Estimate CO2 from CO + NO2 as an API proxy (no direct CO2 endpoint available)
  const coPpm          = data.co / 1.145;                 // µg/m³ → ppm approx
  const no2Ppm         = data.no2 / 1000;
  const co2Estimated   = Math.max(400, 420 + coPpm * 0.12 + no2Ppm * 8000 + (aqiRaw - 1) * 80);

  return {
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

    // Real weather
    temperatureC: data.temperature,
    humidityPct:  data.humidity,
    wind_speed:   data.wind_speed,
    pressure:     data.pressure,
    feelsLike:    data.feels_like,
    visibility:   data.visibility,
    weatherDesc:  data.weatherDesc,

    // Real air quality
    pm25:    data.pm2_5,
    pm10:    data.pm10,
    no2:     data.no2,
    so2:     data.so2,
    o3:      data.o3,
    co:      data.co,
    nh3:     data.nh3,
    aqi:     aqiScaled,
    aqiRaw,
    co2ppm:  co2Estimated,

    signalStrength: Math.max(0.2, 1 - (aqiRaw - 1) / 4),
    updatedAt:      Date.now(),
  };
};

/**
 * Hook: fetches live weather + air pollution for all Indian cities every 60s.
 * Uses the shared fetchOpenWeatherData service with each city's real coordinates.
 */
const useCities = () => {
  const [cityNodes, setCityNodes] = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetchAll = async () => {
    const results = await Promise.all(
      CITIES.map(city =>
        fetchOpenWeatherData(city.lat, city.lng, city.name)
          .then(data => data ? buildCityNode(city, data) : null)
      )
    );
    setCityNodes(results.filter(Boolean));
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
