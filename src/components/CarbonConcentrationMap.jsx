import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Marker, useMap } from 'react-leaflet';
import CITIES from '../data/cities';

const INDIA_CENTER = [22.5, 78.9629];
const INDIA_ZOOM   = 5;

/* ── Heatmap layer ── */
const HeatLayer = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    const layer = L.heatLayer(points, {
      radius: 38, blur: 30, maxZoom: 10, minOpacity: 0.3,
      gradient: { 0.2: '#22c55e', 0.45: '#84cc16', 0.62: '#facc15', 0.78: '#f97316', 1.0: '#dc2626' },
    });
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map, points]);
  return null;
};

/* ── Auto-fit all nodes when no city is focused ── */
const FitBounds = ({ nodes, skip }) => {
  const map = useMap();
  useEffect(() => {
    if (skip || !nodes.length) return;
    const bounds = nodes.filter(n => n.lat && n.lng).map(n => [Number(n.lat), Number(n.lng)]);
    if (bounds.length > 0) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
  }, [nodes, map, skip]);
  return null;
};

/* ── Zoom + animate to focused city ── */
const FocusCity = ({ focusCityId }) => {
  const map = useMap();
  useEffect(() => {
    if (!focusCityId) return;
    const city = CITIES.find(c => c.id === focusCityId);
    if (city) map.flyTo([city.lat, city.lng], 11, { animate: true, duration: 1.2 });
  }, [focusCityId, map]);
  return null;
};

/* ── Pulsing selected-city marker using a custom DivIcon ── */
const PulsingMarker = ({ node }) => {
  const map = useMap();

  const icon = useMemo(() => L.divIcon({
    className: '',
    iconSize:  [40, 40],
    iconAnchor:[20, 20],
    html: `
      <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
        <span style="
          position:absolute;width:40px;height:40px;border-radius:50%;
          background:rgba(59,130,246,0.25);
          animation:pulse-ring 1.6s cubic-bezier(0.4,0,0.6,1) infinite;
        "></span>
        <span style="
          width:16px;height:16px;border-radius:50%;background:#3b82f6;
          border:3px solid #fff;box-shadow:0 0 0 2px #3b82f6;
          display:block;
        "></span>
      </div>
      <style>
        @keyframes pulse-ring {
          0%   { transform: scale(0.6); opacity: 0.8; }
          70%  { transform: scale(1.4); opacity: 0; }
          100% { opacity: 0; }
        }
      </style>
    `,
  }), []);

  return (
    <Marker
      position={[Number(node.lat), Number(node.lng)]}
      icon={icon}
      zIndexOffset={1000}
    >
      <Tooltip direction="top" offset={[0, -14]} opacity={1} permanent>
        <div style={{ fontSize: '12px', fontFamily: 'sans-serif', fontWeight: 'bold', color: '#1e3a5f', lineHeight: '1.6' }}>
          📍 {node.location}<br />
          <span style={{ fontWeight: 'normal', color: '#475569' }}>
            CO₂: {Number(node.co2ppm ?? 0).toFixed(0)} ppm &nbsp;|&nbsp; AQI: {node.aqiRaw ?? '—'}<br />
            {Number(node.temperatureC ?? 0).toFixed(1)} °C &nbsp;|&nbsp; PM2.5: {Number(node.pm25 ?? 0).toFixed(1)}
          </span>
        </div>
      </Tooltip>
    </Marker>
  );
};

const aqiColor = (aqiRaw) => {
  if (aqiRaw <= 1) return '#22c55e';
  if (aqiRaw <= 2) return '#84cc16';
  if (aqiRaw <= 3) return '#facc15';
  if (aqiRaw <= 4) return '#f97316';
  return '#dc2626';
};

/* ── Main Map Component ── */
const CarbonConcentrationMap = ({ nodes, selectedNode, onSelectNode, focusCityId }) => {
  const points = useMemo(() =>
    nodes.map(n => {
      const intensity = Math.max(0.05, Math.min(1, (Number(n.co2ppm ?? 420) - 420) / 1400));
      return [Number(n.lat), Number(n.lng), intensity];
    }),
  [nodes]);

  // Find the focused city's node
  const focusedNode = useMemo(() => {
    if (!focusCityId) return null;
    return nodes.find(n => n.id === `city-${focusCityId}`);
  }, [focusCityId, nodes]);

  return (
    <div className="glass-panel p-3 h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-900">CO₂ Concentration Map</h3>
        <p className="text-xs text-slate-400 font-medium">
          {nodes.length} live nodes · India
          {focusedNode ? ` · Viewing ${focusedNode.location}` : ''}
        </p>
      </div>

      <div className="relative flex-1 min-h-[420px] overflow-hidden rounded-3xl border border-slate-200">
        <MapContainer center={INDIA_CENTER} zoom={INDIA_ZOOM} scrollWheelZoom className="h-full w-full z-0">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          <HeatLayer points={points} />
          <FitBounds nodes={nodes} skip={!!focusCityId} />
          {focusCityId && <FocusCity focusCityId={focusCityId} />}

          {/* Regular markers for all nodes */}
          {nodes.map((node) => {
            const isFocused = focusedNode?.id === node.id;
            if (isFocused) return null; // rendered separately as PulsingMarker

            const isSelected = selectedNode?.id === node.id;
            const fillColor  = node.type === 'traffic_monitoring'
              ? '#f97316'
              : aqiColor(node.aqiRaw ?? (node.aqi / 100));

            return (
              <CircleMarker
                key={node.id}
                center={[Number(node.lat), Number(node.lng)]}
                radius={isSelected ? 9 : 6}
                pathOptions={{
                  color:       isSelected ? '#0f172a' : '#ffffff',
                  fillColor,
                  fillOpacity: 0.92,
                  weight:      isSelected ? 2.5 : 1.5,
                }}
                eventHandlers={{ click: () => onSelectNode(node.id) }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  <div style={{ fontSize: '11px', lineHeight: '1.5', fontFamily: 'sans-serif' }}>
                    <strong>{node.name}</strong><br />
                    CO₂: {Number(node.co2ppm ?? 0).toFixed(0)} ppm &nbsp;|&nbsp; AQI: {node.aqiRaw ?? '—'}<br />
                    {Number(node.temperatureC ?? 0).toFixed(1)} °C &nbsp;|&nbsp; PM2.5: {Number(node.pm25 ?? 0).toFixed(1)}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

          {/* Pulsing marker for the focused city */}
          {focusedNode && (
            <PulsingMarker
              key={`focused-${focusedNode.id}`}
              node={focusedNode}
            />
          )}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[500] bg-white/90 backdrop-blur rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 flex items-center gap-3 shadow">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Good</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Moderate</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Poor</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> Very Poor</span>
          {focusedNode && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Selected</span>}
        </div>
      </div>
    </div>
  );
};

export default CarbonConcentrationMap;
