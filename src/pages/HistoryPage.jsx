import React, { useEffect, useState } from 'react';
import { History, Database, RefreshCw, Thermometer, Wind, Gauge, FlaskConical } from 'lucide-react';
import { subscribeTelemetry, subscribeSimulations } from '../services/firestoreService';

// Format a Firestore Timestamp or JS Date to readable string
const formatTime = (ts) => {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString('en-IN', {
    month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });
};

// AQI color badge
const aqiColor = (aqi) => {
  if (!aqi) return 'bg-slate-100 text-slate-500';
  if (aqi <= 1) return 'bg-emerald-100 text-emerald-700';
  if (aqi <= 2) return 'bg-yellow-100 text-yellow-700';
  if (aqi <= 3) return 'bg-orange-100 text-orange-700';
  if (aqi <= 4) return 'bg-red-100 text-red-700';
  return 'bg-rose-200 text-rose-800';
};
const aqiLabel = (aqi) => ['—', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'][aqi] ?? '—';

const HistoryPage = () => {
  const [telemetry, setTelemetry]     = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [activeView, setActiveView]   = useState('telemetry');
  const [loading, setLoading]         = useState(true);

  // Real-time listeners
  useEffect(() => {
    setLoading(true);
    const unsubTelemetry = subscribeTelemetry((records) => {
      setTelemetry(records);
      setLoading(false);
    }, 200);
    const unsubSims = subscribeSimulations(setSimulations, 20);
    return () => {
      unsubTelemetry();
      unsubSims();
    };
  }, []);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History size={20} className="text-violet-600" />
          <div>
            <h2 className="text-2xl font-black text-slate-900">History</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time data from Firebase Firestore · updates live</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live · Firestore
        </span>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'telemetry',   label: 'City Telemetry',      icon: Database,     count: telemetry.length },
          { id: 'simulations', label: 'What-If Simulations', icon: FlaskConical, count: simulations.length },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all
                ${active ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}
            >
              <Icon size={14} />
              {tab.label}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black
                ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
          <RefreshCw size={18} className="animate-spin" />
          <span className="font-medium">Connecting to Firestore...</span>
        </div>
      )}

      {/* TELEMETRY TABLE */}
      {!loading && activeView === 'telemetry' && (
        <div className="glass-panel">
          {telemetry.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-medium">
              No telemetry yet. Data will appear here once cities start saving.
            </div>
          ) : (
            <div className="overflow-auto max-h-[600px] custom-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    {['Time', 'City', 'Temp °C', 'Humidity %', 'Wind m/s', 'AQI', 'PM2.5', 'CO₂ ppm', 'Weather'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {telemetry.map((row, i) => (
                    <tr key={row.id ?? i} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">{formatTime(row.timestamp)}</td>
                      <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{row.cityName}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1">
                          <Thermometer size={12} className="text-orange-400" />
                          {row.temperature?.toFixed(1) ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.humidity?.toFixed(0) ?? '—'}%</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1">
                          <Wind size={12} className="text-sky-400" />
                          {row.wind_speed?.toFixed(1) ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${aqiColor(row.aqi)}`}>
                          {aqiLabel(row.aqi)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.pm2_5?.toFixed(1) ?? '—'}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{row.co2ppm?.toFixed(0) ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs capitalize">{row.weatherDesc || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SIMULATIONS TABLE */}
      {!loading && activeView === 'simulations' && (
        <div className="glass-panel">
          {simulations.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-medium">
              No simulations yet. Run a What-If scenario to see results here.
            </div>
          ) : (
            <div className="overflow-auto max-h-[600px] custom-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    {['Time', 'Traffic', 'Green Cover', 'Wind Δ', 'Industrial', 'Base CO₂', 'New CO₂', 'Change %', 'Impact'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {simulations.map((row, i) => (
                    <tr key={row.id ?? i} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">{formatTime(row.timestamp)}</td>
                      <td className="px-4 py-3 font-bold capitalize text-slate-700">{row.traffic_level}</td>
                      <td className="px-4 py-3 text-emerald-700 font-bold">+{row.green_cover_increase ?? 0}%</td>
                      <td className="px-4 py-3 text-sky-700 font-bold">
                        {(row.wind_speed_change ?? 0) > 0 ? '+' : ''}{row.wind_speed_change ?? 0} m/s
                      </td>
                      <td className="px-4 py-3 text-rose-700 font-bold">+{row.industrial_emissions ?? 0} ppm</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{row.base_co2?.toFixed(1)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{row.new_co2?.toFixed(1)}</td>
                      <td className={`px-4 py-3 font-black ${(row.change_percent ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {(row.change_percent ?? 0) > 0 ? '+' : ''}{row.change_percent?.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase
                          ${row.impact === 'increase' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {row.impact}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
