# Local ESP32 Simulation with QEMU + Docker

This folder provides a 100% local, open-source ESP32 simulation path using Espressif tooling.

## What this stack includes

- ESP-IDF in a Docker image.
- QEMU-ready container with `/dev/net/tun` and TAP bootstrap logic.
- A local ESP32 dummy node firmware (`firmware/dummy-node`) that publishes JSON to MQTT.

## Why this avoids Wokwi limits

- No cloud simulator dependencies.
- No simulator subscription usage.
- Runs fully in your local Docker environment.

## Prerequisites

- Docker Desktop with Linux containers.
- For TAP support on Windows: run Docker in WSL2 engine mode so `/dev/net/tun` is available.

## Build and enter container

From repo root:

```bash
docker compose -f qemu-esp32/docker-compose.yml build
docker compose -f qemu-esp32/docker-compose.yml run --rm qemu-esp32 bash
```

## Run the dummy node in QEMU

Inside the container shell:

```bash
/workspace/qemu-esp32/scripts/run-dummy-node.sh
```

This publishes to:

- Topic: `ecotwin/delhi/traffic/dummy`
- Broker: `mqtt://broker.emqx.io`

You can override these from compose env vars:

- `MQTT_BROKER_URI`
- `MQTT_TOPIC`
- `NODE_ID`
- `CITY_NAME`
- `CORRIDOR_NAME`

## TAP networking model

Container entrypoint tries to create:

- TAP device: `qemu0`
- CIDR: `192.168.76.1/24`
- NAT subnet: `192.168.76.0/24`

It then sets iptables MASQUERADE so the virtual ESP32 can reach internet/MQTT through container egress.

## Notes for Windows host bridging

On Docker Desktop for Windows, direct host TAP bridging from inside containers is constrained by the VM boundary.

Practical local options:

1. Use WSL2 backend and run this stack from WSL so `/dev/net/tun` works.
2. Keep the provided container NAT model (default here), which still gives outbound MQTT access without cloud simulators.

## Integrating with your backend

Your backend already subscribes to `ecotwin/delhi/traffic/dummy`, so once this QEMU node is running, live data should appear in:

- Backend websocket stream (`/ws`)
- Frontend dashboard
