import React, { useMemo, useState } from 'react';
import { Activity, Factory, ThermometerSun, Droplets, Wind, AlertCircle, CheckCircle } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import CarbonConcentrationMap from '../components/CarbonConcentrationMap';
import ScenarioControls from '../components/ScenarioControls';
import { getCityKpiSummary } from '../utils/delhiNodes';

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

const CityVisualizationPage = ({ nodes, tick, selectedNode, onSelectNode, scenarioParams, setScenarioParams, agentResult, weather }) => {
  const [period, setPeriod] = useState('day');

  const kpi = useMemo(() => getCityKpiSummary(nodes), [nodes]);


  const baseData = useMemo(() => ({
    temperature: weather?.temperature || kpi.avgTemp || 30,
    humidity: weather?.humidity || kpi.avgHumidity || 50,
    wind_speed: weather?.wind_speed || 5,
    pollution_index: kpi.avgAqi || 100,
    time_of_day: new Date().getHours(),
    traffic_factor: 50 // Default average traffic
  }), [weather, kpi]);

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
      </section>

      <section className="grid min-h-[300px] gap-6 xl:grid-cols-2 pb-6">
        <ScenarioControls baseData={baseData} />
        
        <div className="glass-panel p-6 h-full flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-4">
            <AlertCircle className={agentResult?.status === 'critical' ? "text-rose-500" : "text-emerald-500"} />
            <h2 className="text-xl font-black text-slate-800">Agent Recommendations</h2>
          </div>
          
          <div className="flex-1 flex flex-col gap-4">
            {agentResult ? (
              <div className={`p-5 rounded-2xl border ${agentResult.status === 'critical' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                <div className="flex items-start gap-3">
                  {agentResult.status === 'critical' ? <AlertCircle className="mt-1 flex-shrink-0" size={20} /> : <CheckCircle className="mt-1 flex-shrink-0" size={20} />}
                  <div>
                    <h3 className="font-bold text-lg mb-2">
                      {agentResult.status === 'critical' ? 'High Emissions Detected' : 'All Systems Normal'}
                    </h3>
                    <p className="text-sm font-medium leading-relaxed opacity-90">
                      {agentResult.recommendation}
                    </p>
                  </div>
                </div>
                {agentResult.actionParams && (
                  <div className="mt-4 pt-4 border-t border-rose-200/50">
                    <button 
                      onClick={() => setScenarioParams(p => ({ ...p, ...agentResult.actionParams }))}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-xl shadow-md transition-all text-sm"
                    >
                      Apply Suggested Interventions
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium">
                Analyzing nodes...
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default CityVisualizationPage;
