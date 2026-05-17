import { useState, useEffect, useRef, useCallback } from 'react';
import useMqtt from './useMqtt';
import { saveWokwiReading } from '../services/firestoreService';

const TOPIC = 'ecotwin/live_data';
const MAX_HISTORY = 30;

/**
 * useWokwi — Consumes the Wokwi ESP32 prototype MQTT stream.
 *
 * Returns:
 *  - reading        : latest parsed sensor snapshot
 *  - history        : last N readings (for sparklines)
 *  - connectionStatus : raw MQTT status string
 *  - isLive         : boolean — true when fresh data is arriving
 */
const useWokwi = () => {
  const { sensorData, connectionStatus } = useMqtt(TOPIC);
  const [reading, setReading]   = useState(null);
  const [history, setHistory]   = useState([]);
  const isLive = connectionStatus === 'Receiving Live Wokwi Data';

  const prevTimestamp = useRef(null);

  const handleNewData = useCallback((raw) => {
    if (!raw) return;

    // Deduplicate by timestamp
    if (raw.timestamp === prevTimestamp.current) return;
    prevTimestamp.current = raw.timestamp;

    const snapshot = {
      nodeId:      raw.node_id      ?? 'live-prototype-node',
      co2_ppm:     Number(raw.co2)      ?? null,
      co_ppm:      Number(raw.co_ppm)   ?? null,
      temperature: Number(raw.temperature) ?? null,
      humidity:    Number(raw.humidity)    ?? null,
      receivedAt:  Date.now(),
    };

    setReading(snapshot);
    setHistory(prev => [...prev.slice(-(MAX_HISTORY - 1)), snapshot]);

    // Persist to Firestore (fire-and-forget, errors are logged inside)
    saveWokwiReading(snapshot).catch(() => {});
  }, []);

  useEffect(() => {
    handleNewData(sensorData);
  }, [sensorData, handleNewData]);

  return { reading, history, connectionStatus, isLive };
};

export default useWokwi;
