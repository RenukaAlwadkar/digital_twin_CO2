const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'data', 'telemetry.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      node_id TEXT,
      payload_json TEXT NOT NULL,
      received_at INTEGER NOT NULL,
      device_timestamp TEXT
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_telemetry_topic ON telemetry(topic)');
  db.run('CREATE INDEX IF NOT EXISTS idx_telemetry_node_id ON telemetry(node_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_telemetry_received_at ON telemetry(received_at DESC)');
});

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onRun(error) {
    if (error) {
      reject(error);
      return;
    }
    resolve(this);
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (error, rows) => {
    if (error) {
      reject(error);
      return;
    }
    resolve(rows);
  });
});

const insertTelemetry = async ({ topic, nodeId, payload, receivedAt, deviceTimestamp }) => {
  await run(
    'INSERT INTO telemetry (topic, node_id, payload_json, received_at, device_timestamp) VALUES (?, ?, ?, ?, ?)',
    [topic, nodeId || null, JSON.stringify(payload), receivedAt, deviceTimestamp == null ? null : String(deviceTimestamp)]
  );
};

const getHistory = async ({ topic, nodeId, limit = 200 }) => {
  const where = [];
  const params = [];

  if (topic) {
    where.push('topic = ?');
    params.push(topic);
  }

  if (nodeId) {
    where.push('node_id = ?');
    params.push(nodeId);
  }

  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(1000, Number(limit))) : 200;

  const query = `
    SELECT id, topic, node_id as nodeId, payload_json as payloadJson, received_at as receivedAt, device_timestamp as deviceTimestamp
    FROM telemetry
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY id DESC
    LIMIT ?
  `;

  const rows = await all(query, [...params, safeLimit]);
  return rows.map((row) => {
    let payload = null;
    try {
      payload = JSON.parse(row.payloadJson);
    } catch (_error) {
      payload = null;
    }

    return {
      id: row.id,
      topic: row.topic,
      nodeId: row.nodeId,
      payload,
      receivedAt: row.receivedAt,
      deviceTimestamp: row.deviceTimestamp,
    };
  });
};

module.exports = {
  insertTelemetry,
  getHistory,
};
