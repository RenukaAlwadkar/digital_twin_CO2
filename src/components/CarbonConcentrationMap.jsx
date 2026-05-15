import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';

const DELHI_CENTER = [28.6139, 77.2090];

const HeatLayer = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    // Create interpolated points for better coverage
    const interpolatedPoints = [...points];
    
    // Add interpolated points between existing nodes for better coverage
    for (let i = 0; i < points.length - 1; i++) {
      for (let j = 1; j <= 3; j++) {
        const lat = points[i][0] + (points[i + 1][0] - points[i][0]) * (j / 4);
        const lng = points[i][1] + (points[i + 1][1] - points[i][1]) * (j / 4);
        const intensity = (points[i][2] + points[i + 1][2]) / 2;
        interpolatedPoints.push([lat, lng, intensity]);
      }
    }

    const heatLayer = L.heatLayer(interpolatedPoints, {
      radius: 50, // Increased radius for better coverage
      blur: 35, // Adjusted blur for smooth appearance
      maxZoom: 20, // Increased max zoom level
      minOpacity: 0.12, // Adjusted minimum opacity
      max: 1.0, // Explicit max value
      gradient: {
        0.0: '#22c55e',
        0.25: '#84cc16',
        0.4: '#facc15',
        0.6: '#f97316',
        0.8: '#ef4444',
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
            const isLive = node.sourceState === 'live';
            
            // Determine fill color based on live status
            let fillColor;
            if (isLive) {
              fillColor = '#ec4899'; // Pink color for live nodes
            } else if (node.type === 'traffic_monitoring') {
              fillColor = '#f97316'; // Orange for traffic
            } else {
              fillColor = '#10b981'; // Green for air quality
            }
            
            return (
              <CircleMarker
                key={node.id}
                center={[Number(node.lat), Number(node.lng)]}
                radius={selected ? 6 : isLive ? 5 : 4}
                pathOptions={{
                  color: selected ? '#0f172a' : isLive ? '#be185d' : '#ffffff',
                  fillColor: fillColor,
                  fillOpacity: isLive ? 1.0 : 0.95,
                  weight: selected ? 2 : isLive ? 1.5 : 1,
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
