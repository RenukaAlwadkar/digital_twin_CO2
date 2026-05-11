import React, { useEffect, useMemo, useState } from 'react';
import { Globe, Wifi, WifiOff, LayoutDashboard, Network, FlaskConical } from 'lucide-react';
import useMqtt from './hooks/useMqtt';
import useCities from './hooks/useCities';
import CityVisualizationPage from './pages/CityVisualizationPage';
import NodeDetailsPage from './pages/NodeDetailsPage';
import WhatIfPage from './pages/WhatIfPage';
import { materializeDelhiNodes } from './utils/delhiNodes';
import { agentInstance } from './services/agent';
import { fetchOpenWeatherData as fetchDelhiWeather } from './services/openWeatherApi';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'nodes',     label: 'Nodes',     icon: Network },
  { id: 'whatif',   label: 'What-If',   icon: FlaskConical },
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const trafficCollectorTopic = 'ecotwin/delhi/traffic/collector';
  const dummyTrafficTopic     = 'ecotwin/delhi/traffic/dummy';
  const envCollectorTopic     = 'ecotwin/delhi/env/collector';
  const prototypeTopic        = 'ecotwin/live_data';

  const { sensorData: collectorData,   connectionStatus: collectorStatus  } = useMqtt(trafficCollectorTopic);
  const { sensorData: dummyData,       connectionStatus: dummyStatus      } = useMqtt(dummyTrafficTopic);
  const { sensorData: envData,         connectionStatus: envStatus        } = useMqtt(envCollectorTopic);
  const { sensorData: prototypeDataRaw, connectionStatus: prototypeStatus } = useMqtt(prototypeTopic);

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [tick, setTick]                     = useState(0);
  const [scenarioParams, setScenarioParams] = useState({
    trafficReduction: 0, greenCover: 0, captureCount: 0, captureEfficiency: 50
  });
  const [agentResult, setAgentResult] = useState(null);
  const [weather, setWeather]         = useState(null);

  // Real-time data for all Indian cities
  const { cityNodes } = useCities();

  // Fetch real weather every 10s
  useEffect(() => {
    const fetchWeather = () => {
      fetchDelhiWeather().then(data => { if (data) setWeather(data); });
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

  // Build prototypeData from real API + optional MQTT CO2
  const prototypeData = useMemo(() => {
    if (weather) {
      return {
        ...prototypeDataRaw,
        temperatureC: weather.temperature,
        humidityPct:  weather.humidity,
        pm25:         weather.pm2_5,
        aqi:          weather.aqi,
        wind_speed:   weather.wind_speed,
        co2ppm:       prototypeDataRaw?.co2ppm || prototypeDataRaw?.co2 || 420,
        id:           'live-prototype-node',
        name:         'Live API Node (Delhi)',
        location:     'New Delhi (API)',
      };
    }
    if (!prototypeDataRaw) return null;
    return { ...prototypeDataRaw, id: 'live-prototype-node', name: 'Live Prototype', location: 'New Delhi' };
  }, [prototypeDataRaw, weather]);

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

  // Save telemetry history every 2 minutes
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        await fetch('http://localhost:8000/history/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            temperature:    combinedEnvData.temperatureC || 30,
            humidity:       combinedEnvData.humidityPct  || 50,
            wind_speed:     weather?.wind_speed          || 5,
            pollution_index: combinedEnvData.aqi         || 100,
            traffic_factor: 50,
            time_of_day:    new Date().getHours(),
            co2ppm:         combinedEnvData.co2ppm       || 420,
          }),
        });
        console.log('📦 Telemetry history saved.');
      } catch (err) {
        console.error('Failed to save history', err);
      }
    }, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, [combinedEnvData, weather]);

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
              weather={weather}
            />
          )}
          {activeTab === 'nodes' && (
            <NodeDetailsPage
              nodes={nodes}
              selectedNodeId={selectedNode?.id}
              onSelectNode={setSelectedNodeId}
              weather={weather}
            />
          )}
          {activeTab === 'whatif' && (
            <WhatIfPage
              nodes={nodes}
              weather={weather}
              agentResult={agentResult}
              setScenarioParams={setScenarioParams}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
