/**
 * EcoTwin — Wokwi ESP32 Prototype Node
 * =====================================
 * This code is integrated directly from the Wokwi simulation.
 * It reads DHT22 and analog sensors, then publishes JSON via MQTT.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include "DHT.h"

// ---------------- WIFI ----------------
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// ---------------- MQTT (EMQX) ----------------
const char* mqtt_server = "broker.emqx.io";
const int mqtt_port = 1883;
const char* topic = "ecotwin/live_data";

WiFiClient espClient;
PubSubClient client(espClient);

// ---------------- DHT ----------------
#define DHTPIN 15
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// ---------------- ANALOG PINS ----------------
#define CO2_PIN 34
#define CO_PIN  35

unsigned long lastMsg = 0;

// ---------------- WIFI CONNECT ----------------
void setup_wifi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✅ WiFi Connected!");
}

// ---------------- MQTT CONNECT ----------------
void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT (EMQX)...");

    String clientId = "esp32-" + String(random(1000, 9999));

    if (client.connect(clientId.c_str())) {
      Serial.println("✅ Connected!");
    } else {
      Serial.print("❌ Failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying...");
      delay(2000);
    }
  }
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("🚀 Starting System...");
  randomSeed(analogRead(0)); // Prevent MQTT Client ID collisions

  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  dht.begin();
}

// ---------------- LOOP ----------------
void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  if (millis() - lastMsg > 3000) {
    lastMsg = millis();

    // ---- SENSOR READ ----
    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();

    int co2_raw = analogRead(CO2_PIN);
    int co_raw  = analogRead(CO_PIN);

    // ---- SAFETY CHECK ----
    // If DHT22 isn't ready, it returns NAN, which breaks JSON structure.
    if (isnan(temp) || isnan(hum)) {
      Serial.println("⚠️ Warning: DHT22 sensor not ready. Skipping MQTT publish.");
      return;
    }

    // ---- CONVERSION ----
    float co2 = map(co2_raw, 0, 4095, 400, 2000);
    float co  = map(co_raw,  0, 4095, 0, 50);

    // ---- SERIAL OUTPUT ----
    Serial.println("\n===== SENSOR DATA =====");
    Serial.print("🌡 Temp: ");   Serial.print(temp);  Serial.println(" °C");
    Serial.print("💧 Hum: ");    Serial.print(hum);   Serial.println(" %");
    Serial.print("🌫 CO2: ");    Serial.print(co2);   Serial.println(" ppm");
    Serial.print("☠ CO: ");     Serial.print(co);    Serial.println(" ppm");
    Serial.println("========================");

    // ---- JSON PAYLOAD ----
    String payload = "{";
    payload += "\"node_id\":\"wokwi-esp32\",";
    payload += "\"co2\":" + String(co2) + ",";
    payload += "\"co_ppm\":" + String(co) + ",";
    payload += "\"temperature\":" + String(temp) + ",";
    payload += "\"humidity\":" + String(hum) + ",";
    payload += "\"timestamp\":" + String(millis());
    payload += "}";

    Serial.print("📡 Publishing to MQTT... ");
    if (client.publish(topic, payload.c_str())) {
      Serial.println("OK");
    } else {
      Serial.println("FAILED (check broker status)");
    }
  }
}
