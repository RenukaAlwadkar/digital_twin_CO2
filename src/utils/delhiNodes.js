
const DELHI_BOUNDS = {
  latMin: 28.4,
  latMax: 28.79,
  lngMin: 76.95,
  lngMax: 77.39,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));


const hashString = (text = '') => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const normalizePayloadId = (payload) => {
  const raw = String(payload?.nodeId ?? payload?.id ?? '').trim();
  if (!raw) return '';
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, '-');
};

const inferTypeFromPayload = (payload = {}) => {
  if (payload.trafficDensity !== undefined || payload.averageSpeedKph !== undefined || payload.vehicleCount !== undefined) {
    return 'traffic_monitoring';
  }
  return 'air_quality';
};

const deriveLocationFromPayload = (payload = {}) => {
  return payload.location || payload.station || payload.corridor || payload.city || 'External node';
};

const deriveZone = (lat, lng) => {
  const latMid = (DELHI_BOUNDS.latMin + DELHI_BOUNDS.latMax) / 2;
  const lngMid = (DELHI_BOUNDS.lngMin + DELHI_BOUNDS.lngMax) / 2;

  if (lat >= latMid && lng >= lngMid) return 'north-east';
  if (lat >= latMid && lng < lngMid) return 'north-west';
  if (lat < latMid && lng >= lngMid) return 'south-east';
  return 'south-west';
};

const buildDynamicPosition = (idSeed) => {
  const latRange = DELHI_BOUNDS.latMax - DELHI_BOUNDS.latMin;
  const lngRange = DELHI_BOUNDS.lngMax - DELHI_BOUNDS.lngMin;
  const lat = DELHI_BOUNDS.latMin + ((idSeed % 1000) / 1000) * latRange;
  const lng = DELHI_BOUNDS.lngMin + (((idSeed * 1.7) % 1000) / 1000) * lngRange;
  return { lat, lng };
};

const typeLabel = (type) => (type === 'traffic_monitoring' ? 'Traffic monitoring' : 'Air quality sensor');

const getMetricValue = (node, metricKey) => {
  if (metricKey === 'trafficDensity') {
    return Number(node.trafficDensity ?? node.base?.trafficDensity ?? 0);
  }
  if (metricKey === 'averageSpeedKph') {
    return Number(node.averageSpeedKph ?? node.base?.averageSpeedKph ?? 0);
  }
  if (metricKey === 'temperatureC') {
    return Number(node.temperatureC ?? node.base?.temperatureC ?? 0);
  }
  if (metricKey === 'humidityPct') {
    return Number(node.humidityPct ?? node.base?.humidityPct ?? 0);
  }
  if (metricKey === 'pm25') {
    return Number(node.pm25 ?? node.base?.pm25 ?? 0);
  }
  if (metricKey === 'co2ppm') {
    return Number(node.co2ppm ?? node.base?.co2ppm ?? 0);
  }
  return Number(node.aqi ?? node.base?.aqi ?? 0);
};

export const nodeTypeOptions = [
  { value: 'all', label: 'All nodes' },
  { value: 'air_quality', label: 'Air quality' },
  { value: 'traffic_monitoring', label: 'Traffic' },
];

export const metricOptions = [
  { value: 'aqi', label: 'AQI' },
  { value: 'pm25', label: 'PM2.5' },
  { value: 'co2ppm', label: 'CO2 ppm' },
  { value: 'trafficDensity', label: 'Traffic density' },
];

export const formatNodeType = typeLabel;

