<div align="center">

# Codab

### Real-time collaborative coding, reimagined.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?logo=socket.io)](https://socket.io/)

**Codab** is a lightweight, zero-signup collaborative platform that lets developers write, run, and sketch together in real time — right in the browser.

[Getting Started](#-getting-started) · [Features](#-features) · [Architecture](#-architecture) · [Contributing](#-contributing)

</div>

---

##  Why Codab?

Most collaborative tools force you through lengthy sign-up flows, heavy IDE installs, or clunky integrations. **Codab strips all of that away.** Generate a room, share the ID, and start coding together in seconds.

- **No accounts, no friction** — just a room ID and you're in.
- **Real-time pair programming** powered by [Yjs](https://yjs.dev/) CRDT synchronization.
- **Full-featured Monaco editor** with syntax highlighting, multi-language support, and live execution.
- **Built-in tools** — chat, collaborative whiteboard, and file management — so you never have to context-switch.

---

##  Features

| Feature | Description |
|---|---|
| **Collaborative Code Editor** | Monaco-powered editor with real-time cursor sync via Yjs WebSocket bindings. Write Python, JavaScript, C++, and more. |
| **Live Code Execution** | Compile and run code directly in the browser with instant output. |
| **Collaborative Canvas** | Shared drawing board for sketching architecture diagrams, flowcharts, and quick notes alongside your code. |
| **Integrated Chat** | Low-latency, socket-driven messaging within each room — no tab-switching required. |
| **File Upload & Download** | Upload reference files to the room or download collaborative work at any time. |
| **Room Management** | Create password-protected rooms or join existing ones with a simple room ID. |
| **Voice Chat** *(Coming Soon)* | Built-in voice channels for seamless verbal communication without leaving the workspace. |

---

## 🏗 Architecture

```
codab/
├── Server.js                 # Express + Socket.IO + Yjs WebSocket server
├── server/
│   ├── controllers/
│   │   ├── roomController.js # Room creation & join logic
│   │   └── fileController.js # File upload/download handling (Multer)
│   ├── routes/
│   │   └── apiRoutes.js      # REST API route definitions
│   ├── sockets/
│   │   └── socketHandler.js  # Socket.IO event handlers (chat, draw, sync)
│   └── store/                # In-memory room/session state
├── public/
│   ├── index.html            # Landing page
│   ├── room.html             # Collaborative workspace
│   ├── css/                  # Stylesheets
│   └── js/
│       ├── Script.js         # Landing page logic
│       ├── room.js           # Room initialization & editor setup
│       ├── modules/
│       │   ├── chat.js       # Chat UI module
│       │   ├── drawing.js    # Canvas drawing module
│       │   └── ui.js         # UI state management
│       └── utils/            # Shared utility functions
└── uploads/                  # Temporary file storage (gitignored)
```

**Key design decisions:**

- **Yjs + WebSocket** for conflict-free real-time document synchronization (CRDT-based), enabling true multi-cursor editing.
- **Socket.IO** handles all non-document events — chat messages, drawing strokes, room presence, and file notifications.
- **Modular frontend** — each concern (chat, drawing, UI) is isolated into its own ES module for maintainability.

---

##  Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js |
| **Server** | Express 4 |
| **Real-time Sync** | Yjs + y-websocket (CRDT) |
| **Events & Messaging** | Socket.IO 4 |
| **Code Editor** | Monaco Editor |
| **File Uploads** | Multer |
| **WebSocket** | ws |
| **Bundler** | Webpack 5 *(dev)* |

---

## 📦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (included with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/Jenil-2907/Codab.git
cd codab

# Install dependencies
npm install

# Start the development server
npm start
```

The application will be available at **`http://localhost:3000`**.

### Quick Start

1. Open the app and click **Generate New Room** to create a session.
2. Share the **Room ID** and **password** with collaborators.
3. Start coding, chatting, and sketching together in real time.

---

##  Contributing

Contributions are welcome! Whether it's a bug fix, a new feature, or documentation improvements — all PRs are appreciated.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m "Add your feature"`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

Please open an [issue](https://github.com/Jenil-2907/Codab/issues) first for major changes to discuss the approach.

---

##  License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ☕ and WebSockets by [Jenil](https://github.com/Jenil-2907)

</div>
