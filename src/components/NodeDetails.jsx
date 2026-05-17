import React, { useEffect, useState } from 'react';
import { Clock3, Globe2, Signal, MapPin, Activity, TrendingUp, Wind } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchCo2Predictions } from '../services/aiPrediction';
import { formatNodeType } from '../utils/delhiNodes';

const MetricBox = ({ label, value, sub }) => (
  <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">{label}</p>
    <p className="mt-1 text-xl font-black text-slate-900">{value ?? '—'}</p>
    {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

const NodeDetails = ({ node, liveStatus, weather }) => {
  const [predictions, setPredictions] = useState(null);

  useEffect(() => {
    if (!node) return;
    fetchCo2Predictions({
      trafficDensity: node.trafficDensity || 50,
      temperature:    node.temperatureC   || weather?.temperature || 30,
      humidity:       node.humidityPct    || 50,
      co2ppm:         node.co2ppm         || 420,
    }).then(res => {
      if (res?.forecast_5m) {
        setPredictions(res.forecast_5m.map((val, idx) => ({ hour: `+${idx + 1}m`, co2: val })));
      }
    });
  }, [node, weather]);

  if (!node) {
    return (
      <div className="glass-panel p-5 h-full flex items-center justify-center text-center text-slate-500">
        Select a node to inspect live readings.
      </div>
    );
  }

  const isCity    = node.source === 'api';
  const isTraffic = node.type === 'traffic_monitoring';

  return (
    <div className="glass-panel p-5 h-full flex flex-col gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-[0.24em] font-black">
            <Activity size={14} />
            Live telemetry
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-1">{node.name}</h2>
          <p className="text-sm text-slate-500 mt-1">{formatNodeType(node.type)} · {node.location} · {node.zone}</p>
          {node.weatherDesc && <p className="text-xs text-slate-400 capitalize mt-0.5">☁️ {node.weatherDesc}</p>}
        </div>
        <div className={`rounded-2xl px-4 py-3 text-right border shrink-0 ${liveStatus === 'live' ? 'bg-emerald-50 border-emerald-200' : 'bg-sky-50 border-sky-200'}`}>
          <p className="text-[11px] uppercase tracking-[0.22em] font-black text-slate-500">Source</p>
          <p className={`text-sm font-black mt-1 ${liveStatus === 'live' ? 'text-emerald-700' : 'text-sky-700'}`}>
            {isCity ? 'OpenWeather API' : liveStatus === 'live' ? 'IoT / MQTT' : 'Stable'}
          </p>
        </div>
      </div>

      {/* Coordinates + Update */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">Coordinates</p>
          <p className="mt-1 font-bold text-slate-900">{Number(node.lat).toFixed(4)}, {Number(node.lng).toFixed(4)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">Updated</p>
          <p className="mt-1 font-bold text-slate-900">{new Date(node.updatedAt).toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricBox label="Temperature" value={node.temperatureC != null ? `${Number(node.temperatureC).toFixed(1)} °C` : null} sub={node.feelsLike ? `Feels ${Number(node.feelsLike).toFixed(1)} °C` : null} />
        <MetricBox label="Humidity"    value={node.humidityPct  != null ? `${Number(node.humidityPct).toFixed(1)}%` : null} />
        <MetricBox label="CO₂ (est.)" value={node.co2ppm       != null ? `${Number(node.co2ppm).toFixed(0)} ppm` : null} />
        <MetricBox label="PM2.5"       value={node.pm25         != null ? `${Number(node.pm25).toFixed(1)} µg/m³` : null} />
      </div>

      {/* Extended air quality — city API nodes only */}
      {isCity && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 mb-2">Air Quality Components</p>
          <div className="grid grid-cols-3 gap-2">
            <MetricBox label="AQI (1–5)" value={node.aqiRaw} />
            <MetricBox label="PM10"      value={node.pm10 != null ? `${Number(node.pm10).toFixed(1)}` : null}  sub="µg/m³" />
            <MetricBox label="NO₂"       value={node.no2  != null ? `${Number(node.no2).toFixed(1)}` : null}   sub="µg/m³" />
            <MetricBox label="SO₂"       value={node.so2  != null ? `${Number(node.so2).toFixed(1)}` : null}   sub="µg/m³" />
            <MetricBox label="O₃"        value={node.o3   != null ? `${Number(node.o3).toFixed(1)}` : null}    sub="µg/m³" />
            <MetricBox label="CO"        value={node.co   != null ? `${Number(node.co).toFixed(0)}` : null}    sub="µg/m³" />
          </div>
        </div>
      )}

      {/* Traffic metrics */}
      {isTraffic && (
        <div className="grid grid-cols-2 gap-3">
          <MetricBox label="Traffic Density" value={node.trafficDensity  != null ? `${Number(node.trafficDensity).toFixed(0)}%` : null} />
          <MetricBox label="Avg Speed"       value={node.averageSpeedKph != null ? `${Number(node.averageSpeedKph).toFixed(1)} km/h` : null} />
          <MetricBox label="Vehicle Count"   value={node.vehicleCount} />
          <MetricBox label="Incident"        value={node.incident ? '🔴 Yes' : '🟢 No'} />
        </div>
      )}

      {/* Bottom info strip */}
      <div className="rounded-2xl bg-slate-950 text-white p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="flex items-center gap-1 text-slate-400 text-xs uppercase tracking-widest font-black"><MapPin size={12} /> Location</p>
            <p className="mt-1 font-bold">{node.location}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-slate-400 text-xs uppercase tracking-widest font-black"><Globe2 size={12} /> State</p>
            <p className="mt-1 font-bold">{node.zone}</p>
          </div>
          {node.wind_speed != null && (
            <div>
              <p className="flex items-center gap-1 text-slate-400 text-xs uppercase tracking-widest font-black"><Wind size={12} /> Wind</p>
              <p className="mt-1 font-bold">{Number(node.wind_speed).toFixed(1)} m/s</p>
            </div>
          )}
          {node.pressure && (
            <div>
              <p className="flex items-center gap-1 text-slate-400 text-xs uppercase tracking-widest font-black"><Signal size={12} /> Pressure</p>
              <p className="mt-1 font-bold">{node.pressure} hPa</p>
            </div>
          )}
        </div>
      </div>

      {/* AI CO2 Forecast */}
      {predictions && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-blue-500" />
            <h3 className="text-sm font-black text-slate-800">5-min Digital Twin Forecast</h3>
          </div>
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={predictions} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="predColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} domain={['dataMin - 30', 'dataMax + 30']} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                <Area type="monotone" dataKey="co2" stroke="#3b82f6" strokeWidth={2} fill="url(#predColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default NodeDetails;
