# Wokwi Delhi Traffic Nodes

This folder contains three ESP32 examples for the digital twin:

- `delhi-traffic-collector`: the example hardware node that reads live inputs and publishes Delhi traffic telemetry.
- `delhi-dummy-node`: a synthetic baseline node that publishes background traffic data for comparison.
- `delhi-env-sensor-node`: an environmental node that publishes temperature, humidity, CO2 and PM2.5 style telemetry.

## MQTT topics

- Collector: `ecotwin/delhi/traffic/collector`
- Dummy baseline: `ecotwin/delhi/traffic/dummy`
- Environmental sensor: `ecotwin/delhi/env/collector`

## Payload shape

Traffic nodes publish JSON with fields similar to:

```json
{
  "nodeId": "delhi-traffic-collector",
  "city": "Delhi",
  "corridor": "Ring Road",
  "trafficDensity": 78,
  "averageSpeedKph": 24.5,
  "vehicleCount": 186,
  "co2ppm": 1840.2,
  "pm25": 152.3,
  "aqi": 178,
  "incident": false,
  "timestamp": 12345678
}
```

## How to use in Wokwi

1. Create a new ESP32 project in Wokwi.
2. Replace the code with the `sketch.ino` file from one of the folders.
3. Copy the matching `diagram.json` into the project.
4. Run the simulation with WiFi network `Wokwi-GUEST`.
5. Keep the app subscribed to the topics above.

The collector node uses three potentiometers as traffic controls:

- traffic density
- average speed
- pollution pressure

The dummy node publishes a moving synthetic baseline without any sensors.

The environmental sensor node uses:

- `wokwi-dht22` for temperature and humidity
- one potentiometer to simulate local CO2 pressure

It publishes a payload like:

```json
{
  "nodeId": "delhi-env-sensor-node",
  "city": "Delhi",
  "station": "ITO Sensor Pole",
  "temperatureC": 33.4,
  "humidityPct": 58.1,
  "co2ppm": 1140.2,
  "pm25": 84.6,
  "vocIndex": 142.5,
  "timestamp": 12345678
}
```
