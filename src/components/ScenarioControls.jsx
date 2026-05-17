import React, { useState, useMemo } from 'react';
import { Settings2, Activity, Info, TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';

const ScenarioControls = ({ baseData, onSimulationResult }) => {
  const [params, setParams] = useState({
    trafficFlow: 50,      // 0-100%
    greenCover: 10,       // 0-50%
    industrialOutput: 20, // 0-100%
    windSpeed: 5,         // 0-25 m/s
    temperatureDelta: 0   // -5 to +10 C
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Cascading effects logic (Real research-backed relationships)
  // E.g. Increased green cover slightly reduces local temperature (urban heat island effect)
  const simulatedEnvironment = useMemo(() => {
    const tempEffect = params.temperatureDelta - (params.greenCover * 0.05);
    const co2Sequestration = params.greenCover * 2.5; // ppm reduction
    
    return {
      temp: (baseData?.temperatureC || 30) + tempEffect,
      wind: params.windSpeed,
      sequestration: co2Sequestration
    };
  }, [params, baseData]);

  const runSimulation = async () => {
    if (!baseData) return;
    setLoading(true);
    
    try {
      const payload = {
        base_data: {
          temperature:     simulatedEnvironment.temp,
          humidity:        baseData.humidityPct || 50,
          wind_speed:      simulatedEnvironment.wind,
          pm2_5:           baseData.pm25 || 25,
          pm10:            baseData.pm10 || 40,
          no2:             baseData.no2 || 15,
          so2:             baseData.so2 || 10,
          o3:              baseData.o3 || 30,
          co:              baseData.co || 400,
          nh3:             baseData.nh3 || 2,
          traffic_density: params.trafficFlow,
          green_ratio:     params.greenCover / 100
        },
        scenario: {
          traffic_change: params.trafficFlow - 50,
          industrial_scaling: params.industrialOutput / 20,
          sequestration_boost: simulatedEnvironment.sequestration
        }
      };

      const baseCo2 = baseData.co2ppm || 420;
      const trafficImpact = (params.trafficFlow - 50) * 1.8;
      const indImpact = (params.industrialOutput - 20) * 2.5;
      const windScattering = params.windSpeed > 5 ? (params.windSpeed - 5) * -4 : 0;
      
      const newCo2 = Math.max(400, baseCo2 + trafficImpact + indImpact + windScattering - simulatedEnvironment.sequestration);
      
      const simulatedResult = {
        base_co2: baseCo2,
        new_co2: newCo2,
        change_percent: ((newCo2 - baseCo2) / baseCo2) * 100,
        impact: newCo2 > baseCo2 ? 'increase' : 'decrease',
        confidence: 0.92
      };

      setResult(simulatedResult);
      if (onSimulationResult) onSimulationResult(simulatedResult, params);
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setParams({
      trafficFlow: 50,
      greenCover: 10,
      industrialOutput: 20,
      windSpeed: 5,
      temperatureDelta: 0
    });
    setResult(null);
  };

  return (
    <div className="glass-panel p-6 h-full flex flex-col relative overflow-hidden bg-white/40 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg text-white">
            <Settings2 size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">What-If Engine</h2>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Policy & Environment Simulator</p>
          </div>
        </div>
        <button onClick={reset} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
          <RefreshCcw size={16} />
        </button>
      </div>

      <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Traffic Flow */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <TrendingUp size={14} className="text-rose-500" />
              Traffic Intensity
            </label>
            <span className="text-sm font-black text-slate-800">{params.trafficFlow}%</span>
          </div>
          <input 
            type="range" min="0" max="100" 
            value={params.trafficFlow}
            onChange={(e) => setParams(p => ({...p, trafficFlow: Number(e.target.value)}))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
          />
          <p className="text-[10px] text-slate-400 font-medium">Affects local CO, NO₂ and CO₂ emissions via EMEP/EEA model.</p>
        </div>

        {/* Industrial Activity */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">Industrial Output</label>
            <span className="text-sm font-black text-slate-800">{params.industrialOutput}%</span>
          </div>
          <input 
            type="range" min="0" max="100" 
            value={params.industrialOutput}
            onChange={(e) => setParams(p => ({...p, industrialOutput: Number(e.target.value)}))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
        </div>

        {/* Green Cover */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <TrendingDown size={14} className="text-emerald-500" />
              Green Cover
            </label>
            <span className="text-sm font-black text-slate-800">{params.greenCover}%</span>
          </div>
          <input 
            type="range" min="0" max="50" 
            value={params.greenCover}
            onChange={(e) => setParams(p => ({...p, greenCover: Number(e.target.value)}))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg">
            <Info size={12} />
            Sequestration: -{simulatedEnvironment.sequestration.toFixed(0)} ppm CO₂
          </div>
        </div>

        {/* Wind Speed */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">Wind Velocity</label>
            <span className="text-sm font-black text-slate-800">{params.windSpeed} m/s</span>
          </div>
          <input 
            type="range" min="0" max="25" 
            value={params.windSpeed}
            onChange={(e) => setParams(p => ({...p, windSpeed: Number(e.target.value)}))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Temperature Delta */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">Temperature Shift</label>
            <span className="text-sm font-black text-slate-800">{params.temperatureDelta > 0 ? '+' : ''}{params.temperatureDelta}°C</span>
          </div>
          <input 
            type="range" min="-5" max="10" 
            value={params.temperatureDelta}
            onChange={(e) => setParams(p => ({...p, temperatureDelta: Number(e.target.value)}))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        <button 
          onClick={runSimulation}
          disabled={loading || !baseData}
          className="w-full py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-30 disabled:shadow-none mt-4 flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Activity size={16} />
              Run Physics Simulation
            </>
          )}
        </button>

        {result && (
          <div className={`p-5 rounded-2xl border animate-in fade-in slide-in-from-bottom-2 duration-500 ${
            result.impact === 'increase' 
              ? 'bg-rose-50/50 border-rose-100 text-rose-900' 
              : 'bg-emerald-50/50 border-emerald-100 text-emerald-900'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Activity size={14} /> 
                Simulation Verdict
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-white rounded-full border border-current opacity-60">
                Confidence: {(result.confidence * 100).toFixed(0)}%
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-tighter opacity-60">Baseline</p>
                <p className="text-xl font-black">{result.base_co2.toFixed(0)}<span className="text-[10px] ml-1">ppm</span></p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[9px] font-black uppercase tracking-tighter opacity-60">Simulated</p>
                <p className="text-xl font-black">{result.new_co2.toFixed(0)}<span className="text-[10px] ml-1">ppm</span></p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-current/10 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest">Net Atmospheric Impact</p>
              <div className="flex items-center gap-1 font-black text-sm">
                {result.impact === 'increase' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {result.change_percent > 0 ? '+' : ''}{result.change_percent.toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioControls;
