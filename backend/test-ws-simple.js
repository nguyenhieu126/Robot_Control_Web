const http = require('http');
const WebSocket = require('ws');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.send('Hello from server');
  ws.on('message', (msg) => console.log('Received:', msg.toString()));
});

server.listen(5002, () => console.log('Simple WS server on port 5002'));
