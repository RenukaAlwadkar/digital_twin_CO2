const mqtt = require('mqtt');

const topic = 'ecotwin/live_prototype_data_123';
console.log('Connecting to wss://broker.emqx.io:8084/mqtt...');

const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
  clientId: `ecotwin_test_${Math.random().toString(16).slice(2, 8)}`,
});

client.on('connect', () => {
  console.log('Connected to EMQX via WSS!');
  client.subscribe(topic, (err) => {
    if (!err) {
      console.log(`Subscribed to ${topic}`);
    } else {
      console.error('Subscribe error:', err);
    }
  });
});

client.on('message', (topic, message) => {
  console.log(`Received message on ${topic}:`, message.toString());
});

client.on('error', (err) => {
  console.error('Connection error:', err);
});
