import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  doc,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';

// ─────────────────────────────────────────────
// COLLECTIONS
// ─────────────────────────────────────────────
const TELEMETRY_COL   = 'telemetry';     // city weather + AQI snapshots
const SIMULATIONS_COL = 'simulations';  // what-if run results

// ── Connection test ──────────────────────────
// Writes a tiny heartbeat doc to verify Firestore is reachable
export const testFirestoreConnection = async () => {
  try {
    await setDoc(doc(db, '_health', 'ping'), {
      ts: serverTimestamp(),
      app: 'ecotwin',
    });
    console.log('✅ [Firestore] Connection OK — database is reachable!');
    return true;
  } catch (err) {
    console.error('❌ [Firestore] Connection FAILED:', err.code, err.message);
    return false;
  }
};

// ─────────────────────────────────────────────
// TELEMETRY — Save a city snapshot
// ─────────────────────────────────────────────

/**
 * Save real-time city data snapshot to Firestore.
 * @param {string} cityId   - e.g. 'wardha', 'delhi', 'mumbai'
 * @param {string} cityName - Human readable city name
 * @param {object} data     - City node data (temp, aqi, pm2_5, co2, etc.)
 */
export const saveCityTelemetry = async (cityId, cityName, data) => {
  try {
    await addDoc(collection(db, TELEMETRY_COL), {
      cityId,
      cityName,
      timestamp: serverTimestamp(),
      temperature:  data.temperature  ?? null,
      humidity:     data.humidity     ?? null,
      wind_speed:   data.wind_speed   ?? null,
      aqi:          data.aqi          ?? null,
      pm2_5:        data.pm2_5        ?? null,
      pm10:         data.pm10         ?? null,
      no2:          data.no2          ?? null,
      so2:          data.so2          ?? null,
      o3:           data.o3           ?? null,
      co:           data.co           ?? null,
      co2ppm:       data.co2ppm       ?? null,
      weatherDesc:  data.weatherDesc  ?? '',
      pressure:     data.pressure     ?? null,
    });
    console.log(`🔥 [Firestore] Saved telemetry for ${cityName}`);
  } catch (err) {
    console.error(`❌ [Firestore] Failed to save telemetry for ${cityName}:`, err.message);
  }
};

/**
 * Fetch the most recent telemetry snapshots from Firestore.
 * @param {number} maxRecords - How many records to return (default 100)
 * @returns {Array}
 */
export const getTelemetryHistory = async (maxRecords = 100) => {
  try {
    const q = query(
      collection(db, TELEMETRY_COL),
      orderBy('timestamp', 'desc'),
      limit(maxRecords)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('❌ [Firestore] Failed to fetch telemetry history:', err.message);
    return [];
  }
};

/**
 * Subscribe to real-time telemetry updates from Firestore.
 * @param {function} callback - Called with the latest records array whenever data changes
 * @param {number} maxRecords
 * @returns {function} Unsubscribe function
 */
export const subscribeTelemetry = (callback, maxRecords = 50) => {
  const q = query(
    collection(db, TELEMETRY_COL),
    orderBy('timestamp', 'desc'),
    limit(maxRecords)
  );
  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(records);
  }, (err) => {
    console.error('❌ [Firestore] Telemetry listener error:', err.message);
  });
};

// ─────────────────────────────────────────────
// SIMULATIONS — Save What-If run
// ─────────────────────────────────────────────

/**
 * Save a What-If simulation result to Firestore.
 * @param {object} result - Simulation result from FastAPI /simulate endpoint
 * @param {object} params - The input parameters used (traffic, wind, etc.)
 */
export const saveSimulation = async (result, params) => {
  try {
    await addDoc(collection(db, SIMULATIONS_COL), {
      timestamp:           serverTimestamp(),
      base_co2:            result.base_co2        ?? null,
      new_co2:             result.new_co2         ?? null,
      change_percent:      result.change_percent  ?? null,
      impact:              result.impact          ?? '',
      traffic_level:       params.traffic_level       ?? '',
      green_cover_increase: params.green_cover_increase ?? 0,
      wind_speed_change:   params.wind_speed_change    ?? 0,
      industrial_emissions: params.industrial_emissions ?? 0,
    });
    console.log('🔥 [Firestore] Saved simulation result');
  } catch (err) {
    console.error('❌ [Firestore] Failed to save simulation:', err.message);
  }
};

/**
 * Fetch the most recent simulation runs from Firestore.
 * @param {number} maxRecords
 * @returns {Array}
 */
export const getSimulationHistory = async (maxRecords = 20) => {
  try {
    const q = query(
      collection(db, SIMULATIONS_COL),
      orderBy('timestamp', 'desc'),
      limit(maxRecords)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('❌ [Firestore] Failed to fetch simulation history:', err.message);
    return [];
  }
};

/**
 * Subscribe to real-time simulation history from Firestore.
 * @param {function} callback
 * @param {number} maxRecords
 * @returns {function} Unsubscribe function
 */
export const subscribeSimulations = (callback, maxRecords = 10) => {
  const q = query(
    collection(db, SIMULATIONS_COL),
    orderBy('timestamp', 'desc'),
    limit(maxRecords)
  );
  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(records);
  }, (err) => {
    console.error('❌ [Firestore] Simulation listener error:', err.message);
  });
};
