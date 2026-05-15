import React, { useMemo, useState } from 'react';
import { Search, ListChecks, MapPin, ChevronDown } from 'lucide-react';
import NodeDetails from '../components/NodeDetails';
import { formatNodeType } from '../utils/delhiNodes';
import CITIES from '../data/cities';

/* ──────────────── helpers ──────────────── */
const aqiBadge = (aqiRaw) => {
  if (aqiRaw == null) return { label: '—',        bg: 'bg-slate-100 text-slate-500' };
  if (aqiRaw <= 1)   return { label: 'Good',      bg: 'bg-emerald-100 text-emerald-800' };
  if (aqiRaw <= 2)   return { label: 'Fair',      bg: 'bg-lime-100 text-lime-800' };
  if (aqiRaw <= 3)   return { label: 'Moderate',  bg: 'bg-yellow-100 text-yellow-800' };
  if (aqiRaw <= 4)   return { label: 'Poor',      bg: 'bg-orange-100 text-orange-800' };
  return               { label: 'Very Poor',  bg: 'bg-red-100 text-red-800' };
};

const sourceBadge = (node) => {
  if (node.sourceState === 'live' && node.source !== 'api') return { label: 'IoT Live',    bg: 'bg-emerald-100 text-emerald-800' };
  if (node.source === 'api')                                 return { label: 'API Live',    bg: 'bg-sky-100 text-sky-800' };
  return                                                       { label: 'Virtual',       bg: 'bg-slate-100 text-slate-500' };
};

/* ──────────────── city dropdown ──────────────── */
const cityOptions = [
  { value: 'all', label: 'All Cities' },
  ...CITIES.map(c => ({ value: c.id, label: c.name })),
];

/* ──────────────── component ──────────────── */
const NodeDetailsPage = ({ nodes, selectedNodeId, onSelectNode, weather }) => {
  const [query,      setQuery]      = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  const selectedNode = useMemo(
    () => nodes.find(n => n.id === selectedNodeId) ?? nodes[0] ?? null,
    [nodes, selectedNodeId]
  );

  const filteredNodes = useMemo(() =>
    nodes.filter(node => {
      const matchesQuery = !query ||
        [node.id, node.name, node.location, node.zone, node.state]
          .join(' ').toLowerCase().includes(query.toLowerCase());
      const matchesType = typeFilter === 'all' || node.type === typeFilter;
      const matchesCity = cityFilter === 'all' ||
        node.id === `city-${cityFilter}` ||
        node.location?.toLowerCase().includes(cityFilter.toLowerCase());
      return matchesQuery && matchesType && matchesCity;
    }),
    [nodes, query, typeFilter, cityFilter]
  );

  return (
    <div className="flex-1 min-h-0 overflow-hidden grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">

      {/* ── Left: Node List ── */}
      <div className="glass-panel p-5 min-h-0 flex flex-col overflow-hidden">

        {/* Title */}
        <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-[0.2em] font-black mb-1">
          <ListChecks size={14} />
          Node list
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-4">
          Nodes
          <span className="ml-3 text-sm font-semibold text-slate-400">({filteredNodes.length} shown)</span>
        </h2>

        {/* Filters row */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Search */}
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 flex-1 min-w-[200px]">
            <Search size={15} className="text-slate-400 shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="bg-transparent outline-none text-sm w-full"
              placeholder="Search node, city, state…"
            />
          </label>

          {/* City dropdown */}
          <div className="relative">
            <select
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-sm font-semibold text-slate-700 cursor-pointer outline-none focus:border-slate-400"
            >
              {cityOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Type pills */}
          {[
            { value: 'all',                label: 'All' },
            { value: 'air_quality',        label: 'Air' },
            { value: 'traffic_monitoring', label: 'Traffic' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] transition-all
                ${typeFilter === opt.value ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-[0.12em]">
              <tr>
                <th className="text-left px-4 py-3 font-black">Node</th>
                <th className="text-left px-4 py-3 font-black">City / State</th>
                <th className="text-left px-4 py-3 font-black">AQI</th>
                <th className="text-left px-4 py-3 font-black">CO₂</th>
                <th className="text-left px-4 py-3 font-black">Temp</th>
                <th className="text-left px-4 py-3 font-black">PM2.5</th>
                <th className="text-left px-4 py-3 font-black">Source</th>
              </tr>
            </thead>
            <tbody>
              {filteredNodes.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                    No nodes match your filters.
                  </td>
                </tr>
              )}
              {filteredNodes.map(node => {
                const selected  = node.id === selectedNode?.id;
                const aqi       = aqiBadge(node.aqiRaw ?? (node.aqi > 5 ? null : node.aqi));
                const src       = sourceBadge(node);
                return (
                  <tr
                    key={node.id}
                    onClick={() => onSelectNode(node.id)}
                    className={`cursor-pointer border-b border-slate-100 transition-colors
                      ${selected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold leading-tight">{node.name}</p>
                      <p className={`text-[11px] mt-0.5 ${selected ? 'text-slate-400' : 'text-slate-400'}`}>
                        {formatNodeType(node.type)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{node.location}</p>
                      {node.state && node.state !== node.location && (
                        <p className={`text-[11px] mt-0.5 ${selected ? 'text-slate-400' : 'text-slate-400'}`}>{node.state}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[11px] font-black rounded-full px-2 py-0.5 ${selected ? 'bg-white/20 text-white' : aqi.bg}`}>
                        {aqi.label}
                      </span>
                      {node.aqiRaw && (
                        <p className={`text-[11px] mt-0.5 ${selected ? 'text-slate-400' : 'text-slate-400'}`}>{node.aqiRaw}/5</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {node.co2ppm ? `${Number(node.co2ppm).toFixed(0)} ppm` : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {node.temperatureC != null ? `${Number(node.temperatureC).toFixed(1)} °C` : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {node.pm25 != null ? `${Number(node.pm25).toFixed(1)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[11px] font-black rounded-full px-2 py-0.5 ${selected ? 'bg-white/20 text-white' : src.bg}`}>
                        {src.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Right: Node Detail Panel ── */}
      <div className="min-h-0 overflow-hidden">
        <NodeDetails
          node={selectedNode}
          liveStatus={selectedNode?.sourceState}
          weather={weather}
        />
      </div>
    </div>
  );
};

export default NodeDetailsPage;
