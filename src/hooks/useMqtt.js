import { useState, useEffect } from 'react';
import mqtt from 'mqtt';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizePayload = (payload = {}) => {
  const temperatureC = toNumber(payload.temperatureC ?? payload.temperature ?? payload.temp);
  const humidityPct = toNumber(payload.humidityPct ?? payload.humidity ?? payload.hum);
  const pm25 = toNumber(payload.pm25 ?? payload.pm2_5 ?? payload.pm2_5_value ?? payload.pm_25);
  const co2ppm = toNumber(payload.co2ppm ?? payload.co2 ?? payload.co_ppm);

  return {
    ...payload,
    nodeId: payload.nodeId ?? payload.node_id ?? payload.id ?? null,
    id: payload.id ?? payload.nodeId ?? payload.node_id ?? null,
    co2ppm,
    co2: toNumber(payload.co2),
    co_ppm: toNumber(payload.co_ppm),
    temperatureC,
    temperature: temperatureC,
    humidityPct,
    humidity: humidityPct,
    pm25,
    pm2_5: pm25,
    timestamp: toNumber(payload.timestamp) ?? payload.timestamp ?? Date.now(),
  };
};

const useMqtt = (topic) => {
  const [sensorData, setSensorData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting to Cloud...');

  useEffect(() => {
    // Using EMQX public broker
    const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
      clientId: `ecotwin_react_${Math.random().toString(16).slice(2, 8)}`,
      keepalive: 30,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
    });

    client.on('connect', () => {
      // We are connected to the cloud, but haven't received Wokwi data yet
      setConnectionStatus('Waiting for Wokwi Data...');
      client.subscribe(topic, (err) => {
        if (err) {
          console.error('Subscription error:', err);
        } else {
          console.log(`Subscribed to topic: ${topic}`);
        }
      });
    });

    client.on('message', (receivedTopic, message) => {
      if (receivedTopic === topic) {
        try {
          console.log('📡 [MQTT] Raw Message Received:', message.toString());
          const data = normalizePayload(JSON.parse(message.toString()));
          setSensorData(data);
          // Once we get a message, Wokwi is definitely connected
          setConnectionStatus('Receiving Live Wokwi Data');
        } catch (e) {
          console.error('Failed to parse MQTT message as JSON:', message.toString());
        }
      }
    });

    client.on('error', (err) => {
      console.error('MQTT Connection error: ', err);
      setConnectionStatus('Cloud Connection Error');
      client.end();
    });

    client.on('offline', () => {
      setConnectionStatus('Offline');
    });

    return () => {
      if (client) {
        if (topic && client.connected) {
          client.unsubscribe(topic);
        }
        client.end();
      }
    };
  }, [topic]);

  return { sensorData, connectionStatus };
};

export default useMqtt;