export const materializeDelhiNodes = ({ trafficData, envData, prototypeData, tick = 0, scenarioParams = {} } = {}) => {
  const trafficInfluence = Number(trafficData?.trafficDensity ?? 48);
  const trafficSpeed = Number(trafficData?.averageSpeedKph ?? 32);
  const trafficCo2 = Number(trafficData?.co2ppm ?? 920);
  const trafficAqi = Number(trafficData?.aqi ?? 120);
  const envTemperature = Number(envData?.temperatureC ?? 31.5);
  const envHumidity = Number(envData?.humidityPct ?? 56);
  const envCo2 = Number(envData?.co2ppm ?? 980);
  const envPm25 = Number(envData?.pm25 ?? 70);

  const { trafficReduction = 0, greenCover = 0, captureCount = 0, captureEfficiency = 50 } = scenarioParams;
  
  // Calculate total capture capacity
  // Assuming each unit can reduce CO2 by some max amount based on efficiency
  const totalCaptureReduction = captureCount > 0 ? (captureCount * (captureEfficiency / 100) * 10) : 0;

  const nodeById = new Map();
  const livePayloads = [trafficData, envData, prototypeData].filter(Boolean);

  livePayloads.forEach((payload) => {
    const id = normalizePayloadId(payload);
    if (!id) return;

    const inferredType = inferTypeFromPayload(payload);
    const existing = nodeById.get(id);
    const payloadLat = Number(payload.lat ?? payload.latitude);
    const payloadLng = Number(payload.lng ?? payload.longitude);

    const seed = hashString(id);
    const fallbackPosition = buildDynamicPosition(seed);
    const lat = Number.isFinite(payloadLat) ? payloadLat : Number(existing?.lat ?? fallbackPosition.lat);
    const lng = Number.isFinite(payloadLng) ? payloadLng : Number(existing?.lng ?? fallbackPosition.lng);

    const baseNode = existing ?? {
      id,
      name: payload.nodeName || payload.name || String(payload.nodeId || id),
      type: inferredType,
      location: deriveLocationFromPayload(payload),
      zone: deriveZone(lat, lng),
      lat,
      lng,
      source: 'live',
      active: true,
      base: {},
    };

    let trafficDensity = Number(payload.trafficDensity ?? baseNode.trafficDensity ?? baseNode.base?.trafficDensity ?? 0);
    if (inferredType === 'traffic_monitoring') {
      trafficDensity *= (1 - trafficReduction / 100);
    }
    
    const averageSpeedKph = Number(payload.averageSpeedKph ?? baseNode.averageSpeedKph ?? baseNode.base?.averageSpeedKph ?? 0);
    const temperatureC = Number(payload.temperatureC ?? baseNode.temperatureC ?? baseNode.base?.temperatureC ?? 0);
    const humidityPct = Number(payload.humidityPct ?? baseNode.humidityPct ?? baseNode.base?.humidityPct ?? 0);
    let co2ppm = Number(payload.co2ppm ?? payload.co2 ?? baseNode.co2ppm ?? baseNode.base?.co2ppm ?? 0);
    
    // Apply green cover and capture units
    co2ppm *= (1 - greenCover / 100);
    co2ppm = Math.max(400, co2ppm - totalCaptureReduction);
    
    const pm25 = Number(payload.pm25 ?? baseNode.pm25 ?? baseNode.base?.pm25 ?? 0);

    // DO NOT compute AQI locally. Preference for AQI (0-500):
    // 1) payload.externalAqi (e.g., provided by OpenAQ fetch)
    // 2) payload.aqi if it appears to already be in 0-500 range
    // Otherwise leave `aqi` null to indicate no fetched AQI available.
    let aqi = null;
    if (payload.externalAqi !== undefined && Number.isFinite(Number(payload.externalAqi))) {
      aqi = Number(payload.externalAqi);
    } else if (payload.aqi !== undefined && Number.isFinite(Number(payload.aqi))) {
      const candidate = Number(payload.aqi);
      if (candidate > 5) {
        // assume already 0-500
        aqi = candidate;
      }
    }

    const merged = {
      ...baseNode,
      type: inferredType,
      category: inferredType === 'traffic_monitoring' ? 'Traffic monitoring' : 'Air quality sensor',
      lat,
      lng,
      location: baseNode.location || deriveLocationFromPayload(payload),
      zone: baseNode.zone || deriveZone(lat, lng),
      sourceState: 'live',
      signalStrength: clamp((500 - aqi) / 500, 0.2, 1),
      updatedAt: payload.timestamp ?? Date.now(),
      trafficDensity,
      averageSpeedKph,
      temperatureC,
      humidityPct,
      co2ppm,
      pm25,
      aqi,
    };

    nodeById.set(id, merged);
  });

  return Array.from(nodeById.values());
};

export const summarizeDelhiNodes = (nodes) => {
  if (!nodes.length) {
    return {
      totalNodes: 0,
      liveNodes: 0,
      airQualityNodes: 0,
      trafficNodes: 0,
      avgAqi: 0,
      avgPm25: 0,
      avgCo2: 0,
      avgTrafficDensity: 0,
      avgSpeed: 0,
    };
  }

  const totals = nodes.reduce(
    (acc, node) => {
      if (node.sourceState === 'live') acc.liveNodes += 1;
      if (node.type === 'air_quality') acc.airQualityNodes += 1;
      if (node.type === 'traffic_monitoring') acc.trafficNodes += 1;
      acc.aqi += Number(node.aqi ?? 0);
      acc.pm25 += Number(node.pm25 ?? 0);
      acc.co2 += Number(node.co2ppm ?? 0);
      acc.trafficDensity += Number(node.trafficDensity ?? 0);
      acc.speed += Number(node.averageSpeedKph ?? 0);
      return acc;
    },
    { liveNodes: 0, airQualityNodes: 0, trafficNodes: 0, aqi: 0, pm25: 0, co2: 0, trafficDensity: 0, speed: 0 }
  );

  return {
    totalNodes: nodes.length,
    liveNodes: totals.liveNodes,
    airQualityNodes: totals.airQualityNodes,
    trafficNodes: totals.trafficNodes,
    avgAqi: totals.aqi / nodes.length,
    avgPm25: totals.pm25 / nodes.length,
    avgCo2: totals.co2 / nodes.length,
    avgTrafficDensity: totals.trafficDensity / nodes.length,
    avgSpeed: totals.speed / nodes.length,
  };
};

