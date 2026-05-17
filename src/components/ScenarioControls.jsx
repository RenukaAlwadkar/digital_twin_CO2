import React, { useState } from 'react';
import { Settings2, Activity, AlertCircle } from 'lucide-react';
import { simulateScenario } from '../services/aiPrediction';

const ScenarioControls = ({ baseData, onSimulationResult }) => {
  const [params, setParams] = useState({
    traffic_level: 'medium',
    industrial_emissions: 0,
    green_cover_increase: 0,
    wind_speed_change: 0
  });
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runSimulation = async () => {
    if (!baseData) {
      setError('No base data available');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await simulateScenario(baseData, {
        traffic_level: params.traffic_level,
        green_cover_increase: params.green_cover_increase,
        wind_speed_change: params.wind_speed_change,
        industrial_emissions: params.industrial_emissions
      });
      
      if (data) {
        setResult(data);
        // Notify parent
        if (onSimulationResult) {
          onSimulationResult(data, params);
        }
      } else {
        setError('Simulation failed - backend unavailable');
      }
    } catch (err) {
      setError(`Simulation error: ${err.message}`);
      console.error("Simulation failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 h-full flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Settings2 className="text-blue-600" />
          <h2 className="text-xl font-black text-slate-800">What-If Scenarios</h2>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
          <p className="text-xs text-rose-700 font-medium">{error}</p>
        </div>
      )}
      
      <div className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Traffic Level</label>
          <select 
            value={params.traffic_level}
            onChange={(e) => setParams(p => ({...p, traffic_level: e.target.value}))}
            disabled={loading}
            className="w-full border border-slate-200 rounded-lg p-2 text-sm disabled:opacity-50"
          >
            <option value="low">Low (-30% baseline)</option>
            <option value="medium">Medium (Baseline)</option>
            <option value="high">High (+50% baseline)</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">Adjust urban traffic volume</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Industrial Emissions: <span className="text-rose-600">+{params.industrial_emissions.toFixed(0)} ppm</span>
          </label>
          <input 
            type="range" 
            min="-100" 
            max="200" 
            value={params.industrial_emissions}
            onChange={(e) => setParams(p => ({...p, industrial_emissions: Number(e.target.value)}))}
            disabled={loading}
            className="w-full accent-rose-600 disabled:opacity-50"
          />
          <p className="text-xs text-slate-500 mt-1">Factory and industrial output adjustment</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Green Cover: <span className="text-emerald-600">+{params.green_cover_increase.toFixed(0)}%</span>
          </label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={params.green_cover_increase}
            onChange={(e) => setParams(p => ({...p, green_cover_increase: Number(e.target.value)}))}
            disabled={loading}
            className="w-full accent-emerald-500 disabled:opacity-50"
          />
          <p className="text-xs text-slate-500 mt-1">Tree planting and vegetation increase</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Wind Speed: <span className="text-sky-600">{params.wind_speed_change > 0 ? '+' : ''}{params.wind_speed_change.toFixed(1)} m/s</span>
          </label>
          <input 
            type="range" 
            min="-10" 
            max="15" 
            value={params.wind_speed_change}
            onChange={(e) => setParams(p => ({...p, wind_speed_change: Number(e.target.value)}))}
            disabled={loading}
            step="0.5"
            className="w-full accent-sky-500 disabled:opacity-50"
          />
          <p className="text-xs text-slate-500 mt-1">Wind pattern and speed adjustment</p>
        </div>
        
        <button 
          onClick={runSimulation}
          disabled={loading || !baseData}
          className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Activity size={16} className="animate-spin" />
              Running Simulation...
            </span>
          ) : (
            'Run AI Simulation'
          )}
        </button>

        {result && (
          <div className={`mt-4 p-4 rounded-xl border ${result.impact === 'increase' ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <h3 className={`font-bold mb-3 flex items-center gap-2 ${result.impact === 'increase' ? 'text-rose-900' : 'text-emerald-900'}`}>
              <Activity size={16} /> 
              Simulation Result
            </h3>
            <div className={`space-y-2 text-sm ${result.impact === 'increase' ? 'text-rose-800' : 'text-emerald-800'}`}>
              <div className="flex justify-between">
                <span>Base CO2:</span>
                <span className="font-black">{result.base_co2?.toFixed(1) || '—'} ppm</span>
              </div>
              <div className="flex justify-between">
                <span>Predicted CO2:</span>
                <span className="font-black">{result.new_co2?.toFixed(1) || '—'} ppm</span>
              </div>
              <div className={`flex justify-between pt-2 border-t ${result.impact === 'increase' ? 'border-rose-200' : 'border-emerald-200'}`}>
                <span>Impact:</span>
                <span className={`font-black uppercase ${result.impact === 'increase' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {result.impact} by {Math.abs(result.change_percent)?.toFixed(1) || '—'}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioControls;
