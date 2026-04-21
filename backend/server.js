const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const { WebSocketServer } = require('ws');
const { insertTelemetry, getHistory } = require('./db');

const HTTP_PORT = Number(process.env.BACKEND_PORT || 4000);
const MQTT_URL = process.env.MQTT_URL || 'mqtt://broker.emqx.io:1883';
const MQTT_TOPICS = [
  'ecotwin/delhi/traffic/collector',
  'ecotwin/delhi/traffic/dummy',
  'ecotwin/delhi/env/collector',
];

const app = express();
app.use(cors());
app.use(express.json());

const latestByTopic = {};
const latestByNode = {};

const normalizeNodeId = (payload = {}) => {
  const value = String(payload.nodeId || payload.id || '').trim();
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
};

const normalizePayload = (topic, parsedPayload) => {
  const receivedAt = Date.now();
  const nodeId = normalizeNodeId(parsedPayload);
  const deviceTimestamp = parsedPayload?.timestamp ?? null;

  return {
    ...parsedPayload,
    topic,
    nodeId,
    timestamp: receivedAt,
    receivedAt,
    deviceTimestamp,
  };
};

const server = app.listen(HTTP_PORT, () => {
  console.log(`Backend listening on http://localhost:${HTTP_PORT}`);
});

const wsServer = new WebSocketServer({ server, path: '/ws' });

const broadcast = (message) => {
  const serialized = JSON.stringify(message);

  wsServer.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(serialized);
    }
  });
};

wsServer.on('connection', (socket) => {
  socket.send(JSON.stringify({
    type: 'snapshot',
    data: {
      byTopic: latestByTopic,
      byNode: latestByNode,
    },
  }));
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'digital_twin_backend', now: Date.now() });
});

app.get('/api/latest', (_req, res) => {
  res.json({
    byTopic: latestByTopic,
    byNode: latestByNode,
    updatedAt: Date.now(),
  });
});

app.get('/api/history', async (req, res) => {
  try {
    const history = await getHistory({
      topic: req.query.topic,
      nodeId: req.query.nodeId,
      limit: req.query.limit,
    });

    res.json({
      count: history.length,
      items: history,
    });
  } catch (error) {
    console.error('Failed to fetch history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

const mqttClient = mqtt.connect(MQTT_URL, {
  clientId: `ecotwin_backend_${Math.random().toString(16).slice(2, 10)}`,
  reconnectPeriod: 1000,
  connectTimeout: 30_000,
  keepalive: 30,
});

mqttClient.on('connect', () => {
  console.log(`Connected to MQTT broker: ${MQTT_URL}`);
  mqttClient.subscribe(MQTT_TOPICS, (error) => {
    if (error) {
      console.error('MQTT subscription failed:', error);
      return;
    }
    console.log(`Subscribed to topics: ${MQTT_TOPICS.join(', ')}`);
  });
});

mqttClient.on('message', async (topic, payloadBuffer) => {
  const raw = payloadBuffer.toString();

  try {
    const parsed = JSON.parse(raw);
    const normalized = normalizePayload(topic, parsed);

    latestByTopic[topic] = normalized;
    if (normalized.nodeId) {
      latestByNode[normalized.nodeId] = normalized;
    }

    await insertTelemetry({
      topic,
      nodeId: normalized.nodeId,
      payload: normalized,
      receivedAt: normalized.receivedAt,
      deviceTimestamp: normalized.deviceTimestamp,
    });

    broadcast({
      type: 'telemetry:update',
      data: normalized,
    });
  } catch (error) {
    console.error('Failed to process MQTT message:', error.message);
  }
});

mqttClient.on('error', (error) => {
  console.error('MQTT error:', error.message);
});

process.on('SIGINT', () => {
  console.log('Shutting down backend...');
  mqttClient.end(true, () => {
    server.close(() => process.exit(0));
  });
});
