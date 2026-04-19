import { useState, useEffect } from 'react';
import mqtt from 'mqtt';

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
          const data = JSON.parse(message.toString());
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
        client.end();
      }
    };
  }, [topic]);

  return { sensorData, connectionStatus };
};

export default useMqtt;
