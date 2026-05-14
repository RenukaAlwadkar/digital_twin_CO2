import React, { useState } from 'react';
import { Settings2, Activity } from 'lucide-react';

const API_URL = 'http://localhost:8000';

const ScenarioControls = ({ baseData }) => {
  const [params, setParams] = useState({
    trafficLevel: 'medium',
    industrialEmissions: 0,
    greenCover: 0,
    windSpeedChange: 0
  });
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    if (!baseData) return;
    setLoading(true);
    try {
      const payload = {
        base_data: {
          temperature: baseData.temperature || 30,
          humidity: baseData.humidity || 50,
          wind_speed: baseData.wind_speed || 5,
          pollution_index: baseData.pollution_index || 100,
          time_of_day: baseData.time_of_day || new Date().getHours(),
          traffic_factor: baseData.traffic_factor || 50
        },
        traffic_level: params.trafficLevel,
        green_cover_increase: params.greenCover,
        wind_speed_change: params.windSpeedChange,
        industrial_emissions: params.industrialEmissions
      };

      const res = await fetch(`${API_URL}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Simulation failed", err);
    }
    setLoading(false);
  };

  return (
    <div className="glass-panel p-6 h-full flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Settings2 className="text-blue-600" />
          <h2 className="text-xl font-black text-slate-800">What-If Scenarios</h2>
        </div>
      </div>
      
      <div className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Traffic Level</label>
          <select 
            value={params.trafficLevel}
            onChange={(e) => setParams(p => ({...p, trafficLevel: e.target.value}))}
            className="w-full border border-slate-200 rounded-lg p-2 text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium (Baseline)</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Industrial Emissions (+{params.industrialEmissions} ppm)
          </label>
          <input 
            type="range" min="0" max="200" 
            value={params.industrialEmissions}
            onChange={(e) => setParams(p => ({...p, industrialEmissions: Number(e.target.value)}))}
            className="w-full accent-rose-600"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Green Cover Increase (+{params.greenCover}%)
          </label>
          <input 
            type="range" min="0" max="100" 
            value={params.greenCover}
            onChange={(e) => setParams(p => ({...p, greenCover: Number(e.target.value)}))}
            className="w-full accent-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Wind Speed Change ({params.windSpeedChange > 0 ? '+' : ''}{params.windSpeedChange} m/s)
          </label>
          <input 
            type="range" min="-10" max="15" 
            value={params.windSpeedChange}
            onChange={(e) => setParams(p => ({...p, windSpeedChange: Number(e.target.value)}))}
            className="w-full accent-sky-500"
          />
        </div>
        
        <button 
          onClick={runSimulation}
          disabled={loading || !baseData}
          className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? 'Running AI...' : 'Run Simulation'}
        </button>

        {result && (
          <div className={`mt-4 p-4 rounded-xl border ${result.impact === 'increase' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Activity size={16} /> 
              Simulation Result
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Base CO2: <span className="font-black">{result.base_co2.toFixed(1)} ppm</span></div>
              <div>Simulated: <span className="font-black">{result.new_co2.toFixed(1)} ppm</span></div>
              <div className="col-span-2">
                Impact: <span className="font-black uppercase">{result.impact}</span> ({result.change_percent > 0 ? '+' : ''}{result.change_percent.toFixed(1)}%)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioControls;
