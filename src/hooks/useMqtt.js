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
      // We are connected to the cloud, but haven't received data yet
      if (topic.includes('esp32')) {
        setConnectionStatus('Waiting for ESP32 Data...');
      } else if (topic.includes('live_prototype')) {
        setConnectionStatus('Waiting for Prototype Data...');
      } else {
        setConnectionStatus('Waiting for Wokwi Data...');
      }
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
          console.log('?? [MQTT] Raw Message Received:', message.toString());
          const data = JSON.parse(message.toString());
          setSensorData(data);
          
          // Set appropriate status based on topic
          if (topic.includes('esp32')) {
            setConnectionStatus('Receiving Live ESP32 Data');
          } else if (topic.includes('live_prototype')) {
            setConnectionStatus('Receiving Live Prototype Data');
          } else {
            setConnectionStatus('Receiving Live Wokwi Data');
          }
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