export const getCityKpiSummary = (nodes) => {
  if (!nodes.length) {
    return {
      avgAqi: 0,
      avgTemp: 0,
      avgHumidity: 0,
      avgCo2: 0,
      dayEmissionKg: 0,
      weekEmissionKg: 0,
      monthEmissionKg: 0,
    };
  }

  const effectiveNodes = nodes.filter((node) => !node.isCityAggregate);
  const sourceNodes = effectiveNodes.length ? effectiveNodes : nodes;
  const airNodes = sourceNodes.filter((node) => node.type === 'air_quality');

  const validAqi = sourceNodes
    .map((node) => Number(node.aqi))
    .filter((value) => Number.isFinite(value) && value > 0);
  const avgAqi = validAqi.length ? (validAqi.reduce((sum, value) => sum + value, 0) / validAqi.length) : 0;

  const avgCo2 = sourceNodes.reduce((sum, node) => {
    const value = Number(node.co2ppm);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0) / Math.max(sourceNodes.length, 1);

  const avgTemp = airNodes.length
    ? airNodes.reduce((sum, node) => sum + Number(node.temperatureC ?? 0), 0) / airNodes.length
    : 0;
  const avgHumidity = airNodes.length
    ? airNodes.reduce((sum, node) => sum + Number(node.humidityPct ?? 0), 0) / airNodes.length
    : 0;

  // A simple emission estimate derived from CO2 concentration above outdoor baseline.
  const emissionPerHourKg = nodes.reduce((sum, node) => {
    const co2AboveBaseline = Math.max(0, Number(node.co2ppm ?? 0) - 420);
    return sum + (co2AboveBaseline * 0.00125);
  }, 0);

  const dayEmissionKg = emissionPerHourKg * 24;

  return {
    avgAqi,
    avgTemp,
    avgHumidity,
    avgCo2,
    dayEmissionKg,
    weekEmissionKg: dayEmissionKg * 7,
    monthEmissionKg: dayEmissionKg * 30,
  };
};


export const buildCityHeatmap = (nodes, metricKey = 'aqi', columns = 12, rows = 8) => {
  if (!nodes.length) return [];

  const buckets = new Map();

  nodes.forEach((node) => {
    const latNorm = clamp((Number(node.lat) - DELHI_BOUNDS.latMin) / (DELHI_BOUNDS.latMax - DELHI_BOUNDS.latMin), 0, 1);
    const lngNorm = clamp((Number(node.lng) - DELHI_BOUNDS.lngMin) / (DELHI_BOUNDS.lngMax - DELHI_BOUNDS.lngMin), 0, 1);
    const col = clamp(Math.floor(lngNorm * columns), 0, columns - 1);
    const row = clamp(Math.floor((1 - latNorm) * rows), 0, rows - 1);
    const key = `${col}:${row}`;
    const intensity = getMetricValue(node, metricKey);

    if (!buckets.has(key)) {
      buckets.set(key, { col, row, sum: 0, count: 0 });
    }

    const bucket = buckets.get(key);
    bucket.sum += intensity;
    bucket.count += 1;
  });

  return Array.from(buckets.values()).map((bucket) => {
    const average = bucket.sum / Math.max(bucket.count, 1);
    return {
      key: `${bucket.col}:${bucket.row}`,
      col: bucket.col,
      row: bucket.row,
      x: (bucket.col + 0.5) / columns,
      y: (bucket.row + 0.5) / rows,
      value: average,
      count: bucket.count,
    };
  });
};

export const getNodeMetricPreview = (node) => {
  if (!node) return 'No node selected';
  if (node.type === 'traffic_monitoring') {
    return `${Math.round(Number(node.trafficDensity ?? 0))}% traffic`;
  }
  return `${Math.round(Number(node.aqi ?? 0))} AQI`;
};

export const getNodeMetricDetails = (node) => {
  if (!node) return [];

  if (node.type === 'traffic_monitoring') {
    return [
      { label: 'Traffic density', value: `${Number(node.trafficDensity ?? 0).toFixed(0)}%` },
      { label: 'Average speed', value: `${Number(node.averageSpeedKph ?? 0).toFixed(1)} km/h` },
      { label: 'CO2', value: `${Number(node.co2ppm ?? 0).toFixed(0)} ppm` },
      { label: 'AQI', value: `${Number(node.aqi ?? 0).toFixed(0)}` },
    ];
  }

  return [
    { label: 'Temperature', value: `${Number(node.temperatureC ?? 0).toFixed(1)} C` },
    { label: 'Humidity', value: `${Number(node.humidityPct ?? 0).toFixed(1)}%` },
    { label: 'CO2', value: `${Number(node.co2ppm ?? 0).toFixed(0)} ppm` },
    { label: 'PM2.5', value: `${Number(node.pm25 ?? 0).toFixed(1)}` },
  ];
};
