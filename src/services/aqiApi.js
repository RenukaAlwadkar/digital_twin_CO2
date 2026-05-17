// Simple AQI helper using OpenAQ latest measurements and PM2.5->AQI conversion
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map();
const getWaqiToken = () => "cbf222bbdfbb6635706c1a7218ba5703b84540d0";

const logWaqi = (level, message, meta) => {
  const prefix = '[WAQI]';
  const payload = meta ? [prefix, message, meta] : [prefix, message];
  if (level === 'error') console.error(...payload);
  else if (level === 'warn') console.warn(...payload);
  else console.info(...payload);

  if (typeof window !== 'undefined') {
    window.__WAQI_RUNTIME_LOGS__ = window.__WAQI_RUNTIME_LOGS__ || [];
    window.__WAQI_RUNTIME_LOGS__.push({ ts: new Date().toISOString(), level, message, meta: meta || null });
    if (window.__WAQI_RUNTIME_LOGS__.length > 200) {
      window.__WAQI_RUNTIME_LOGS__ = window.__WAQI_RUNTIME_LOGS__.slice(-200);
    }
  }
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// US EPA breakpoint table for PM2.5 (µg/m3) to AQI
const pm25ToAqi = (pm25) => {
  const pairs = [
    [0.0, 12.0, 0, 50],
    [12.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200],
    [150.5, 250.4, 201, 300],
    [250.5, 350.4, 301, 400],
    [350.5, 500.4, 401, 500],
  ];

  if (pm25 === null || pm25 === undefined || Number.isNaN(pm25)) return null;
  const c = Number(pm25);
  for (const [clo, chi, ilo, ihi] of pairs) {
    if (c >= clo && c <= chi) {
      const aqi = Math.round(((ihi - ilo) / (chi - clo)) * (c - clo) + ilo);
      return clamp(aqi, 0, 500);
    }
  }
  return c > 500 ? 500 : null;
};

export const fetchOpenAqFor = async (lat, lng) => {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && (now - cached.ts) < CACHE_TTL) return cached.value;

  try {
    const url = `https://api.openaq.org/v2/latest?coordinates=${lat},${lng}&radius=20000&limit=1`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error('OpenAQ fetch failed');
    const json = await res.json();
    const result = (json.results && json.results[0]) || null;
    if (!result || !result.measurements) {
      cache.set(key, { ts: now, value: null });
      return null;
    }

    // prefer PM2.5 measurement
    const pm25Obj = result.measurements.find(m => m.parameter === 'pm25');
    const pm25 = pm25Obj ? Number(pm25Obj.value) : null;
    const aqi = pm25 !== null ? pm25ToAqi(pm25) : null;
    const value = { pm25, aqi, source: 'openaq', ts: result.date && result.date.utc };
    cache.set(key, { ts: now, value });
    return value;
  } catch (err) {
    cache.set(key, { ts: now, value: null });
    return null;
  }
};

// WAQI integration (token via REACT_APP_WAQI_TOKEN). Prefer WAQI when available.
export const fetchWaqiFor = async (lat, lng) => {
  const token = getWaqiToken();
  if (!token) return null;
  const key = `waqi:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && (now - cached.ts) < CACHE_TTL) return cached.value;

  try {
    const url = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${token}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error('WAQI fetch failed');
    const json = await res.json();
    if (!json || json.status !== 'ok' || !json.data) {
      cache.set(key, { ts: now, value: null });
      return null;
    }

    const aqi = Number(json.data.aqi);
    const pm25 = json.data.iaqi && json.data.iaqi.pm25 ? Number(json.data.iaqi.pm25.v) : null;
    const value = { pm25, aqi: Number.isFinite(aqi) ? aqi : null, source: 'waqi', ts: json.data.time && json.data.time.s };
    cache.set(key, { ts: now, value });
    return value;
  } catch (err) {
    cache.set(key, { ts: now, value: null });
    return null;
  }
};

const normalizeText = (value = '') => String(value).toLowerCase().replace(/\s+/g, ' ').trim();

const fetchWaqiStationByUid = async (uid, token) => {
  if (!uid) return null;
  const key = `waqi:uid:${uid}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && (now - cached.ts) < CACHE_TTL) return cached.value;

  try {
    const url = `https://api.waqi.info/feed/@${uid}/?token=${token}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error('WAQI station fetch failed');
    const json = await res.json();
    if (!json || json.status !== 'ok' || !json.data) {
      cache.set(key, { ts: now, value: null });
      return null;
    }
    cache.set(key, { ts: now, value: json.data });
    return json.data;
  } catch (err) {
    cache.set(key, { ts: now, value: null });
    return null;
  }
};

// Fetch all WAQI stations for a city. Returns array of detailed station payloads.
export const fetchWaqiCityNodes = async (cityName, stateName = '') => {
  const token = getWaqiToken();
  if (!token || !cityName) {
    logWaqi('error', 'Missing WAQI token or city name', { cityName, stateName, hasToken: Boolean(token) });
    return [];
  }

  const key = `waqi:city:${normalizeText(cityName)}:${normalizeText(stateName)}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && (now - cached.ts) < CACHE_TTL) return cached.value;

  try {
    // Use city-only query to maximize station coverage for that city.
    const query = encodeURIComponent(cityName);
    const searchUrl = `https://api.waqi.info/search/?keyword=${query}&token=${token}`;
    const res = await fetch(searchUrl, { method: 'GET' });
    if (!res.ok) throw new Error('WAQI search failed');

    const json = await res.json();
    if (!json || json.status !== 'ok' || !Array.isArray(json.data)) {
      logWaqi('error', `WAQI search returned non-ok status for ${cityName}`, {
        cityName,
        stateName,
        status: json?.status,
        detail: json?.data,
      });
      cache.set(key, { ts: now, value: [] });
      return [];
    }

    const cityNorm = normalizeText(cityName);
    const stateNorm = normalizeText(stateName);
    const matches = json.data.filter((item) => {
      const stationText = normalizeText(item?.station?.name || '');
      const hasCity = stationText.includes(cityNorm);
      // state is optional and may not be included in WAQI station labels
      const hasState = !stateNorm || stationText.includes(stateNorm);
      return hasCity && hasState;
    });

    const stationsToFetch = matches.length ? matches : json.data;
    const details = await Promise.all(
      stationsToFetch.map((item) => fetchWaqiStationByUid(item?.uid, token)),
    );

    const values = details.filter(Boolean);
    logWaqi('info', `Fetched WAQI stations for ${cityName}`, {
      city: cityName,
      state: stateName,
      searchCount: json.data.length,
      matchedCount: matches.length,
      stationCount: values.length,
    });
    cache.set(key, { ts: now, value: values });
    return values;
  } catch (err) {
    logWaqi('error', `Failed WAQI search for ${cityName}`, { cityName, stateName, error: String(err?.message || err) });
    cache.set(key, { ts: now, value: [] });
    return [];
  }
};

export const aqiToRawBucket = (aqi) => {
  if (!Number.isFinite(aqi)) return null;
  if (aqi <= 50) return 1;
  if (aqi <= 100) return 2;
  if (aqi <= 200) return 3;
  if (aqi <= 300) return 4;
  return 5;
};

export default {
  fetchWaqiFor,
  fetchWaqiCityNodes,
  fetchOpenAqFor,
  pm25ToAqi,
  aqiToRawBucket,
};
