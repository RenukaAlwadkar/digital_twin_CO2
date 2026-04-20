#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
const char* MQTT_BROKER = "broker.emqx.io";
const int MQTT_PORT = 1883;
const char* MQTT_TOPIC = "ecotwin/delhi/traffic/collector";

const int TRAFFIC_PIN = 34;
const int SPEED_PIN = 35;
const int POLLUTION_PIN = 32;
const int INCIDENT_PIN = 0;

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

unsigned long lastPublish = 0;
float trafficSmoothed = 0;
float speedSmoothed = 0;
float pollutionSmoothed = 0;

int readAnalogPercent(int pin) {
  return map(analogRead(pin), 0, 4095, 0, 100);
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print('.');
  }
  Serial.println();
  Serial.println("WiFi connected");
}

void connectMqtt() {
  while (!mqttClient.connected()) {
    String clientId = "delhi_traffic_collector_" + String((uint32_t)ESP.getEfuseMac(), HEX);
    Serial.print("Connecting MQTT...");
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retrying");
      delay(1000);
    }
  }
}

void publishTraffic() {
  int rawTraffic = readAnalogPercent(TRAFFIC_PIN);
  int rawSpeed = readAnalogPercent(SPEED_PIN);
  int rawPollution = readAnalogPercent(POLLUTION_PIN);
  bool incident = digitalRead(INCIDENT_PIN) == LOW;

  trafficSmoothed = (trafficSmoothed * 0.7f) + (rawTraffic * 0.3f);
  speedSmoothed = (speedSmoothed * 0.7f) + (rawSpeed * 0.3f);
  pollutionSmoothed = (pollutionSmoothed * 0.7f) + (rawPollution * 0.3f);

  float trafficDensity = trafficSmoothed;
  float averageSpeedKph = 8.0f + (speedSmoothed / 100.0f) * 62.0f;
  float pollutionPressure = pollutionSmoothed;

  if (incident) {
    averageSpeedKph *= 0.52f;
    trafficDensity = min(100.0f, trafficDensity + 14.0f);
  }

  int vehicleCount = (int)(24 + trafficDensity * 3.9f + (incident ? 36 : 0));
  float co2ppm = 430.0f + trafficDensity * 14.5f + (62.0f - averageSpeedKph) * 11.0f + pollutionPressure * 3.1f + (incident ? 160.0f : 0.0f);
  float pm25 = 18.0f + trafficDensity * 1.6f + (62.0f - averageSpeedKph) * 1.7f + pollutionPressure * 1.4f + (incident ? 28.0f : 0.0f);
  int aqi = constrain((int)(pm25 * 1.45f + trafficDensity * 0.45f), 0, 500);

  char payload[384];
  snprintf(payload, sizeof(payload),
           "{\"nodeId\":\"delhi-traffic-collector\",\"city\":\"Delhi\",\"corridor\":\"Ring Road\",\"trafficDensity\":%.1f,\"averageSpeedKph\":%.1f,\"vehicleCount\":%d,\"co2ppm\":%.1f,\"pm25\":%.1f,\"aqi\":%d,\"incident\":%s,\"timestamp\":%lu}",
           trafficDensity,
           averageSpeedKph,
           vehicleCount,
           co2ppm,
           pm25,
           aqi,
           incident ? "true" : "false",
           millis());

  mqttClient.publish(MQTT_TOPIC, payload);
  Serial.println(payload);
}

void setup() {
  Serial.begin(115200);
  pinMode(TRAFFIC_PIN, INPUT);
  pinMode(SPEED_PIN, INPUT);
  pinMode(POLLUTION_PIN, INPUT);
  pinMode(INCIDENT_PIN, INPUT_PULLUP);

  connectWiFi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  randomSeed(esp_random());
}

void loop() {
  if (!mqttClient.connected()) {
    connectMqtt();
  }

  mqttClient.loop();

  if (millis() - lastPublish >= 2000) {
    lastPublish = millis();
    publishTraffic();
  }
}
