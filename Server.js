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

const io = new Server({
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
io.attach(server);  // attaches HTTP polling transport

// Yjs WebSocket setup (noServer mode)
const wss = new WebSocket.Server({ noServer: true });
wss.on('connection', setupWSConnection);

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;

  if (pathname.startsWith('/yjs')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
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

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});