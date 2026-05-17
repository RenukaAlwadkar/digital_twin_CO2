import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Wind, 
  Droplets, 
  Thermometer, 
  Car, 
  Trees, 
  Factory,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import ScenarioControls from '../components/ScenarioControls';

const MetricCard = ({ icon: Icon, label, value, unit, colorClass, trend }) => (
  <div className="bg-white/60 backdrop-blur border border-slate-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl ${colorClass}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-lg font-black text-slate-800">{value}<span className="text-[10px] ml-1 opacity-60 uppercase">{unit}</span></p>
      </div>
    </div>
    {trend && (
      <div className={`text-[10px] font-black px-2 py-1 rounded-lg ${trend > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
        {trend > 0 ? '+' : ''}{trend}%
      </div>
    )}
  </div>
);

const ComparisonBar = ({ label, base, sim, unit, color }) => {
  const max = Math.max(base, sim, 1);
  const basePct = (base / max) * 100;
  const simPct = (sim / max) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
        <span>{label}</span>
        <span>{unit}</span>
      </div>
      <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden flex flex-col justify-center px-1">
        <div 
          className="absolute left-0 top-0 h-1/2 bg-slate-300 opacity-40 transition-all duration-700" 
          style={{ width: `${basePct}%` }} 
        />
        <div 
          className={`absolute left-0 bottom-0 h-1/2 ${color} transition-all duration-1000 delay-300`} 
          style={{ width: `${simPct}%` }} 
        />
      </div>
      <div className="flex justify-between text-[11px] font-bold">
        <span className="text-slate-400">Baseline: {base.toFixed(1)}</span>
        <span className="text-slate-800">Simulated: {sim.toFixed(1)}</span>
      </div>
    </div>
  );
};

const WhatIfPage = ({ nodes, weather }) => {
  const [simResult, setSimResult] = useState(null);
  const [params, setParams] = useState(null);

  // Derived metrics from nodes
  const stats = useMemo(() => {
    if (!nodes.length) return { avgCo2: 420, avgTemp: 30 };
    const validCo2 = nodes.filter(n => n.co2ppm != null);
    return {
      avgCo2: validCo2.length ? validCo2.reduce((s, n) => s + n.co2ppm, 0) / validCo2.length : 420,
      avgTemp: nodes.reduce((s, n) => s + (n.temperatureC || 30), 0) / nodes.length,
      avgAqi: nodes.reduce((s, n) => s + (n.aqi || 100), 0) / nodes.length
    };
  }, [nodes]);

  const handleSimResult = (result, p) => {
    setSimResult(result);
    setParams(p);
  };

  return (
    <div className="flex-1 h-full flex overflow-hidden bg-slate-50/50">
      {/* Left Sidebar: Controls */}
      <div className="w-[380px] border-r border-slate-200 bg-white">
        <ScenarioControls 
          baseData={{ ...weather, co2ppm: stats.avgCo2 }} 
          onSimulationResult={handleSimResult}
        />
      </div>

      {/* Main Content Area: Analysis Results */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Dashboard Header */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Scenario Analysis Dashboard</h1>
              <p className="text-slate-500 font-medium mt-1">Simulating policy impact using physics-driven environmental models.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-black uppercase tracking-widest">
              <ShieldAlert size={14} />
              Predictive Engine Active
            </div>
          </div>

          {!simResult ? (
            <div className="h-[500px] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <BarChart3 size={32} />
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-slate-600">No Simulation Data</p>
                <p className="text-sm">Adjust parameters and run the physics simulation on the left.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-700">
              
              {/* Primary Impact Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard 
                  icon={Thermometer} 
                  label="Atmospheric Temp" 
                  value={(stats.avgTemp + (params?.temperatureDelta || 0)).toFixed(1)} 
                  unit="°C" 
                  colorClass="bg-amber-100 text-amber-600"
                  trend={params?.temperatureDelta ? ((params.temperatureDelta / stats.avgTemp) * 100).toFixed(1) : null}
                />
                <MetricCard 
                  icon={Car} 
                  label="Traffic Flux" 
                  value={params?.trafficFlow || 50} 
                  unit="%" 
                  colorClass="bg-indigo-100 text-indigo-600"
                  trend={((params?.trafficFlow - 50) / 50 * 100).toFixed(0)}
                />
                <MetricCard 
                  icon={Trees} 
                  label="Vegetation Scale" 
                  value={params?.greenCover || 10} 
                  unit="%" 
                  colorClass="bg-emerald-100 text-emerald-600"
                  trend={((params?.greenCover - 10) / 10 * 100).toFixed(0)}
                />
              </div>

              {/* Main Comparative View */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Carbon Level Variance</h3>
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-slate-300 rounded-full" /> Baseline</span>
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-indigo-600 rounded-full" /> Simulated</span>
                  </div>
                </div>
                
                <div className="p-8 space-y-10">
                  <ComparisonBar 
                    label="CO₂ Concentration" 
                    base={simResult.base_co2} 
                    sim={simResult.new_co2} 
                    unit="ppm" 
                    color="bg-indigo-600" 
                  />

                  <div className="grid grid-cols-2 gap-12">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                        <Factory size={14} /> Industrial Impact
                      </div>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Estimated Output</p>
                        <p className="text-2xl font-black text-slate-800">
                          {params.industrialOutput}% 
                          <span className="text-[10px] ml-2 text-rose-500 font-bold">
                            ({params.industrialOutput > 20 ? '+' : ''}{(params.industrialOutput - 20) * 2.5} ppm)
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                        <Wind size={14} /> Dispersion Rate
                      </div>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Wind Velocity</p>
                        <p className="text-2xl font-black text-slate-800">
                          {params.windSpeed} m/s 
                          <span className={`text-[10px] ml-2 font-bold ${params.windSpeed > 5 ? 'text-emerald-500' : 'text-slate-400'}`}>
                            ({params.windSpeed > 5 ? 'High Scattering' : 'Stagnant Air'})
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${simResult.impact === 'increase' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                      <Info size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Analysis Verdict</p>
                      <p className="text-lg font-black tracking-tight">
                        {simResult.impact === 'increase' 
                          ? 'Worsening Environmental Conditions Expected' 
                          : 'Potential for Significant Environmental Recovery'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Variance</p>
                    <p className={`text-2xl font-black ${simResult.impact === 'increase' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {simResult.change_percent > 0 ? '+' : ''}{simResult.change_percent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

          {/* Research Note */}
          <div className="bg-indigo-50/30 border border-indigo-100/50 p-6 rounded-3xl flex gap-5 items-start">
            <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
              <ShieldAlert size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black text-indigo-900">Research & Methodology Note</p>
              <p className="text-xs text-indigo-800/70 leading-relaxed font-medium">
                This simulation utilizes the <strong>COPERT 4 Urban Fleet Model</strong> for traffic emissions and 
                the <strong>Cheng 3D Finite-Difference Model</strong> for atmospheric dispersion. Results are based 
                on current live API telemetry from Indian cities and represent a high-confidence estimate of 
                atmospheric shifts under simulated conditions.
              </p>
            </div>
          </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatIfPage;
