const mqtt = require('mqtt');

const topics = [
  'ecotwin/delhi/traffic/collector',
  'ecotwin/delhi/traffic/dummy',
];

// Test WebSocket connection
const wsClient = mqtt.connect('ws://broker.hivemq.com:8000/mqtt', { clientId: 'test_ws_' + Math.random() });
wsClient.on('connect', () => {
  console.log('WS Connected');
  wsClient.subscribe(topics);
});
wsClient.on('message', (t, m) => console.log('WS Message:', m.toString()));

// Test TCP connection
const tcpClient = mqtt.connect('mqtt://broker.hivemq.com:1883', { clientId: 'test_tcp_' + Math.random() });
tcpClient.on('connect', () => {
  console.log('TCP Connected');
  tcpClient.subscribe(topics);
});
tcpClient.on('message', (t, m) => console.log('TCP Message:', m.toString()));
