import React from 'react';
import { Search, Filter, LocateFixed, RadioTower, Sparkles } from 'lucide-react';
import { nodeTypeOptions, formatNodeType, getNodeMetricPreview } from '../utils/delhiNodes';

const NodeDirectory = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  search,
  setSearch,
  filterType,
  setFilterType,
}) => {
  const visibleNodes = nodes.filter((node) => {
    const matchesSearch = !search || [node.name, node.location, node.zone, node.id].join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || node.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="glass-panel p-5 h-full flex flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-[0.24em] font-black">
            <RadioTower size={14} />
            Active nodes
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-1">Node registry</h2>
          <p className="text-sm text-slate-500 mt-1">178 nodes, with live feeds reflected automatically when connected.</p>
        </div>
        <div className="rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-lg shadow-slate-300/20 text-right">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300 font-black">Visible</p>
          <p className="text-2xl font-black">{visibleNodes.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by node, location, or zone"
            className="w-full outline-none text-sm text-slate-800 placeholder:text-slate-400 bg-transparent"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {nodeTypeOptions.map((option) => {
            const active = filterType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilterType(option.value)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all border ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
              >
                <Filter size={13} />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {visibleNodes.map((node) => {
          const selected = node.id === selectedNodeId;
          const isLive = node.sourceState === 'live';

          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelectNode(node.id)}
              className={`w-full text-left rounded-2xl border p-4 transition-all ${selected ? 'bg-slate-950 text-white border-slate-950 shadow-lg shadow-slate-300/20' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${isLive ? 'bg-pink-500/15 text-pink-700' : node.type === 'traffic_monitoring' ? 'bg-orange-500/15 text-orange-700' : 'bg-emerald-500/15 text-emerald-700'} ${selected ? 'text-white/90 bg-white/10' : ''}`}>
                      <LocateFixed size={11} />
                      {formatNodeType(node.type)}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${isLive ? 'bg-pink-500/20 text-pink-700 border border-pink-300' : 'bg-slate-100 text-slate-500'} ${selected ? 'text-white/90 bg-white/10' : ''}`}>
                      <Sparkles size={11} />
                      {isLive ? 'Live' : 'Ready'}
                    </span>
                  </div>
                  <h3 className={`mt-3 text-base font-black truncate ${selected ? 'text-white' : 'text-slate-900'}`}>{node.name}</h3>
                  <p className={`mt-1 text-sm ${selected ? 'text-slate-300' : 'text-slate-500'}`}>{node.location} · {node.zone}</p>
                </div>
                <div className={`text-right shrink-0 ${selected ? 'text-white' : 'text-slate-700'}`}>
                  <p className="text-[11px] uppercase tracking-[0.18em] font-black text-slate-400">Value</p>
                  <p className="text-sm font-black mt-1">{getNodeMetricPreview(node)}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NodeDirectory;
