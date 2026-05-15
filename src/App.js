import React, { useEffect, useMemo, useState } from 'react';
import { Globe, Wifi, WifiOff } from 'lucide-react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import useMqtt from './hooks/useMqtt';
import CityVisualizationPage from './pages/CityVisualizationPage';
import NodeDetailsPage from './pages/NodeDetailsPage';
import { materializeDelhiNodes } from './utils/delhiNodes';

function App() {
  const trafficCollectorTopic = 'ecotwin/delhi/traffic/collector';
  const dummyTrafficTopic = 'ecotwin/delhi/traffic/dummy';
  const envCollectorTopic = 'ecotwin/delhi/env/collector';
  const livePrototypeTopic = 'ecotwin/live_prototype_data_123';

  const { sensorData: collectorData, connectionStatus: collectorStatus } = useMqtt(trafficCollectorTopic);
  const { sensorData: dummyData, connectionStatus: dummyStatus } = useMqtt(dummyTrafficTopic);
  const { sensorData: envData, connectionStatus: envStatus } = useMqtt(envCollectorTopic);
  const { sensorData: livePrototypeData, connectionStatus: livePrototypeStatus } = useMqtt(livePrototypeTopic);

  const [selectedNodeId, setSelectedNodeId] = useState('traffic-collector');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 2400);
    return () => window.clearInterval(interval);
  }, []);

  const nodes = useMemo(
    () => materializeDelhiNodes({ trafficData: collectorData, dummyData, envData, livePrototypeData, tick }),
    [collectorData, dummyData, envData, livePrototypeData, tick]
  );

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

  const liveFeed = [collectorStatus, dummyStatus, envStatus, livePrototypeStatus].some((status) => status === 'Receiving Live Wokwi Data' || status === 'Receiving Live Prototype Data');

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
              />
            )}
          />
          <Route path="*" element={<Navigate to="/city" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
