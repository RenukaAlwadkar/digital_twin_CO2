const DEFAULT_CENTER = { lat: 28.6139, lng: 77.2090 };
const API_TIMEOUT_MS = 10000;

// Feature flag: set REACT_APP_SHOW_TRAFFIC=false to disable traffic overlays
const showTraffic = (process.env.REACT_APP_SHOW_TRAFFIC || 'true').toLowerCase() === 'false';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

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

const DELHI_ROAD_CORRIDORS = [
  {
    id: 'outer-ring-road',
    name: 'Outer Ring Road',
    path: [
      [28.736, 77.120],
      [28.721, 77.210],
      [28.674, 77.308],
      [28.596, 77.317],
      [28.539, 77.265],
      [28.559, 77.130],
      [28.662, 77.079],
      [28.736, 77.120],
    ],
  },
  {
    id: 'inner-ring-road',
    name: 'Inner Ring Road',
    path: [
      [28.663, 77.095],
      [28.686, 77.188],
      [28.662, 77.272],
      [28.602, 77.295],
      [28.553, 77.252],
      [28.570, 77.150],
      [28.623, 77.092],
      [28.663, 77.095],
    ],
  },
  {
    id: 'nh48-corridor',
    name: 'NH 48 Corridor',
    path: [
      [28.735, 77.102],
      [28.684, 77.109],
      [28.628, 77.122],
      [28.570, 77.147],
      [28.521, 77.196],
    ],
  },
  {
    id: 'yamuna-river-road',
    name: 'Yamuna River Road',
    path: [
      [28.720, 77.255],
      [28.680, 77.260],
      [28.636, 77.266],
      [28.590, 77.271],
      [28.540, 77.275],
    ],
  },
];

const makeFallbackTraffic = (center = DEFAULT_CENTER) => {
  const now = new Date();
  const hour = now.getHours();
  const rushFactor = ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20)) ? 0.72 : 0.48;
  const dayVariation = 0.1 + ((now.getMinutes() % 15) / 150);
  const congestionPct = clamp((rushFactor + dayVariation) * 100, 18, 92);
  const averageSpeedKph = clamp(48 - (congestionPct * 0.35), 12, 52);

  return {
    source: 'mock',
    city: 'Delhi',
    center,
    congestionPct,
    trafficDensity: congestionPct,
    averageSpeedKph,
    vehicleCount: Math.round(600 + (congestionPct * 18)),
    travelTimeMinutes: Math.round(24 + (congestionPct * 0.28)),
    freeFlowSpeedKph: 52,
    updatedAt: now.toISOString(),
    label: congestionPct >= 80 ? 'Severe' : congestionPct >= 60 ? 'Heavy' : congestionPct >= 35 ? 'Moderate' : 'Light',
  };
};

const getRoadMidpoint = (path = []) => {
  if (!path.length) return DEFAULT_CENTER;
  const midpointIndex = Math.floor(path.length / 2);
  const [lat, lng] = path[midpointIndex];
  return { lat, lng };
};

const congestionLabel = (congestionPct) => {
  if (congestionPct >= 80) return 'Severe';
  if (congestionPct >= 60) return 'Heavy';
  if (congestionPct >= 35) return 'Moderate';
  return 'Light';
};

const makeFallbackRoads = () => {
  const baseline = makeFallbackTraffic();

  return DELHI_ROAD_CORRIDORS.map((corridor, index) => {
    const jitter = ((index % 2 === 0 ? 1 : -1) * (6 + index * 2));
    const congestionPct = clamp(baseline.congestionPct + jitter, 10, 95);
    const averageSpeedKph = clamp(52 - (congestionPct * 0.4), 10, 58);

    return {
      id: corridor.id,
      name: corridor.name,
      path: corridor.path,
      congestionPct,
      trafficDensity: congestionPct,
      averageSpeedKph,
      travelTimeMinutes: Math.round(18 + congestionPct * 0.24),
      source: 'mock',
      updatedAt: baseline.updatedAt,
      label: congestionLabel(congestionPct),
    };
  });
};

