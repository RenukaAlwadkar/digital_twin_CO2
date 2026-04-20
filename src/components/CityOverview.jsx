import React, { useMemo } from 'react';
import { MapPinned, Activity, Layers3 } from 'lucide-react';
import { buildCityHeatmap, metricOptions } from '../utils/delhiNodes';

const metricScale = {
  aqi: { min: 25, max: 250 },
  pm25: { min: 10, max: 160 },
  co2ppm: { min: 500, max: 2000 },
  trafficDensity: { min: 10, max: 100 },
};

const colorForValue = (value, metricKey) => {
  const scale = metricScale[metricKey] || metricScale.aqi;
  const normalized = Math.max(0, Math.min(1, (value - scale.min) / (scale.max - scale.min)));
  const hue = 120 - (normalized * 120);
  const alpha = 0.22 + (normalized * 0.62);
  return `hsla(${hue}, 92%, 56%, ${alpha})`;
};

const CityOverview = ({ nodes, metricKey, selectedNode, onSelectNode }) => {
  const heatmap = useMemo(() => buildCityHeatmap(nodes, metricKey, 12, 8), [nodes, metricKey]);
  const maxCellValue = heatmap.reduce((max, cell) => Math.max(max, cell.value), 1);

  return (
    <div className="glass-panel p-5 h-full flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-[0.2em] font-black">
            <MapPinned size={14} />
            City map
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-1">Overview</h2>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-slate-900 text-white px-3 py-2 shadow-lg shadow-slate-300/30">
          <Layers3 size={15} />
          <span className="text-xs font-bold uppercase tracking-wider">{metricOptions.find((option) => option.value === metricKey)?.label ?? metricKey}</span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[440px] rounded-[1.75rem] overflow-hidden border border-slate-200 bg-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_32%),linear-gradient(160deg,_rgba(15,23,42,0.96),_rgba(15,23,42,0.82))]" />
        <div className="absolute inset-0 opacity-30 bg-[linear-gradient(rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.16)_1px,transparent_1px)] bg-[size:56px_56px]" />

        <div className="absolute inset-4 rounded-[1.5rem] border border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.18),_transparent_48%)]" />

          {heatmap.map((cell) => (
            <div
              key={cell.key}
              className="absolute rounded-2xl transition-all duration-500"
              style={{
                left: `${(cell.col / 12) * 100}%`,
                top: `${(cell.row / 8) * 100}%`,
                width: `${100 / 12}%`,
                height: `${100 / 8}%`,
                background: colorForValue((cell.value / maxCellValue) * 220, metricKey),
                boxShadow: 'inset 0 0 24px rgba(255,255,255,0.08)',
              }}
            />
          ))}

          {nodes.map((node) => {
            const left = ((Number(node.lng) - 76.95) / (77.39 - 76.95)) * 100;
            const top = (1 - ((Number(node.lat) - 28.4) / (28.79 - 28.4))) * 100;
            const selected = node.id === selectedNode?.id;
            const tone = node.type === 'traffic_monitoring' ? 'bg-orange-400' : 'bg-emerald-400';

            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectNode(node.id)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all ${selected ? 'scale-150' : 'scale-100'}`}
                style={{ left: `${Math.max(2, Math.min(98, left))}%`, top: `${Math.max(2, Math.min(98, top))}%` }}
                aria-label={`Select ${node.name}`}
              >
                <span className={`absolute inset-0 rounded-full blur-md ${tone} opacity-50`} />
                <span className={`relative block h-2.5 w-2.5 rounded-full border border-white/80 ${tone} ${selected ? 'ring-4 ring-white/20' : ''}`} />
              </button>
            );
          })}
        </div>

        <div className="absolute left-4 top-4 z-10 rounded-2xl bg-white/92 backdrop-blur border border-white/70 px-4 py-3 shadow-xl shadow-slate-900/10">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] font-black text-slate-500">
            <Activity size={14} />
            {heatmap.length} active cells
          </div>
        </div>

        <div className="absolute right-4 top-4 z-10 rounded-2xl bg-slate-950/80 backdrop-blur border border-white/10 px-4 py-3 text-white shadow-xl">
          <p className="text-sm font-bold">{selectedNode?.name ?? 'Select a node'}</p>
        </div>

        <div className="absolute left-4 bottom-4 z-10 rounded-2xl bg-white/92 backdrop-blur border border-white/60 px-4 py-3 shadow-xl shadow-slate-900/10 flex items-center gap-4 text-xs font-semibold text-slate-700">
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-400" />Low</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-400" />Moderate</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-500" />High</span>
        </div>
      </div>
    </div>
  );
};

export default CityOverview;
