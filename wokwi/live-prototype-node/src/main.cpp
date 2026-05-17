#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// WiFi credentials for Wokwi
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// EMQX MQTT Broker settings
const char* mqtt_server = "broker.emqx.io";
const int mqtt_port = 1883;
const char* mqtt_topic = "ecotwin/live_data";

// Sensor setup
#define DHTPIN 15
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;
float base_co2 = 420.0; // Base outdoor CO2

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32Client-EcoTwin-";
    clientId += String(random(0, 1000));
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  dht.begin();
  randomSeed(analogRead(0));
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > 3000) { // Publish every 3 seconds
    lastMsg = now;

    // Read DHT22
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    // Check if any reads failed
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("Failed to read from DHT sensor!");
      return;
    }

    // Simulate CO2
    // CO2 fluctuates based on random noise and slight temperature influence
    float co2_noise = random(-15, 20);
    float simulated_co2 = base_co2 + co2_noise + (temperature > 30 ? 15 : 0);
    float simulated_pm25 = 10.0 + random(0, 30) + max(0.0f, temperature - 25.0f) * 0.6f + max(0.0f, humidity - 40.0f) * 0.25f;

    // Create JSON Payload for the single live topic.
    StaticJsonDocument<200> doc;
    doc["nodeId"] = "wokwi-esp32";
    doc["id"] = "wokwi-esp32";
    doc["co2ppm"] = simulated_co2;
    doc["temperatureC"] = temperature;
    doc["humidityPct"] = humidity;
    doc["pm25"] = simulated_pm25;
    doc["co2"] = simulated_co2;
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    doc["pm2_5"] = simulated_pm25;
    doc["topic"] = mqtt_topic;
    
    // Add fake timestamp for simulation purposes (Wokwi doesn't have an RTC out of the box)
    // In real hardware, use an NTP client
    doc["timestamp"] = now; 

    char output[200];
    serializeJson(doc, output);

    Serial.print("Publishing message: ");
    Serial.println(output);
    
    client.publish(mqtt_topic, output);
  }
}
