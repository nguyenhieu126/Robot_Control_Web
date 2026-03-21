const http = require('http');
const WebSocket = require('ws');

const server = http.createServer();
const wss1 = new WebSocket.Server({ server, path: '/ws/robot' });
const wss2 = new WebSocket.Server({ server, path: '/ws/dashboard' });

wss1.on('connection', (ws) => {
  console.log('[/ws/robot] Connected');
  ws.send(JSON.stringify({ type: 'WELCOME', message: 'Robot endpoint' }));
});

wss2.on('connection', (ws) => {
  console.log('[/ws/dashboard] Connected');
  ws.send(JSON.stringify({ type: 'WELCOME', message: 'Dashboard endpoint' }));
});

server.listen(5001, () => {
  console.log('Test WebSocket server running on port 5001');
  console.log('Test: ws://localhost:5001/ws/robot');
  console.log('Test: ws://localhost:5001/ws/dashboard');
});
