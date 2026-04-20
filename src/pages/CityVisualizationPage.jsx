import React, { useMemo, useState } from 'react';
import { Activity, Factory, ThermometerSun, Droplets, Wind } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import CarbonConcentrationMap from '../components/CarbonConcentrationMap';
import { buildCityTemporalSeries, getCityKpiSummary } from '../utils/delhiNodes';

const StatCard = ({ label, value, icon: Icon, meta }) => (
  <div className="glass-panel p-4">
    <p className="text-[11px] uppercase tracking-[0.2em] font-black text-slate-500">{label}</p>
    <div className="mt-2 flex items-center gap-2 text-slate-900">
      <Icon size={17} />
      <p className="text-2xl font-black">{value}</p>
    </div>
    {meta ? <p className="mt-1 text-xs text-slate-500">{meta}</p> : null}
  </div>
);

const periodOptions = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const CityVisualizationPage = ({ nodes, tick, selectedNode, onSelectNode }) => {
  const [period, setPeriod] = useState('day');

  const kpi = useMemo(() => getCityKpiSummary(nodes), [nodes]);
  const trendSeries = useMemo(() => buildCityTemporalSeries(nodes, period, tick), [nodes, period, tick]);

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Average AQI" value={kpi.avgAqi.toFixed(0)} icon={Activity} meta="All city nodes" />
        <StatCard label="Average temperature" value={`${kpi.avgTemp.toFixed(1)} C`} icon={ThermometerSun} meta="Air nodes" />
        <StatCard label="Average humidity" value={`${kpi.avgHumidity.toFixed(1)}%`} icon={Droplets} meta="Air nodes" />
        <StatCard label="Average CO2" value={`${kpi.avgCo2.toFixed(0)} ppm`} icon={Wind} meta="All city nodes" />
        <StatCard label="Carbon emission" value={`${kpi.dayEmissionKg.toFixed(1)} kg/day`} icon={Factory} meta="Estimated" />
      </section>

      <section className="grid min-h-0 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="min-h-[470px]">
          <CarbonConcentrationMap nodes={nodes} selectedNode={selectedNode} onSelectNode={onSelectNode} />
        </div>

        <div className="glass-panel p-5 min-h-[470px] flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-2xl font-black text-slate-900">City trends</h3>
            <div className="flex items-center gap-2">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPeriod(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] ${period === option.value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 grid gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 min-h-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 mb-2">AQI and CO2</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendSeries}>
                    <defs>
                      <linearGradient id="aqiFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area yAxisId="left" type="monotone" dataKey="aqi" stroke="#f97316" fill="url(#aqiFill)" strokeWidth={2} />
                    <Area yAxisId="right" type="monotone" dataKey="co2ppm" stroke="#0ea5e9" fill="transparent" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 min-h-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 mb-2">Temp, humidity and emission</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendSeries}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area yAxisId="left" type="monotone" dataKey="temp" stroke="#ef4444" fill="transparent" strokeWidth={2} />
                    <Area yAxisId="left" type="monotone" dataKey="humidity" stroke="#14b8a6" fill="transparent" strokeWidth={2} />
                    <Area yAxisId="right" type="monotone" dataKey="emissionKg" stroke="#475569" fill="transparent" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CityVisualizationPage;
