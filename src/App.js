import React, { useEffect, useMemo, useState } from 'react';
import { Globe, Wifi, WifiOff } from 'lucide-react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import useMqtt from './hooks/useMqtt';
import CityVisualizationPage from './pages/CityVisualizationPage';
import NodeDetailsPage from './pages/NodeDetailsPage';
import HistoryPage from './pages/HistoryPage';
import { materializeDelhiNodes } from './utils/delhiNodes';
import { agentInstance } from './services/agent';
import { fetchOpenWeatherData as fetchDelhiWeather } from './services/openWeatherApi';

function App() {
  const trafficCollectorTopic = 'ecotwin/delhi/traffic/collector';
  const dummyTrafficTopic = 'ecotwin/delhi/traffic/dummy';
  const envCollectorTopic = 'ecotwin/delhi/env/collector';
  const prototypeTopic = 'ecotwin/live_data';

  const { sensorData: collectorData, connectionStatus: collectorStatus } = useMqtt(trafficCollectorTopic);
  const { sensorData: dummyData, connectionStatus: dummyStatus } = useMqtt(dummyTrafficTopic);
  const { sensorData: envData, connectionStatus: envStatus } = useMqtt(envCollectorTopic);
  const { sensorData: prototypeDataRaw, connectionStatus: prototypeStatus } = useMqtt(prototypeTopic);

  const [selectedNodeId, setSelectedNodeId] = useState('traffic-collector');
  const [tick, setTick] = useState(0);

  const [scenarioParams, setScenarioParams] = useState({
    trafficReduction: 0,
    greenCover: 0,
    captureCount: 0,
    captureEfficiency: 50
  });

  const [agentResult, setAgentResult] = useState(null);
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const fetchWeather = () => {
      fetchDelhiWeather().then(data => {
        if (data) setWeather(data);
      });
    };
    fetchWeather(); // Initial fetch
    const interval = setInterval(fetchWeather, 10000); // Fetch every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const prototypeData = useMemo(() => {
    if (weather) {
      return {
        ...prototypeDataRaw, // preserve any raw mqtt data if present
        temperatureC: weather.temperature,
        humidityPct: weather.humidity,
        pm25: weather.pm2_5,
        aqi: weather.aqi,
        wind_speed: weather.wind_speed,
        co2ppm: prototypeDataRaw?.co2ppm || 420, // MQTT CO2 or baseline
        id: 'live-prototype-node',
        name: 'Live API Node (Delhi Weather)',
        location: 'New Delhi (API)'
      };
    }
    if (!prototypeDataRaw) return null;
    return { ...prototypeDataRaw, id: 'live-prototype-node', name: 'Live Prototype (CO2)', location: 'New Delhi (Test)' };
  }, [prototypeDataRaw, weather]);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 2400);
    return () => window.clearInterval(interval);
  }, []);

  const combinedEnvData = useMemo(() => {
    return {
      ...envData,
      temperatureC: weather?.temperature ?? envData?.temperatureC,
      humidityPct: weather?.humidity ?? envData?.humidityPct,
      pm25: weather?.pm2_5 ?? envData?.pm25,
      aqi: weather?.aqi ?? envData?.aqi,
      co2ppm: envData?.co2ppm // Keep CO2 from MQTT if exists
    };
  }, [weather, envData]);

  const nodes = useMemo(
    () => materializeDelhiNodes({ trafficData: collectorData, dummyData, envData: combinedEnvData, prototypeData, tick, scenarioParams }),
    [collectorData, dummyData, combinedEnvData, prototypeData, tick, scenarioParams]
  );

  // Save history every 2 minutes
  useEffect(() => {
    const saveInterval = setInterval(async () => {
      try {
        const payload = {
          temperature: combinedEnvData.temperatureC || 30,
          humidity: combinedEnvData.humidityPct || 50,
          wind_speed: combinedEnvData.wind_speed || 5, // fallback if not present
          pollution_index: combinedEnvData.aqi || 100,
          traffic_factor: 50, // Average default
          time_of_day: new Date().getHours(),
          co2ppm: combinedEnvData.co2ppm || 400
        };
        await fetch('http://localhost:8000/history/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        console.log("Telemetry history saved.");
      } catch (err) {
        console.error("Failed to save history", err);
      }
    }, 2 * 60 * 1000);

    return () => clearInterval(saveInterval);
  }, [combinedEnvData]);

  useEffect(() => {
    if (nodes.length > 0) {
      // Analyze nodes periodically with AI Agent
      const result = agentInstance.analyze(nodes);
      setAgentResult(result);
    }
  }, [nodes]);

  useEffect(() => {
    if (!nodes.length) return;
    const selectedExists = nodes.some((node) => node.id === selectedNodeId);
    if (!selectedExists) {
      setSelectedNodeId(nodes[0].id);
    }
  }, [nodes, selectedNodeId]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? nodes[0] ?? null,
    [nodes, selectedNodeId]
  );

  const liveFeed = [collectorStatus, dummyStatus, envStatus, prototypeStatus].some((status) => status === 'Receiving Live Wokwi Data');

  return (
    <div className="h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-4 md:p-6 xl:p-8 text-slate-800 overflow-hidden">
      <div className="absolute top-[-8%] left-[-10%] h-[24rem] w-[24rem] rounded-full bg-sky-400/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-8%] h-[24rem] w-[24rem] rounded-full bg-emerald-400/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1700px] flex-col gap-6">
        <header className="glass-panel px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-slate-950 text-white flex items-center justify-center">
              <Globe size={22} />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-950">EcoTwin</h1>
          </div>

          <div className="flex items-center gap-2">
            <NavLink
              to="/city"
              className={({ isActive }) => `rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${isActive ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
            >
              City
            </NavLink>
            <NavLink
              to="/nodes"
              className={({ isActive }) => `rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${isActive ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
            >
              Nodes
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) => `rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${isActive ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
            >
              History
            </NavLink>
            <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${liveFeed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}>
              {liveFeed ? <Wifi size={14} /> : <WifiOff size={14} />}
              {liveFeed ? 'Live' : 'Waiting'}
            </span>
          </div>
        </header>

        <Routes>
          <Route
            path="/city"
            element={(
              <CityVisualizationPage
                nodes={nodes}
                tick={tick}
                selectedNode={selectedNode}
                onSelectNode={setSelectedNodeId}
                scenarioParams={scenarioParams}
                setScenarioParams={setScenarioParams}
                agentResult={agentResult}
                weather={weather}
              />
            )}
          />
          <Route
            path="/nodes"
            element={(
              <NodeDetailsPage
                nodes={nodes}
                selectedNodeId={selectedNode?.id}
                onSelectNode={setSelectedNodeId}
                weather={weather}
              />
            )}
          />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/city" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