const fetchTomTomFlowPoint = async ({ lat, lng, apiKey }) => {
  const url = new URL('https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json');
  url.searchParams.set('point', `${lat},${lng}`);
  url.searchParams.set('unit', 'KMPH');
  url.searchParams.set('openLr', 'false');
  url.searchParams.set('key', apiKey);

  const response = await fetchWithTimeout(url.toString());
  if (!response.ok) {
    throw new Error(`Traffic API request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const flow = payload?.flowSegmentData ?? {};
  const currentSpeed = Number(flow.currentSpeed ?? 0);
  const freeFlowSpeed = Number((flow.freeFlowSpeed ?? currentSpeed) || 1);
  const congestionPct = clamp(100 - ((currentSpeed / Math.max(freeFlowSpeed, 1)) * 100), 0, 100);

  return {
    congestionPct,
    trafficDensity: congestionPct,
    averageSpeedKph: currentSpeed,
    travelTimeMinutes: Number(flow.travelTimeMinutes ?? Math.round((flow.lengthInMeters ?? 1000) / Math.max(currentSpeed, 1) * 0.06)),
    freeFlowSpeedKph: freeFlowSpeed,
    raw: payload,
  };
};

export const fetchDelhiTrafficFlow = async ({ lat = DEFAULT_CENTER.lat, lng = DEFAULT_CENTER.lng } = {}) => {
  if (!showTraffic) {
    return {
      source: 'disabled',
      city: 'Delhi',
      center: { lat, lng },
      congestionPct: 0,
      trafficDensity: 0,
      averageSpeedKph: 52,
      vehicleCount: 0,
      travelTimeMinutes: 0,
      freeFlowSpeedKph: 52,
      updatedAt: new Date().toISOString(),
      label: 'Disabled',
    };
  }

  const apiKey = process.env.REACT_APP_TOMTOM_TRAFFIC_KEY || process.env.REACT_APP_TRAFFIC_API_KEY || '';

  if (!apiKey) {
    return makeFallbackTraffic({ lat, lng });
  }

  try {
    const flow = await fetchTomTomFlowPoint({ lat, lng, apiKey });

    return {
      source: 'tomtom',
      city: 'Delhi',
      center: { lat, lng },
      congestionPct: flow.congestionPct,
      trafficDensity: flow.trafficDensity,
      averageSpeedKph: flow.averageSpeedKph,
      vehicleCount: Math.round(flow.congestionPct * 12 + 250),
      travelTimeMinutes: flow.travelTimeMinutes,
      freeFlowSpeedKph: flow.freeFlowSpeedKph,
      updatedAt: new Date().toISOString(),
      label: congestionLabel(flow.congestionPct),
      raw: flow.raw,
    };
  } catch (error) {
    console.warn('[Traffic API] Falling back to synthetic traffic data:', error.message);
    return makeFallbackTraffic({ lat, lng });
  }
};

export const fetchDelhiTrafficRoads = async () => {
  if (!showTraffic) {
    return [];
  }

  const apiKey = process.env.REACT_APP_TOMTOM_TRAFFIC_KEY || process.env.REACT_APP_TRAFFIC_API_KEY || '';
  if (!apiKey) {
    return makeFallbackRoads();
  }

  try {
    const roads = await Promise.all(DELHI_ROAD_CORRIDORS.map(async (corridor) => {
      const midpoint = getRoadMidpoint(corridor.path);
      const flow = await fetchTomTomFlowPoint({ lat: midpoint.lat, lng: midpoint.lng, apiKey });

      return {
        id: corridor.id,
        name: corridor.name,
        path: corridor.path,
        congestionPct: flow.congestionPct,
        trafficDensity: flow.trafficDensity,
        averageSpeedKph: flow.averageSpeedKph,
        travelTimeMinutes: flow.travelTimeMinutes,
        source: 'tomtom',
        updatedAt: new Date().toISOString(),
        label: congestionLabel(flow.congestionPct),
      };
    }));

    return roads;
  } catch (error) {
    console.warn('[Traffic API] Road fetch failed, using fallback roads:', error.message);
    return makeFallbackRoads();
  }
};

export default fetchDelhiTrafficFlow;
