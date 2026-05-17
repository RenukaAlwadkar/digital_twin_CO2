import React, { useEffect, useMemo, useState } from 'react';
import { Globe, Wifi, WifiOff, LayoutDashboard, Network, FlaskConical, History } from 'lucide-react';
import useMqtt from './hooks/useMqtt';
import useWokwi from './hooks/useWokwi';
import useCities from './hooks/useCities';
import CityVisualizationPage from './pages/CityVisualizationPage';
import NodeDetailsPage from './pages/NodeDetailsPage';
import WhatIfPage from './pages/WhatIfPage';
import HistoryPage from './pages/HistoryPage';
import { materializeDelhiNodes } from './utils/delhiNodes';
import { agentInstance } from './services/agent';
import { fetchOpenWeatherData as fetchDelhiWeather } from './services/openWeatherApi';
import { saveCityTelemetry, testFirestoreConnection } from './services/firestoreService';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'nodes',     label: 'Nodes',     icon: Network },
  { id: 'whatif',   label: 'What-If',   icon: FlaskConical },
  { id: 'history',  label: 'History',   icon: History },
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sourceMode, setSourceMode] = useState('auto'); // 'auto' | 'wokwi' | 'api'

  const trafficCollectorTopic = 'ecotwin/delhi/traffic/collector';
  const dummyTrafficTopic     = 'ecotwin/delhi/traffic/dummy';
  const envCollectorTopic     = 'ecotwin/delhi/env/collector';
  const prototypeTopic        = 'ecotwin/live_data';

  const { sensorData: collectorData,   connectionStatus: collectorStatus  } = useMqtt(trafficCollectorTopic);
  const { sensorData: dummyData,       connectionStatus: dummyStatus      } = useMqtt(dummyTrafficTopic);
  const { sensorData: envData,         connectionStatus: envStatus        } = useMqtt(envCollectorTopic);
  const { sensorData: prototypeDataRaw, connectionStatus: prototypeStatus } = useMqtt(prototypeTopic);

  // Wokwi live prototype hook
  const wokwiProps = useWokwi();

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [tick, setTick]                     = useState(0);
  const [scenarioParams, setScenarioParams] = useState({
    trafficReduction: 0, greenCover: 0, captureCount: 0, captureEfficiency: 50
  });
  const [agentResult, setAgentResult] = useState(null);
  const [weather, setWeather]         = useState(null);

  // Real-time data for all Indian cities
  const { cityNodes } = useCities();

  // Test Firestore connection once on startup
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Fetch real weather every 10s
  useEffect(() => {
    const fetchWeather = () => {
      fetchDelhiWeather(28.6139, 77.2090, 'New Delhi').then(data => { if (data) setWeather(data); });
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 10000);
    return () => clearInterval(interval);
  }, []);

  // Tick for animation
  useEffect(() => {
    const interval = window.setInterval(() => setTick(v => v + 1), 2400);
    return () => window.clearInterval(interval);
  }, []);

  // ── Active weather: Controlled by sourceMode ──────────────────────────
  const activeWeather = useMemo(() => {
    const wReading = wokwiProps?.reading;
    const wLive    = wokwiProps?.isLive && wReading;
    
    // Logic for determining if we should use Wokwi for this specific computation
    const useWokwi = sourceMode === 'wokwi' || (sourceMode === 'auto' && wLive);

    return {
      // Core env params — Wokwi wins when live or forced
      temperature:  useWokwi ? wReading?.temperature : (weather?.temperature ?? null),
      humidity:     useWokwi ? wReading?.humidity    : (weather?.humidity    ?? null),
      co2ppm:       useWokwi ? wReading?.co2_ppm     : null,
      co_ppm:       useWokwi ? wReading?.co_ppm      : null,

      // Air quality — always from API fallback
      pm2_5:       weather?.pm2_5      ?? null,
      pm10:        weather?.pm10       ?? null,
      no2:         weather?.no2        ?? null,
      no:          weather?.no         ?? null,
      so2:         weather?.so2        ?? null,
      o3:          weather?.o3         ?? null,
      co:          weather?.co         ?? null,
      nh3:         weather?.nh3        ?? null,
      aqi:         weather?.aqi        ?? null,
      wind_speed:  weather?.wind_speed ?? null,
      pressure:    weather?.pressure   ?? null,
      weatherDesc: weather?.weatherDesc ?? '',
      feels_like:  weather?.feels_like  ?? null,

      // Source metadata
      source:      useWokwi ? 'wokwi' : 'api',
      mode:        sourceMode,
      isWokwiLive: wLive
    };
  }, [weather, wokwiProps, sourceMode]);

  // Build prototypeData merging activeWeather + MQTT raw
  const prototypeData = useMemo(() => {
    const isWokwi  = activeWeather.source === 'wokwi';

    if (activeWeather.temperature != null || activeWeather.co2ppm != null) {
      return {
        ...prototypeDataRaw,
        temperatureC: activeWeather.temperature,
        humidityPct:  activeWeather.humidity,
        pm25:         activeWeather.pm2_5,
        aqi:          activeWeather.aqi,
        wind_speed:   activeWeather.wind_speed,
        co2ppm:       activeWeather.co2ppm || prototypeDataRaw?.co2 || 420,
        id:           'live-prototype-node',
        name:         isWokwi ? '⚡ Wokwi Node (Delhi)' : '☁️ API Node (Delhi)',
        location:     'New Delhi',
        dataSource:   activeWeather.source,
      };
    }
    if (!prototypeDataRaw) return null;
    return { ...prototypeDataRaw, id: 'live-prototype-node', name: 'Live Prototype', location: 'New Delhi' };
  }, [prototypeDataRaw, activeWeather]);

  // Merge env data with real weather
  const combinedEnvData = useMemo(() => ({
    ...envData,
    temperatureC: weather?.temperature ?? envData?.temperatureC,
    humidityPct:  weather?.humidity    ?? envData?.humidityPct,
    pm25:         weather?.pm2_5       ?? envData?.pm25,
    aqi:          weather?.aqi         ?? envData?.aqi,
    co2ppm:       envData?.co2ppm,
  }), [weather, envData]);

  // MQTT-based nodes (Delhi prototype + traffic/env collectors)
  const mqttNodes = useMemo(
    () => materializeDelhiNodes({ trafficData: collectorData, dummyData, envData: combinedEnvData, prototypeData, tick, scenarioParams }),
    [collectorData, dummyData, combinedEnvData, prototypeData, tick, scenarioParams]
  );

  // Merge city API nodes with MQTT nodes (MQTT overrides matching city id if live)
  const nodes = useMemo(() => {
    const mqttIds = new Set(mqttNodes.map(n => n.id));
    const filteredCities = cityNodes.filter(c => !mqttIds.has(c.id));
    return [...mqttNodes, ...filteredCities];
  }, [mqttNodes, cityNodes]);

  // Ensure selected node is valid
  useEffect(() => {
    if (!nodes.length) return;
    if (!selectedNodeId || !nodes.some(n => n.id === selectedNodeId)) {
      setSelectedNodeId(nodes[0].id);
    }
  }, [nodes, selectedNodeId]);

  // AI agent analysis
  useEffect(() => {
    if (nodes.length > 0) setAgentResult(agentInstance.analyze(nodes));
  }, [nodes]);

  // Save ALL city telemetry to Firestore every 60 seconds
  useEffect(() => {
    if (!cityNodes.length) return;
    const saveAll = () => {
      cityNodes.forEach(node => {
        // city nodes use temperatureC / humidityPct / pm25 / aqiRaw (see useCities.js)
        if (node.id && node.temperatureC != null) {
          saveCityTelemetry(node.id, node.location || node.name, {
            temperature:  node.temperatureC,
            humidity:     node.humidityPct,
            wind_speed:   node.wind_speed,
            aqi:          node.aqiRaw,        // raw 1-5 scale
            no:           node.no,
            pm2_5:        node.pm25,
            pm10:         node.pm10,
            no2:          node.no2,
            so2:          node.so2,
            o3:           node.o3,
            co:           node.co,
            co2ppm:       node.co2ppm,
            weatherDesc:  node.weatherDesc,
            pressure:     node.pressure,
          });
        }
      });
    };
    saveAll(); // Save immediately on first load
    const id = setInterval(saveAll, 60 * 1000); // Then every 60s
    return () => clearInterval(id);
  }, [cityNodes]);

  const selectedNode = useMemo(
    () => nodes.find(n => n.id === selectedNodeId) ?? nodes[0] ?? null,
    [nodes, selectedNodeId]
  );

  const liveFeed = [collectorStatus, dummyStatus, envStatus, prototypeStatus]
    .some(s => s === 'Receiving Live Wokwi Data');

  return (
    <div className="h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-4 md:p-6 xl:p-8 text-slate-800 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-8%] left-[-10%] h-[24rem] w-[24rem] rounded-full bg-sky-400/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-8%] h-[24rem] w-[24rem] rounded-full bg-emerald-400/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1700px] flex-col gap-6">
        {/* Header */}
        <header className="glass-panel px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-slate-950 text-white flex items-center justify-center">
              <Globe size={22} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-950">EcoTwin</h1>
              <p className="text-xs text-slate-400 font-medium">Urban CO₂ Digital Twin · New Delhi</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Source Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200">
              {[
                { id: 'auto',  label: 'Auto' },
                { id: 'wokwi', label: 'Wokwi' },
                { id: 'api',   label: 'API' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSourceMode(opt.id)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all
                    ${sourceMode === opt.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Tabs */}
              {TABS.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all
                      ${active ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Live indicator */}
            <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em]
              ${liveFeed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}>
              {liveFeed ? <Wifi size={14} /> : <WifiOff size={14} />}
              {liveFeed ? 'Live' : 'Waiting'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {activeTab === 'dashboard' && (
            <CityVisualizationPage
              nodes={nodes}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNodeId}
              weather={activeWeather}
              rawWeather={weather}
              wokwiProps={wokwiProps}
            />
          )}
          {activeTab === 'nodes' && (
            <NodeDetailsPage
              nodes={nodes}
              selectedNodeId={selectedNode?.id}
              onSelectNode={setSelectedNodeId}
              weather={activeWeather}
            />
          )}
          {activeTab === 'whatif' && (
            <WhatIfPage
              nodes={nodes}
              weather={activeWeather}
              agentResult={agentResult}
              setScenarioParams={setScenarioParams}
            />
          )}
          {activeTab === 'history' && (
            <HistoryPage />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
