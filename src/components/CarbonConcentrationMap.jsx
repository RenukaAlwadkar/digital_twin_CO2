import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';

const DELHI_CENTER = [28.6139, 77.2090];

const HeatLayer = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    const heatLayer = L.heatLayer(points, {
      radius: 26,
      blur: 24,
      maxZoom: 15,
      minOpacity: 0.22,
      gradient: {
        0.2: '#22c55e',
        0.45: '#84cc16',
        0.62: '#facc15',
        0.78: '#f97316',
        1.0: '#dc2626',
      },
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
};

const CarbonConcentrationMap = ({ nodes, selectedNode, onSelectNode }) => {
  const points = useMemo(() => {
    if (!nodes.length) return [];

    return nodes.map((node) => {
      const intensity = Math.max(0.05, Math.min(1, (Number(node.co2ppm ?? 420) - 420) / 1600));
      return [Number(node.lat), Number(node.lng), intensity];
    });
  }, [nodes]);

  return (
    <div className="glass-panel p-3 h-full flex flex-col gap-3 overflow-hidden">
      <div>
        <h3 className="text-xl font-black text-slate-900">Carbon concentration layer</h3>
      </div>

      <div className="relative flex-1 min-h-[420px] overflow-hidden rounded-3xl border border-slate-200">
        <MapContainer center={DELHI_CENTER} zoom={11} scrollWheelZoom className="h-full w-full z-0">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          />

          <HeatLayer points={points} />

          {nodes.map((node) => {
            const selected = selectedNode?.id === node.id;
            return (
              <CircleMarker
                key={node.id}
                center={[Number(node.lat), Number(node.lng)]}
                radius={selected ? 6 : 4}
                pathOptions={{
                  color: selected ? '#0f172a' : '#ffffff',
                  fillColor: node.type === 'traffic_monitoring' ? '#f97316' : '#10b981',
                  fillOpacity: 0.95,
                  weight: selected ? 2 : 1,
                }}
                eventHandlers={{
                  click: () => onSelectNode(node.id),
                }}
              />
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default CarbonConcentrationMap;
