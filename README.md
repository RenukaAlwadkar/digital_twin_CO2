# Digital Twin CO2

This project is now split into two parts:

- Client frontend: React dashboard in `src/`
- Backend service: MQTT ingest + SQLite history + WebSocket live stream in `backend/`

## Architecture

- Wokwi nodes publish telemetry to MQTT topics:
	- `ecotwin/delhi/traffic/collector`
	- `ecotwin/delhi/traffic/dummy`
	- `ecotwin/delhi/env/collector`
- Backend subscribes to those topics, stores every message in SQLite, and broadcasts updates over WebSocket.
- Frontend connects to backend (not directly to MQTT) to receive live data.

## Backend capabilities

- MQTT consumer for all city topics.
- Historical storage in `backend/data/telemetry.db`.
- REST endpoints:
	- `GET /api/health`
	- `GET /api/latest`
	- `GET /api/history?limit=200&nodeId=<id>&topic=<topic>`
- WebSocket endpoint:
	- `ws://localhost:4000/ws`

## Run locally

Install dependencies:

```bash
npm install
```

Start backend (Terminal 1):

```bash
npm run start:backend
```

Start frontend (Terminal 2):

```bash
npm run start:frontend
```

Frontend runs at `http://localhost:3000` and backend at `http://localhost:4000`.

## Optional frontend environment variables

Set these in `.env` if backend is hosted elsewhere:

```bash
REACT_APP_BACKEND_HTTP_URL=http://localhost:4000
REACT_APP_BACKEND_WS_URL=ws://localhost:4000/ws
```

## Fully Local ESP32 Simulation (No Wokwi)

For a 100% local open-source simulator workflow using QEMU-ESP32 in Docker, see:

- `qemu-esp32/README.md`

Quick commands:

```bash
npm run qemu:build
npm run qemu:dummy
```
