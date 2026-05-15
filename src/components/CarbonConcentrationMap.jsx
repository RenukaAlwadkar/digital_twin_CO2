import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';

// India-centered view to show all cities
const INDIA_CENTER = [22.5, 78.9629];
const INDIA_ZOOM   = 5;

const HeatLayer = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    const layer = L.heatLayer(points, {
      radius: 38,
      blur: 30,
      maxZoom: 10,
      minOpacity: 0.3,
      gradient: {
        0.0: '#22c55e',
        0.25: '#84cc16',
        0.4: '#facc15',
        0.6: '#f97316',
        0.8: '#ef4444',
        1.0: '#dc2626',
      },
    });
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map, points]);
  return null;
};

// Auto-fit bounds when nodes change
const FitBounds = ({ nodes }) => {
  const map = useMap();
  useEffect(() => {
    if (!nodes.length) return;
    const bounds = nodes
      .filter(n => n.lat && n.lng)
      .map(n => [Number(n.lat), Number(n.lng)]);
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
    }
  }, [nodes, map]);
  return null;
};

const aqiColor = (aqiRaw) => {
  if (aqiRaw <= 1) return '#22c55e';
  if (aqiRaw <= 2) return '#84cc16';
  if (aqiRaw <= 3) return '#facc15';
  if (aqiRaw <= 4) return '#f97316';
  return '#dc2626';
};

const CarbonConcentrationMap = ({ nodes, selectedNode, onSelectNode }) => {
  const points = useMemo(() =>
    nodes.map(n => {
      const intensity = Math.max(0.05, Math.min(1, (Number(n.co2ppm ?? 420) - 420) / 1400));
      return [Number(n.lat), Number(n.lng), intensity];
    }),
  [nodes]);

  return (
    <div className="glass-panel p-3 h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-900">CO₂ Concentration Map</h3>
        <p className="text-xs text-slate-400 font-medium">{nodes.length} live nodes · India</p>
      </div>

      <div className="relative flex-1 min-h-[420px] overflow-hidden rounded-3xl border border-slate-200">
        <MapContainer center={INDIA_CENTER} zoom={INDIA_ZOOM} scrollWheelZoom className="h-full w-full z-0">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          />

          <HeatLayer points={points} />
          <FitBounds nodes={nodes} />

          {nodes.map((node) => {
            const selected  = selectedNode?.id === node.id;
            const fillColor = node.type === 'traffic_monitoring'
              ? '#f97316'
              : aqiColor(node.aqiRaw ?? (node.aqi / 100));

            return (
              <CircleMarker
                key={node.id}
                center={[Number(node.lat), Number(node.lng)]}
                radius={selected ? 10 : 7}
                pathOptions={{
                  color:       selected ? '#0f172a' : '#ffffff',
                  fillColor,
                  fillOpacity: 0.92,
                  weight:      selected ? 2.5 : 1.5,
                }}
                eventHandlers={{ click: () => onSelectNode(node.id) }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95} permanent={false}>
                  <div style={{ fontSize: '11px', lineHeight: '1.5', fontFamily: 'sans-serif' }}>
                    <strong>{node.name}</strong><br />
                    CO₂: {Number(node.co2ppm ?? 0).toFixed(0)} ppm &nbsp;|&nbsp;
                    AQI: {node.aqiRaw ?? '—'}<br />
                    Temp: {Number(node.temperatureC ?? 0).toFixed(1)} °C &nbsp;|&nbsp;
                    PM2.5: {Number(node.pm25 ?? 0).toFixed(1)}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[500] bg-white/90 backdrop-blur rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 flex items-center gap-3 shadow">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Good</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Moderate</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Poor</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> Very Poor</span>
        </div>
      </div>
    </div>
  );
};

export default CarbonConcentrationMap;
