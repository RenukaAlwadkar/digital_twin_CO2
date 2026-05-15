import React, { useMemo } from 'react';
import { Activity, Factory, ThermometerSun, Droplets, Wind, Gauge } from 'lucide-react';
import CarbonConcentrationMap from '../components/CarbonConcentrationMap';
import { getCityKpiSummary } from '../utils/delhiNodes';

const StatCard = ({ label, value, icon: Icon, meta, color = 'slate' }) => {
  const colorMap = {
    slate: 'text-slate-700',
    rose: 'text-rose-600',
    amber: 'text-amber-600',
    sky: 'text-sky-600',
    emerald: 'text-emerald-600',
    violet: 'text-violet-600',
  };
  return (
    <div className="glass-panel p-4 flex flex-col gap-1">
      <p className="text-[11px] uppercase tracking-[0.2em] font-black text-slate-500">{label}</p>
      <div className={`flex items-center gap-2 ${colorMap[color]}`}>
        <Icon size={17} />
        <p className="text-2xl font-black">{value}</p>
      </div>
      {meta ? <p className="text-xs text-slate-400">{meta}</p> : null}
    </div>
  );
};

const CityVisualizationPage = ({ nodes, selectedNode, onSelectNode, weather }) => {
  const kpi = useMemo(() => getCityKpiSummary(nodes), [nodes]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-6 pb-6">
      {/* KPI Row */}
      <section className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Avg AQI"        value={kpi.avgAqi.toFixed(0)}             icon={Activity}      meta="All nodes"   color="rose" />
        <StatCard label="Temperature"    value={`${kpi.avgTemp.toFixed(1)} °C`}     icon={ThermometerSun} meta="Air nodes"   color="amber" />
        <StatCard label="Humidity"       value={`${kpi.avgHumidity.toFixed(1)}%`}   icon={Droplets}      meta="Air nodes"   color="sky" />
        <StatCard label="Avg CO₂"        value={`${kpi.avgCo2.toFixed(0)} ppm`}     icon={Wind}          meta="All nodes"   color="violet" />
        <StatCard label="CO₂ Emission"   value={`${kpi.dayEmissionKg.toFixed(1)} kg`} icon={Factory}     meta="Est. per day" color="slate" />
        <StatCard label="Live Nodes"     value={nodes.filter(n => n.sourceState === 'live').length} icon={Gauge} meta={`of ${nodes.length} total`} color="emerald" />
      </section>

      {/* Map */}
      <section className="flex-1 min-h-[520px]">
        <CarbonConcentrationMap
          nodes={nodes}
          selectedNode={selectedNode}
          onSelectNode={onSelectNode}
        />
      </section>

      {/* Live API Stats */}
      {weather && (
        <section className="glass-panel p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-3">☁️ Live OpenWeather API — New Delhi</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'Temperature', value: `${weather.temperature?.toFixed(1)} °C` },
              { label: 'Humidity',    value: `${weather.humidity}%` },
              { label: 'Wind Speed',  value: `${weather.wind_speed?.toFixed(1)} m/s` },
              { label: 'AQI (1–5)',   value: weather.aqi },
              { label: 'PM2.5',       value: `${weather.pm2_5?.toFixed(1)} µg/m³` },
              { label: 'NO₂',        value: `${weather.no2?.toFixed(1)} µg/m³` },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">{item.label}</p>
                <p className="text-lg font-black text-slate-900 mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default CityVisualizationPage;
