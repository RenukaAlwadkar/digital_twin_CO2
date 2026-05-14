import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle, Settings2 } from 'lucide-react';
import ScenarioControls from '../components/ScenarioControls';
import { getCityKpiSummary } from '../utils/delhiNodes';

const WhatIfPage = ({ nodes, weather, agentResult, setScenarioParams }) => {
  const kpi = useMemo(() => getCityKpiSummary(nodes), [nodes]);

  const baseData = useMemo(() => ({
    temperature: weather?.temperature || kpi.avgTemp || 30,
    humidity: weather?.humidity || kpi.avgHumidity || 50,
    wind_speed: weather?.wind_speed || 5,
    pollution_index: weather?.aqi || kpi.avgAqi || 100,
    time_of_day: new Date().getHours(),
    traffic_factor: 50
  }), [weather, kpi]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-6 pb-6">
      <div className="flex items-center gap-3">
        <Settings2 size={20} className="text-blue-600" />
        <div>
          <h2 className="text-2xl font-black text-slate-900">What-If Analysis</h2>
          <p className="text-xs text-slate-500 mt-0.5">Simulate environmental interventions and predict CO₂ impact</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Scenario Controls */}
        <ScenarioControls baseData={baseData} />

        {/* Agent Recommendations */}
        <div className="glass-panel p-6 flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-4">
            <AlertCircle className={agentResult?.status === 'critical' ? 'text-rose-500' : 'text-emerald-500'} />
            <h2 className="text-xl font-black text-slate-800">Agent Recommendations</h2>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            {agentResult ? (
              <div className={`p-5 rounded-2xl border ${agentResult.status === 'critical' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                <div className="flex items-start gap-3">
                  {agentResult.status === 'critical'
                    ? <AlertCircle className="mt-1 flex-shrink-0" size={20} />
                    : <CheckCircle className="mt-1 flex-shrink-0" size={20} />}
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
      </div>

      {/* Live base data reference */}
      <div className="glass-panel p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Live Baseline Data (used for simulation)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: 'Temperature', value: `${baseData.temperature.toFixed(1)} °C` },
            { label: 'Humidity', value: `${baseData.humidity.toFixed(0)}%` },
            { label: 'Wind Speed', value: `${baseData.wind_speed.toFixed(1)} m/s` },
            { label: 'AQI', value: baseData.pollution_index.toFixed(0) },
            { label: 'Time of Day', value: `${baseData.time_of_day}:00` },
            { label: 'Traffic Factor', value: `${baseData.traffic_factor}%` },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">{item.label}</p>
              <p className="text-lg font-black text-slate-900 mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WhatIfPage;
