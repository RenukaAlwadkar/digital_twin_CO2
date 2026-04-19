import React, { useState, useEffect, useRef } from 'react';
import Heatmap from './components/Heatmap';
import MetricsPanel from './components/MetricsPanel';
import ScenarioControls from './components/ScenarioControls';
import { generateCityGrid, simulateStep, calculateMetrics } from './utils/simulation';
import { Globe, Wifi, WifiOff, Activity } from 'lucide-react';
import useMqtt from './hooks/useMqtt';

function App() {
  const [grid, setGrid] = useState(null);
  const [activeInterventions, setActiveInterventions] = useState([]);
  const [customInterventions, setCustomInterventions] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [baselineTotal, setBaselineTotal] = useState(null);

  // Subscribe to a unique topic for your Wokwi project
  const MQTT_TOPIC = 'ecotwin/live_prototype_data_123';
  const { sensorData, connectionStatus } = useMqtt(MQTT_TOPIC);
  
  // Convert sensor data (e.g., potentiometer 0-4095) into a more aggressive global multiplier (0.0x to 5.0x)
  // This ensures the heatmap reacts dramatically in real-time
  const globalMultiplier = sensorData?.co2 !== undefined ? (sensorData.co2 / 4095) * 5.0 : 1.0;

  // Refs for the simulation loop
  const interventionsRef = useRef(activeInterventions);
  const customInterventionsRef = useRef(customInterventions);
  const globalMultiplierRef = useRef(globalMultiplier);

  useEffect(() => {
    interventionsRef.current = activeInterventions;
    customInterventionsRef.current = customInterventions;
    globalMultiplierRef.current = globalMultiplier;
  }, [activeInterventions, customInterventions, globalMultiplier]);

  useEffect(() => {
    // Initialize
    const initialGrid = generateCityGrid(12, 12); 
    setGrid(initialGrid);
    
    // Calculate initial baseline metrics
    const initialMetrics = calculateMetrics(initialGrid);
    setMetrics(initialMetrics);
    setBaselineTotal(initialMetrics.totalCo2);

    // Simulation loop
    let currentGrid = initialGrid;
    const interval = setInterval(() => {
      currentGrid = simulateStep(
        currentGrid, 
        interventionsRef.current,
        customInterventionsRef.current,
        globalMultiplierRef.current
      );
      setGrid(currentGrid);
      setMetrics(calculateMetrics(currentGrid));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleIntervention = (id) => {
    setActiveInterventions(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 relative overflow-hidden flex flex-col font-sans text-slate-800">
      {/* Background decoration (Light Mode version) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-400/20 blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10 w-full flex-1 flex flex-col">
        
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Globe className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">
                EcoTwin IoT
              </h1>
              <p className="text-slate-500 text-sm font-semibold tracking-wide">Urban CO₂ Digital Twin & Hardware Simulator</p>
            </div>
          </div>
          
          {/* IoT Status Badge */}
          <div className={`flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-sm border ${
            connectionStatus === 'Receiving Live Wokwi Data' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : connectionStatus.includes('Waiting') 
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}>
            {connectionStatus === 'Receiving Live Wokwi Data' ? <Wifi size={18} /> : 
             connectionStatus.includes('Waiting') ? <Activity size={18} className="animate-pulse" /> : <WifiOff size={18} />}
            <span className="text-sm font-bold">{connectionStatus}</span>
          </div>
        </header>

        {/* Dynamic Hardware Sensor Display - ALWAYS VISIBLE */}
        <div className={`mb-8 p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-500 ${
          sensorData 
            ? 'bg-white shadow-xl shadow-blue-100/50 border-blue-200' 
            : 'bg-slate-100/50 border-slate-200 border-dashed'
        }`}>
          <div>
            <h3 className={`font-black text-sm uppercase tracking-wider mb-2 ${sensorData ? 'text-blue-600' : 'text-slate-500'}`}>
              Live Hardware Connection (Wokwi Potentiometer)
            </h3>
            <p className="text-slate-600 font-medium text-sm mb-1">
              Raw Analog Value: {sensorData ? (
                <span className="font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100">{sensorData.co2}</span>
              ) : (
                <span className="font-mono text-slate-400 bg-slate-200 px-2 py-1 rounded">No Data</span>
              )} <span className="text-slate-400">/ 4095</span>
            </p>
            <p className="text-xs text-slate-500 font-medium">
              You can see these values printing in your Wokwi Serial Monitor and Browser Console (F12).
            </p>
          </div>
          
          <div className={`p-4 rounded-xl text-center min-w-[200px] border ${
            sensorData ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-200'
          }`}>
            <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">City Traffic Volume (Simulation Impact)</p>
            <div className={`text-4xl font-black flex items-baseline justify-center gap-1 ${sensorData ? 'text-blue-700' : 'text-slate-400'}`}>
              {sensorData ? (globalMultiplier * 100).toFixed(0) : '100'}<span className="text-xl opacity-50">%</span>
            </div>
          </div>
        </div>

        {/* Metrics Panel */}
        <MetricsPanel metrics={metrics} baselineTotal={baselineTotal} />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
          <div className="lg:col-span-2 h-[600px] lg:h-auto">
            <Heatmap grid={grid} />
          </div>
          <div className="lg:col-span-1 h-[600px] lg:h-auto flex flex-col">
            <ScenarioControls 
              activeInterventions={activeInterventions} 
              toggleIntervention={toggleIntervention}
              customInterventions={customInterventions}
              setCustomInterventions={setCustomInterventions}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
