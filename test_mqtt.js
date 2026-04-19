const mqtt = require('mqtt');

// Test WebSocket connection
const wsClient = mqtt.connect('ws://broker.hivemq.com:8000/mqtt', { clientId: 'test_ws_' + Math.random() });
wsClient.on('connect', () => {
  console.log('WS Connected');
  wsClient.subscribe('ecotwin/renuka/sensors');
});
wsClient.on('message', (t, m) => console.log('WS Message:', m.toString()));

// Test TCP connection
const tcpClient = mqtt.connect('mqtt://broker.hivemq.com:1883', { clientId: 'test_tcp_' + Math.random() });
tcpClient.on('connect', () => {
  console.log('TCP Connected');
  tcpClient.subscribe('ecotwin/renuka/sensors');
});
tcpClient.on('message', (t, m) => console.log('TCP Message:', m.toString()));
