#include <math.h>
#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "esp_system.h"
#include "nvs_flash.h"
#include "mqtt_client.h"
#include "protocol_examples_common.h"

static const char *TAG = "qemu_dummy_node";

#ifndef MQTT_BROKER_URI
#define MQTT_BROKER_URI "mqtt://broker.emqx.io"
#endif

#ifndef MQTT_TOPIC
#define MQTT_TOPIC "ecotwin/delhi/traffic/dummy"
#endif

#ifndef NODE_ID
#define NODE_ID "delhi-qemu-dummy-node"
#endif

#ifndef CITY_NAME
#define CITY_NAME "Delhi"
#endif

#ifndef CORRIDOR_NAME
#define CORRIDOR_NAME "QEMU Synthetic Baseline"
#endif

static esp_mqtt_client_handle_t mqtt_client = NULL;

static void mqtt_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data) {
  (void) handler_args;
  (void) base;
  (void) event_data;

  if (event_id == MQTT_EVENT_CONNECTED) {
    ESP_LOGI(TAG, "MQTT connected");
  } else if (event_id == MQTT_EVENT_DISCONNECTED) {
    ESP_LOGW(TAG, "MQTT disconnected");
  }
}

static void publisher_task(void *arg) {
  (void) arg;
  uint32_t tick = 0;
  char payload[384];

  while (1) {
    float wave = sinf((float) tick / 12.0f);
    float trafficDensity = 58.0f + wave * 18.0f;
    float averageSpeedKph = 30.0f - wave * 7.5f;
    int vehicleCount = (int) (140 + wave * 26.0f);
    float co2ppm = 920.0f + ((wave + 1.0f) * 0.5f) * 360.0f;
    float pm25 = 96.0f + ((wave + 1.0f) * 0.5f) * 48.0f;
    int aqi = (int) fminf(500.0f, fmaxf(0.0f, (pm25 * 1.35f + trafficDensity * 0.4f)));

    snprintf(
      payload,
      sizeof(payload),
      "{\"nodeId\":\"%s\",\"city\":\"%s\",\"corridor\":\"%s\",\"trafficDensity\":%.1f,\"averageSpeedKph\":%.1f,\"vehicleCount\":%d,\"co2ppm\":%.1f,\"pm25\":%.1f,\"aqi\":%d,\"incident\":false,\"timestamp\":%lu}",
      NODE_ID,
      CITY_NAME,
      CORRIDOR_NAME,
      trafficDensity,
      averageSpeedKph,
      vehicleCount,
      co2ppm,
      pm25,
      aqi,
      (unsigned long) (esp_log_timestamp())
    );

    if (mqtt_client) {
      int msg_id = esp_mqtt_client_publish(mqtt_client, MQTT_TOPIC, payload, 0, 1, 0);
      ESP_LOGI(TAG, "Published msg_id=%d: %s", msg_id, payload);
    }

    tick++;
    vTaskDelay(pdMS_TO_TICKS(3000));
  }
}

void app_main(void) {
  ESP_ERROR_CHECK(nvs_flash_init());
  ESP_ERROR_CHECK(esp_netif_init());
  ESP_ERROR_CHECK(esp_event_loop_create_default());
  ESP_ERROR_CHECK(example_connect());

  esp_mqtt_client_config_t mqtt_cfg = {
    .broker.address.uri = MQTT_BROKER_URI,
  };

  mqtt_client = esp_mqtt_client_init(&mqtt_cfg);
  esp_mqtt_client_register_event(mqtt_client, ESP_EVENT_ANY_ID, mqtt_event_handler, NULL);
  ESP_ERROR_CHECK(esp_mqtt_client_start(mqtt_client));

  xTaskCreate(publisher_task, "publisher_task", 4096, NULL, 5, NULL);
}
