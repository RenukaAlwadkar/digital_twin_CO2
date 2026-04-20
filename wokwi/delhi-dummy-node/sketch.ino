#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
const char* MQTT_BROKER = "broker.emqx.io";
const int MQTT_PORT = 1883;
const char* MQTT_TOPIC = "ecotwin/delhi/traffic/dummy";

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

unsigned long lastPublish = 0;

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
    String clientId = "delhi_dummy_node_" + String((uint32_t)ESP.getEfuseMac(), HEX);
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

void publishBaseline() {
  float wave = sin(millis() / 12000.0f);
  float trafficDensity = 58.0f + wave * 18.0f;
  float averageSpeedKph = 30.0f - wave * 7.5f;
  int vehicleCount = (int)(140 + wave * 26.0f);
  float co2ppm = 920.0f + ((wave + 1.0f) * 0.5f) * 360.0f;
  float pm25 = 96.0f + ((wave + 1.0f) * 0.5f) * 48.0f;
  int aqi = constrain((int)(pm25 * 1.35f + trafficDensity * 0.4f), 0, 500);

  char payload[320];
  snprintf(payload, sizeof(payload),
           "{\"nodeId\":\"delhi-dummy-node\",\"city\":\"Delhi\",\"corridor\":\"Synthetic Baseline\",\"trafficDensity\":%.1f,\"averageSpeedKph\":%.1f,\"vehicleCount\":%d,\"co2ppm\":%.1f,\"pm25\":%.1f,\"aqi\":%d,\"incident\":false,\"timestamp\":%lu}",
           trafficDensity,
           averageSpeedKph,
           vehicleCount,
           co2ppm,
           pm25,
           aqi,
           millis());

  mqttClient.publish(MQTT_TOPIC, payload);
  Serial.println(payload);
}

void setup() {
  Serial.begin(115200);
  connectWiFi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
}

void loop() {
  if (!mqttClient.connected()) {
    connectMqtt();
  }

  mqttClient.loop();

  if (millis() - lastPublish >= 3000) {
    lastPublish = millis();
    publishBaseline();
  }
}
