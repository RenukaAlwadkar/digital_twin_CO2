import { useState, useEffect } from 'react';
import CITIES from '../data/cities';
import { fetchWaqiCityNodes } from '../services/aqiApi';

const safeNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getIaQiValue = (iaqi, key) => {
  const value = iaqi?.[key]?.v;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildWaqiStationNode = (city, station, index = 0) => {
  const stationName = station?.city?.name || `WAQI Station ${index + 1}`;
  const stationGeo = station?.city?.geo || [];
  const lat = safeNumber(stationGeo[0], city.lat);
  const lng = safeNumber(stationGeo[1], city.lng);

  const iaqi = station?.iaqi || {};
  const aqi = Number(station?.aqi);
  const pm25 = getIaQiValue(iaqi, 'pm25');
  const pm10 = getIaQiValue(iaqi, 'pm10');
  const no2 = getIaQiValue(iaqi, 'no2');
  const so2 = getIaQiValue(iaqi, 'so2');
  const o3 = getIaQiValue(iaqi, 'o3');
  const co = getIaQiValue(iaqi, 'co');
  const humidity = getIaQiValue(iaqi, 'h');
  const temperature = getIaQiValue(iaqi, 't');
  const pressure = getIaQiValue(iaqi, 'p');
  const windSpeed = getIaQiValue(iaqi, 'w');

  // Keep CO2 proxy consistent with existing model when direct CO2 is unavailable.
  const coPpm = (co ?? 0) / 1.145;
  const no2Ppm = (no2 ?? 0) / 1000;
  const co2Estimated = Math.max(400, 420 + coPpm * 0.12 + no2Ppm * 8000 + (Number.isFinite(aqi) ? (aqi / 500) * 300 : 0));

  return {
    id: `city-${city.id}-waqi-${station?.idx ?? index}`,
    name: stationName,
    location: city.name,
    state: city.state,
    type: 'air_quality',
    category: 'Air quality sensor',
    source: 'waqi',
    sourceState: 'live',
    active: true,
    lat,
    lng,
    zone: city.state,
    temperatureC: temperature,
    humidityPct: humidity,
    wind_speed: windSpeed,
    pressure,
    feelsLike: null,
    visibility: null,
    weatherDesc: '',
    pm25,
    pm10,
    no2,
    so2,
    o3,
    co,
    nh3: null,
    aqi: Number.isFinite(aqi) ? aqi : null,
    aqiRaw: null,
    co2ppm: co2Estimated,
    signalStrength: Number.isFinite(aqi) ? Math.max(0.2, 1 - (aqi / 500)) : 0.6,
    updatedAt: station?.time?.s ?? Date.now(),
    stationUid: station?.idx ?? null,
  };
};

const buildCityAggregateNode = (city, stationNodes) => {
  const validAqi = stationNodes.map((n) => safeNumber(n.aqi, null)).filter((v) => v !== null);
  const validPm25 = stationNodes.map((n) => safeNumber(n.pm25, null)).filter((v) => v !== null);
  const validCo2 = stationNodes.map((n) => safeNumber(n.co2ppm, null)).filter((v) => v !== null);

  const avg = (arr, fallback = null) => (arr.length ? (arr.reduce((s, v) => s + v, 0) / arr.length) : fallback);
  const avgAqi = avg(validAqi, null);

  return {
    id: `city-${city.id}`,
    name: `${city.name} Air Quality`,
    location: city.name,
    state: city.state,
    type: 'air_quality',
    category: 'Air quality sensor',
    source: 'waqi',
    sourceState: 'live',
    active: true,
    lat: city.lat,
    lng: city.lng,
    zone: city.state,
    temperatureC: avg(stationNodes.map((n) => safeNumber(n.temperatureC, null)).filter((v) => v !== null), null),
    humidityPct: avg(stationNodes.map((n) => safeNumber(n.humidityPct, null)).filter((v) => v !== null), null),
    wind_speed: avg(stationNodes.map((n) => safeNumber(n.wind_speed, null)).filter((v) => v !== null), null),
    pressure: avg(stationNodes.map((n) => safeNumber(n.pressure, null)).filter((v) => v !== null), null),
    feelsLike: null,
    visibility: null,
    weatherDesc: '',
    pm25: avg(validPm25, null),
    pm10: avg(stationNodes.map((n) => safeNumber(n.pm10, null)).filter((v) => v !== null), null),
    no2: avg(stationNodes.map((n) => safeNumber(n.no2, null)).filter((v) => v !== null), null),
    so2: avg(stationNodes.map((n) => safeNumber(n.so2, null)).filter((v) => v !== null), null),
    o3: avg(stationNodes.map((n) => safeNumber(n.o3, null)).filter((v) => v !== null), null),
    co: avg(stationNodes.map((n) => safeNumber(n.co, null)).filter((v) => v !== null), null),
    nh3: null,
    aqi: avgAqi,
    aqiRaw: null,
    co2ppm: avg(validCo2, 420),
    signalStrength: Number.isFinite(avgAqi) ? Math.max(0.2, 1 - (avgAqi / 500)) : 0.6,
    updatedAt: Date.now(),
    isCityAggregate: true,
    stationCount: stationNodes.length,
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
    console.info('[WAQI] Fetch cycle started for listed cities');
    const token = "cbf222bbdfbb6635706c1a7218ba5703b84540d0";
    if (!token) {
      console.error('[WAQI] Missing REACT_APP_WAQI_TOKEN. Strict WAQI mode active; skipping all cities.');
      setCityNodes([]);
      setLoading(false);
      return;
    }

    const results = await Promise.all(
      CITIES.map(async (city) => {
        // Priority #1: WAQI stations for this city (multiple nodes)
        const waqiStations = await fetchWaqiCityNodes(city.name, city.state).catch(() => []);

        if (waqiStations.length > 0) {
          const stationNodes = waqiStations.map((station, index) => buildWaqiStationNode(city, station, index));
          const primary = buildCityAggregateNode(city, stationNodes);
          console.info('[WAQI] City stations loaded', { city: city.name, stationCount: stationNodes.length, avgAqi: primary.aqi });
          return { city, nodes: [primary, ...stationNodes] };
        }

        // Strict WAQI mode: do not fallback to other providers.
        return { city, nodes: [] };
      }),
    );

    const skippedCities = results
      .filter((entry) => !entry?.nodes?.length)
      .map((entry) => ({ city: entry?.city?.name, state: entry?.city?.state }))
      .filter((entry) => entry.city);

    if (skippedCities.length) {
      console.warn('[WAQI] No WAQI stations found for some cities; skipped in strict mode', {
        skippedCount: skippedCities.length,
        skippedCities,
      });
    }

    const flattened = results.flatMap((entry) => entry.nodes || []).filter(Boolean);
    if (!flattened.length) {
      console.error('[WAQI] No WAQI data available for any listed city. Dashboard AQI will be unavailable.');
    }
    setCityNodes(flattened);
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
