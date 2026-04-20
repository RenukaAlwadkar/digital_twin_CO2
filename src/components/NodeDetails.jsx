import React from 'react';
import { Clock3, Globe2, Signal, MapPin, Activity } from 'lucide-react';
import { getNodeMetricDetails, formatNodeType } from '../utils/delhiNodes';

const NodeDetails = ({ node, liveStatus }) => {
  const metrics = getNodeMetricDetails(node);

  if (!node) {
    return (
      <div className="glass-panel p-5 h-full flex items-center justify-center text-center text-slate-500">
        Select a node to inspect live readings.
      </div>
    );
  }

  return (
    <div className="glass-panel p-5 h-full flex flex-col gap-4 overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-[0.24em] font-black">
            <Activity size={14} />
            Live telemetry
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-1">{node.name}</h2>
          <p className="text-sm text-slate-500 mt-1">{formatNodeType(node.type)} · {node.location} · {node.zone}</p>
        </div>

        <div className={`rounded-2xl px-4 py-3 text-right border ${liveStatus === 'live' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
          <p className="text-[11px] uppercase tracking-[0.22em] font-black text-slate-500">Connection</p>
          <p className={`text-sm font-black mt-1 ${liveStatus === 'live' ? 'text-emerald-700' : 'text-slate-700'}`}>{liveStatus === 'live' ? 'Streaming' : 'Stable'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] font-black text-slate-400">Coordinates</p>
          <p className="mt-2 font-bold text-slate-900">{Number(node.lat).toFixed(4)}, {Number(node.lng).toFixed(4)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] font-black text-slate-400">Update</p>
          <p className="mt-2 font-bold text-slate-900">{new Date(node.updatedAt).toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((item) => (
          <div key={item.label} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.2em] font-black text-slate-400">{item.label}</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-slate-950 text-white p-4 border border-slate-900 shadow-xl shadow-slate-300/20">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="flex items-center gap-2 text-slate-300 text-xs uppercase tracking-[0.2em] font-black"><MapPin size={13} /> Location</p>
            <p className="mt-2 font-bold">{node.location}</p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-slate-300 text-xs uppercase tracking-[0.2em] font-black"><Globe2 size={13} /> Zone</p>
            <p className="mt-2 font-bold">{node.zone}</p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-slate-300 text-xs uppercase tracking-[0.2em] font-black"><Signal size={13} /> Signal</p>
            <p className="mt-2 font-bold">{Math.round((node.signalStrength ?? 0) * 100)}%</p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-slate-300 text-xs uppercase tracking-[0.2em] font-black"><Clock3 size={13} /> Last update</p>
            <p className="mt-2 font-bold">{new Date(node.updatedAt).toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeDetails;
