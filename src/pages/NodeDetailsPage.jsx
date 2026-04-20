import React, { useMemo, useState } from 'react';
import { Search, ListChecks } from 'lucide-react';
import NodeDetails from '../components/NodeDetails';
import { formatNodeType } from '../utils/delhiNodes';

const NodeDetailsPage = ({ nodes, selectedNodeId, onSelectNode }) => {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? nodes[0] ?? null,
    [nodes, selectedNodeId]
  );

  const filteredNodes = useMemo(
    () => nodes.filter((node) => {
      const matchesQuery = !query || [node.id, node.name, node.location, node.zone].join(' ').toLowerCase().includes(query.toLowerCase());
      const matchesType = typeFilter === 'all' || node.type === typeFilter;
      return matchesQuery && matchesType;
    }),
    [nodes, query, typeFilter]
  );

  return (
    <div className="flex-1 min-h-0 overflow-hidden grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
      <div className="glass-panel p-5 min-h-0 flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-[0.2em] font-black">
              <ListChecks size={14} />
              Node list
            </div>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Nodes</h2>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 min-w-[260px]">
            <Search size={16} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="bg-transparent outline-none text-sm w-full"
              placeholder="Search node, location, zone"
            />
          </label>

          <div className="flex items-center gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'air_quality', label: 'Air' },
              { value: 'traffic_monitoring', label: 'Traffic' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTypeFilter(option.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] ${typeFilter === option.value ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-[0.14em]">
              <tr>
                <th className="text-left px-4 py-3">Node</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Location</th>
                <th className="text-left px-4 py-3">AQI</th>
                <th className="text-left px-4 py-3">CO2</th>
                <th className="text-left px-4 py-3">State</th>
              </tr>
            </thead>
            <tbody>
              {filteredNodes.map((node) => {
                const selected = node.id === selectedNode?.id;
                return (
                  <tr
                    key={node.id}
                    onClick={() => onSelectNode(node.id)}
                    className={`cursor-pointer border-b border-slate-100 ${selected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-4 py-3 font-semibold">{node.name}</td>
                    <td className="px-4 py-3">{formatNodeType(node.type)}</td>
                    <td className="px-4 py-3">{node.location}</td>
                    <td className="px-4 py-3">{Number(node.aqi ?? 0).toFixed(0)}</td>
                    <td className="px-4 py-3">{Number(node.co2ppm ?? 0).toFixed(0)} ppm</td>
                    <td className="px-4 py-3">{node.sourceState === 'live' ? 'Live' : node.sourceState === 'ready' ? 'Ready' : 'Virtual'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="min-h-0">
        <NodeDetails node={selectedNode} liveStatus={selectedNode?.sourceState} />
      </div>
    </div>
  );
};

export default NodeDetailsPage;
