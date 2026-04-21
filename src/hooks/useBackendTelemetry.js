import { useEffect, useMemo, useState } from 'react';

const TOPICS = {
  trafficCollector: 'ecotwin/delhi/traffic/collector',
  trafficDummy: 'ecotwin/delhi/traffic/dummy',
  envCollector: 'ecotwin/delhi/env/collector',
};

const deriveHttpBaseUrl = () => {
  if (process.env.REACT_APP_BACKEND_HTTP_URL) {
    return process.env.REACT_APP_BACKEND_HTTP_URL;
  }

  return 'http://localhost:4000';
};

const deriveWsUrl = () => {
  if (process.env.REACT_APP_BACKEND_WS_URL) {
    return process.env.REACT_APP_BACKEND_WS_URL;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.hostname;
  return `${protocol}://${host}:4000/ws`;
};

const useBackendTelemetry = () => {
  const [collectorData, setCollectorData] = useState(null);
  const [dummyData, setDummyData] = useState(null);
  const [envData, setEnvData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting to backend...');

  const httpBaseUrl = useMemo(() => deriveHttpBaseUrl(), []);
  const wsUrl = useMemo(() => deriveWsUrl(), []);

  useEffect(() => {
    let socket;
    let cancelled = false;

    const applyLatest = (byTopic = {}) => {
      if (byTopic[TOPICS.trafficCollector]) setCollectorData(byTopic[TOPICS.trafficCollector]);
      if (byTopic[TOPICS.trafficDummy]) setDummyData(byTopic[TOPICS.trafficDummy]);
      if (byTopic[TOPICS.envCollector]) setEnvData(byTopic[TOPICS.envCollector]);
    };

    const bootstrap = async () => {
      try {
        const response = await fetch(`${httpBaseUrl}/api/latest`);
        if (response.ok) {
          const latest = await response.json();
          if (!cancelled) {
            applyLatest(latest.byTopic);
          }
        }
      } catch (error) {
        console.error('Failed to fetch backend latest snapshot:', error);
      }

      if (cancelled) return;

      socket = new WebSocket(wsUrl);

      socket.addEventListener('open', () => {
        setConnectionStatus('Waiting for backend data...');
      });

      socket.addEventListener('message', (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload?.type === 'snapshot') {
            applyLatest(payload.data?.byTopic || {});
            setConnectionStatus('Receiving live backend data');
            return;
          }

          if (payload?.type === 'telemetry:update') {
            const update = payload.data;
            if (update.topic === TOPICS.trafficCollector) setCollectorData(update);
            if (update.topic === TOPICS.trafficDummy) setDummyData(update);
            if (update.topic === TOPICS.envCollector) setEnvData(update);
            setConnectionStatus('Receiving live backend data');
          }
        } catch (error) {
          console.error('Failed to parse backend websocket payload:', error);
        }
      });

      socket.addEventListener('close', () => {
        setConnectionStatus('Backend websocket disconnected');
      });

      socket.addEventListener('error', () => {
        setConnectionStatus('Backend websocket error');
      });
    };

    bootstrap();

    return () => {
      cancelled = true;
      if (socket) socket.close();
    };
  }, [httpBaseUrl, wsUrl]);

  return {
    collectorData,
    dummyData,
    envData,
    connectionStatus,
  };
};

export default useBackendTelemetry;
