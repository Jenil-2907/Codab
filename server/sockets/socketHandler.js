const { rooms, roomCanvasStates, sessions } = require('../store/memoryStore');

module.exports = (io) => {
    io.on("connection", (socket) => {
        console.log("A new user connected: " + socket.id);

        socket.on('join-room', (roomId, userName, token) => {
            try {
                // 1. Session Token Security Check
                const session = sessions.get(token);
                if (!session || session.roomId !== roomId || session.userName !== userName) {
                    console.error(`Unauthorized connection attempt for room ${roomId} by ${userName}`);
                    socket.emit('error', 'Unauthorized: Invalid or expired session token.');
                    socket.disconnect();
                    return;
                }

                // 2. Validate Room Exists (Only APIs can create rooms now)
                if (!rooms.has(roomId)) {
                    console.error(`Room ${roomId} does not exist in memory store.`);
                    socket.emit('error', 'Room no longer exists or never did.');
                    socket.disconnect();
                    return;
                }

                socket.join(roomId);
                console.log(`Authenticated User ${userName} joined room: ${roomId}`);
        
                const room = rooms.get(roomId);
                
                // Initialize files object safely
                if (!room.files) {
                    room.files = {};
                }

                const state = roomCanvasStates.get(roomId) || { strokes: [] };
                socket.emit('load-strokes', state.strokes);
        
                // Add user to room if not already present
                const userExists = room.users.some(u => u.id === socket.id);
                if (!userExists) {
                    room.users.push({ id: socket.id, name: userName });
                }
        
                // Send complete room state to the joining user
                socket.emit('room-state', {
                    files: room.files,
                    users: room.users.map(u => ({ id: u.id, name: u.name }))
                });
        
                // Notify others about new user (except the joining user)
                if (!userExists) {
                    socket.to(roomId).emit('message', `${userName} joined the room`);
                    socket.to(roomId).emit('user-joined', { 
                        userId: socket.id, 
                        userName 
                    });
                    
                    // Update user list for everyone except the joining user
                    socket.to(roomId).emit('user-list', room.users.map(u => ({ 
                        id: u.id, 
                        name: u.name 
                    })));
                }
        
            } catch (error) {
                console.error('Error in join-room:', error);
                socket.emit('error', 'Failed to join room');
            }
        });

        socket.on('drawing', (data) => {
            try {
                if (!roomCanvasStates.has(data.roomId)) {
                    roomCanvasStates.set(data.roomId, {
                        strokes: []
                    });
                }
                // Store the stroke with tool information
                roomCanvasStates.get(data.roomId).strokes.push({
                    startX: data.startX,
                    startY: data.startY,
                    endX: data.endX,
                    endY: data.endY,
                    color: data.color,
                    size: data.size,
                    tool: data.tool
                });
                socket.to(data.roomId).emit('drawing', data);
            } catch (error) {
                console.error('Error handling drawing event:', error);
            }
        });
        
        socket.on('clear-canvas', (data) => {
            try {
                if (roomCanvasStates.has(data.roomId)) {
                    roomCanvasStates.delete(data.roomId);
                }
                socket.to(data.roomId).emit('clear-canvas', data);
            } catch (error) {
                console.error('Error handling clear-canvas event:', error);
            }
        });

        socket.on('request-canvas-state', (roomId) => {
            try {
                if (roomCanvasStates.has(roomId)) {
                    socket.emit('canvas-state', {
                        roomId,
                        strokes: roomCanvasStates.get(roomId).strokes
                    });
                }
            } catch (error) {
                console.error('Error handling canvas state request:', error);
            }
        });

        socket.on('file-created', (data) => {
            try {
                const room = rooms.get(data.roomId);
                if (!room) return;

                if (!room.files) room.files = {};

                if (!room.files[data.fileId]) {
                    room.files[data.fileId] = {
                        id: data.fileId,
                        name: data.fileName,
                        content: ''
                    };
                    socket.to(data.roomId).emit('file-created', {
                        fileId: data.fileId,
                        fileName: data.fileName
                    });
                }
            } catch (error) {
                console.error('Error in file-created:', error);
            }
        });

        socket.on('file-update', (data) => {
            // Deprecated: File content synchronization is now handled natively via y-websocket CRDTs 
            // over the /yjs WebSocket route. This socket.io event is no longer necessary.
        });

        socket.on('file-deleted', (data) => {
            try {
                const room = rooms.get(data.roomId);
                if (room && room.files && room.files[data.fileId]) {
                    delete room.files[data.fileId];
                    socket.to(data.roomId).emit('file-closed', {
                        roomId: data.roomId,
                        fileId: data.fileId
                    });
                }
            } catch (error) {
                console.error('Error in file-deleted:', error);
            }
        });

        socket.on('chat-message', ({ roomId, message, sender }) => {
            io.to(roomId).emit('chat-message', { message, sender });
        });
        
        socket.on('disconnect', () => {
            console.log('User disconnected', socket.id);

            for (const [roomId, room] of rooms) {
                const userIndex = room.users.findIndex(u => u.id === socket.id);
                if (userIndex !== -1) {
                    const userName = room.users[userIndex].name;
                    room.users.splice(userIndex, 1);

                    io.to(roomId).emit('message', `${userName} left the room`);
                    io.to(roomId).emit('user-left', { userId: socket.id, userName });
                    io.to(roomId).emit('user-list', room.users.map(u => ({ id: u.id, name: u.name })));

                    if (room.users.length === 0) {
                        rooms.delete(roomId);
                        roomCanvasStates.delete(roomId);
                        console.log(`Room ${roomId} deleted because it's empty.`);
                    }

                    break;
                }
            }
        });

    });
};
