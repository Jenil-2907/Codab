const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require('path');
const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

const apiRoutes = require('./server/routes/apiRoutes');
const socketHandler = require('./server/sockets/socketHandler');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());
app.use(cors());

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Inject io into request object for controllers to use
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Use API Routes
app.use('/', apiRoutes);

// Initialize Socket event handlers
socketHandler(io);

// Yjs WebSocket setup on a separate port to avoid conflict with Socket.io
const yjsServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Yjs WebSocket Server');
});
const wss = new WebSocket.Server({ server: yjsServer });
wss.on('connection', setupWSConnection);

const YJS_PORT = process.env.YJS_PORT || 3001;
yjsServer.listen(YJS_PORT, '0.0.0.0', () => {
  console.log(`Yjs WebSocket server running on port ${YJS_PORT}`);
});

// Start the main server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});