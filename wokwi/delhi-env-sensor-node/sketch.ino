#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHTesp.h>

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
const char* MQTT_BROKER = "broker.emqx.io";
const int MQTT_PORT = 1883;
const char* MQTT_TOPIC = "ecotwin/delhi/env/collector";

const int DHT_PIN = 15;
const int CO2_SIM_PIN = 34;

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
DHTesp dht;

unsigned long lastPublish = 0;
float co2Smoothed = 0;

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
		String clientId = "delhi_env_sensor_" + String((uint32_t)ESP.getEfuseMac(), HEX);
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

void publishEnvironment() {
	TempAndHumidity reading = dht.getTempAndHumidity();
	if (isnan(reading.temperature) || isnan(reading.humidity)) {
		return;
	}

	int rawCo2 = readAnalogPercent(CO2_SIM_PIN);
	co2Smoothed = (co2Smoothed * 0.72f) + (rawCo2 * 0.28f);

	float temperatureC = reading.temperature;
	float humidityPct = reading.humidity;
	float co2ppm = 420.0f + co2Smoothed * 13.8f + humidityPct * 0.9f + max(0.0f, temperatureC - 28.0f) * 9.5f;
	float pm25 = 12.0f + co2Smoothed * 1.05f + max(0.0f, humidityPct - 40.0f) * 0.58f;
	float vocIndex = 52.0f + co2Smoothed * 1.45f + max(0.0f, temperatureC - 30.0f) * 2.4f;

	char payload[320];
	snprintf(payload, sizeof(payload),
					 "{\"nodeId\":\"delhi-env-sensor-node\",\"city\":\"Delhi\",\"station\":\"ITO Sensor Pole\",\"temperatureC\":%.1f,\"humidityPct\":%.1f,\"co2ppm\":%.1f,\"pm25\":%.1f,\"vocIndex\":%.1f,\"timestamp\":%lu}",
					 temperatureC,
					 humidityPct,
					 co2ppm,
					 pm25,
					 vocIndex,
					 millis());

	mqttClient.publish(MQTT_TOPIC, payload);
	Serial.println(payload);
}

void setup() {
	Serial.begin(115200);
	pinMode(CO2_SIM_PIN, INPUT);
	dht.setup(DHT_PIN, DHTesp::DHT22);

	connectWiFi();
	mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
}

void loop() {
	if (!mqttClient.connected()) {
		connectMqtt();
	}

	mqttClient.loop();

	if (millis() - lastPublish >= 2500) {
		lastPublish = millis();
		publishEnvironment();
	}
}
