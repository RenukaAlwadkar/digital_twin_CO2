import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';

const DELHI_CENTER = { lat: 28.6139, lng: 77.2090 };

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const buildGradientLut = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0.0, 'rgba(20, 83, 45, 0)');
  gradient.addColorStop(0.08, 'rgba(34, 197, 94, 0.35)');
  gradient.addColorStop(0.3, 'rgba(132, 204, 22, 0.55)');
  gradient.addColorStop(0.52, 'rgba(250, 204, 21, 0.72)');
  gradient.addColorStop(0.72, 'rgba(249, 115, 22, 0.85)');
  gradient.addColorStop(1.0, 'rgba(220, 38, 38, 0.95)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
};

const percentile = (values, p = 0.94) => {
  if (!values.length) return 1;
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp(Math.floor(sorted.length * p), 0, sorted.length - 1);
  return Math.max(sorted[index], 1e-6);
};

const WeatherHeatOverlay = ({ liveIntensity, cityHotspots = [] }) => {
  const map = useMap();
  const overlayRef = useRef(null);
  const seedRef = useRef(null);
  const gradientRef = useRef(null);
  const fieldRef = useRef(null);
  const tickRef = useRef(0);

  if (!gradientRef.current) {
    gradientRef.current = buildGradientLut();
  }

  const initSeeds = useCallback(() => {
    const fallbackSeeds = [
      { x: 0.34, y: 0.38, amp: 0.65, sigma: 0.09, vx: 0.003, vy: -0.002 },
      { x: 0.56, y: 0.49, amp: 0.8, sigma: 0.11, vx: -0.002, vy: 0.0015 },
      { x: 0.71, y: 0.6, amp: 0.5, sigma: 0.08, vx: -0.0016, vy: -0.0012 },
      { x: 0.45, y: 0.69, amp: 0.43, sigma: 0.1, vx: 0.0015, vy: -0.001 },
    ];

    if (cityHotspots.length) {
      seedRef.current = cityHotspots.map((hotspot, index) => ({
        x: hotspot.x,
        y: hotspot.y,
        amp: hotspot.amp,
        sigma: hotspot.sigma,
        vx: hotspot.vx ?? ((index % 2 === 0 ? 1 : -1) * 0.0012),
        vy: hotspot.vy ?? ((index % 3 === 0 ? 1 : -1) * 0.0008),
      }));
      return;
    }

    seedRef.current = fallbackSeeds;
  }, [cityHotspots]);

  const evolveSeeds = useCallback((boost) => {
    if (!seedRef.current) initSeeds();
    const windX = 0.001 + boost * 0.0015;
    const windY = -0.0006 + boost * 0.0008;

    seedRef.current.forEach((seed) => {
      seed.x += seed.vx + windX;
      seed.y += seed.vy + windY;
      if (seed.x < 0.12 || seed.x > 0.88) seed.vx *= -1;
      if (seed.y < 0.14 || seed.y > 0.86) seed.vy *= -1;
      seed.x = clamp(seed.x, 0.08, 0.92);
      seed.y = clamp(seed.y, 0.08, 0.92);
      seed.amp = clamp(seed.amp * 0.985 + boost * 0.08, 0.25, 1.2);
    });
  }, [initSeeds]);

  const renderField = useCallback(() => {
    const bounds = map.getBounds().pad(0.14);
    const width = 340;
    const height = 340;
    const field = new Float32Array(width * height);

    const boost = clamp(liveIntensity, 0.08, 1);
    evolveSeeds(boost);
    tickRef.current += 1;
    const t = tickRef.current;

    const seeds = seedRef.current || [];

    for (let y = 0; y < height; y++) {
      const ny = y / (height - 1);
      for (let x = 0; x < width; x++) {
        const nx = x / (width - 1);
        let value = 0;

        for (let i = 0; i < seeds.length; i++) {
          const s = seeds[i];
          const dx = nx - s.x;
          const dy = ny - s.y;
          const r2 = dx * dx + dy * dy;
          value += s.amp * Math.exp(-r2 / (2 * s.sigma * s.sigma));
        }

        // Stable central plume + gentle moving wave for weather-like continuity.
        const cdx = nx - 0.5;
        const cdy = ny - 0.5;
        value += (0.32 + boost * 0.65) * Math.exp(-(cdx * cdx + cdy * cdy) / 0.055);
        value += Math.sin((nx * 7.8) + (t * 0.06)) * 0.03;
        value += Math.cos((ny * 6.4) - (t * 0.05)) * 0.02;

        field[y * width + x] = Math.max(0, value);
      }
    }

    const normalizer = percentile(Array.from(field), 0.93);
    const temporalAlpha = 0.28;
    if (!fieldRef.current || fieldRef.current.length !== field.length) {
      fieldRef.current = field;
    } else {
      for (let i = 0; i < field.length; i++) {
        fieldRef.current[i] = (fieldRef.current[i] * (1 - temporalAlpha)) + (field[i] * temporalAlpha);
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    const rgba = imageData.data;
    const lut = gradientRef.current;

    for (let i = 0; i < fieldRef.current.length; i++) {
      const intensity = clamp(Math.pow(fieldRef.current[i] / normalizer, 0.82), 0, 1);
      const gIndex = Math.floor(intensity * 255) * 4;
      const px = i * 4;

      rgba[px] = lut[gIndex];
      rgba[px + 1] = lut[gIndex + 1];
      rgba[px + 2] = lut[gIndex + 2];
      rgba[px + 3] = Math.round(lut[gIndex + 3] * intensity);
    }

    ctx.putImageData(imageData, 0, 0);
    const imageUrl = canvas.toDataURL('image/png');

    if (!overlayRef.current) {
      overlayRef.current = L.imageOverlay(imageUrl, bounds, {
        opacity: 0.84,
        interactive: false,
      }).addTo(map);
    } else {
      overlayRef.current.setBounds(bounds);
      overlayRef.current.setUrl(imageUrl);
    }
  }, [liveIntensity, map, evolveSeeds]);

  useEffect(() => {
    if (!seedRef.current) initSeeds();
    renderField();

    const onMoveOrZoom = () => renderField();
    map.on('moveend', onMoveOrZoom);
    map.on('zoomend', onMoveOrZoom);

    const interval = window.setInterval(() => renderField(), 1100);

    return () => {
      window.clearInterval(interval);
      map.off('moveend', onMoveOrZoom);
      map.off('zoomend', onMoveOrZoom);
      if (overlayRef.current) {
        map.removeLayer(overlayRef.current);
      }
    };
  }, [map, initSeeds, renderField]);

  useEffect(() => {
    renderField();
  }, [liveIntensity, renderField]);

  useEffect(() => {
    initSeeds();
    renderField();
  }, [cityHotspots, initSeeds, renderField]);

  return null;
};

const GeoHeatmapMap = ({ trafficData, cityHotspots = [], cityNodeCount = 0 }) => {
  const location = DELHI_CENTER;
  const sourceData = trafficData || null;
  const liveIntensity = useMemo(() => {
    if (!sourceData) return 0.35;

    const density = Number(sourceData.trafficDensity ?? 0);
    const co2ppm = Number(sourceData.co2ppm ?? sourceData.co2 ?? 0);
    const aqi = Number(sourceData.aqi ?? 0);
    const speed = Number(sourceData.averageSpeedKph ?? 0);

    return clamp(
      (density / 100) * 0.45 + (co2ppm / 2500) * 0.35 + (aqi / 500) * 0.2 + (speed < 20 ? 0.12 : 0),
      0.08,
      1
    );
  }, [sourceData]);

  return (
    <div className="glass-panel p-2 md:p-3 h-full flex flex-col">
      <div className="relative flex-1 min-h-[420px] rounded-xl overflow-hidden border border-slate-200 shadow-inner">
        <MapContainer center={[location.lat, location.lng]} zoom={12} scrollWheelZoom className="h-full w-full z-0">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          />
          <WeatherHeatOverlay liveIntensity={liveIntensity} cityHotspots={cityHotspots} />
          <CircleMarker
            center={[location.lat, location.lng]}
            radius={4}
            pathOptions={{ color: '#0f172a', fillColor: '#ffffff', fillOpacity: 1, weight: 1.5 }}
          />
        </MapContainer>

        <div className="absolute left-3 bottom-3 z-[500] rounded-full bg-white/85 backdrop-blur border border-slate-200 px-3 py-2 shadow">
          <div className="w-28 h-2.5 rounded-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-600" />
        </div>
        <div className="absolute right-3 top-3 z-[500] rounded-full bg-white/90 backdrop-blur border border-slate-200 px-3 py-1.5 shadow">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-700">City Nodes: {cityNodeCount}</p>
        </div>
      </div>
    </div>
  );
};

export default GeoHeatmapMap;
