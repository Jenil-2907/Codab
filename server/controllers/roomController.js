const { rooms, sessions } = require('../store/memoryStore');
const crypto = require('crypto');

exports.joinRoom = (req, res) => {
    const { roomId, password, userName } = req.body;
    
    if (!roomId || !password || !userName) {
        return res.status(400).json({ error: "Room ID, password and username are required!" });
    }

    if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        if (room.password !== password) {
            return res.status(401).json({ error: "Incorrect password!" });
        }
        
        const token = crypto.randomBytes(16).toString('hex');
        sessions.set(token, { roomId, userName, expiresAt: Date.now() + 86400000 });
        
        return res.status(200).json({ success: true, token, roomId });
    }
    
    return res.status(404).json({ error: "Room not found" });
};

exports.createRoom = (req, res) => {
    const { password, userName } = req.body;
    let roomId = req.body.roomId;
    
    // Support auto-generated ID if none provided
    if (!roomId) {
        if (!password || !userName) {
            return res.status(400).json({ error: "Password and username are required!" });
        }
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        do {
            roomId = '';
            for (let i = 0; i < 10; i++) {
                roomId += characters.charAt(Math.floor(Math.random() * characters.length));
            }
        } while (rooms.has(roomId));
    } else {
        if (!password || !userName) {
            return res.status(400).json({ error: "Room ID, password and username are required!" });
        }
        if (rooms.has(roomId)) {
            return res.status(409).json({ error: "Room already exists!" });
        }
    }

    const defaultFileId = 'file-' + Date.now();
    rooms.set(roomId, {
        password,
        users: [],
        files: {
            [defaultFileId]: {
                id: defaultFileId,
                name: 'main.js',
                content: ''
            }
        },
        code: ""
    });
    
    const token = crypto.randomBytes(16).toString('hex');
    sessions.set(token, { roomId, userName, expiresAt: Date.now() + 86400000 });
    
    // Return appropriate response based on whether roomId was provided
    if (req.body.roomId) {
        res.status(200).json({ success: true, token, roomId });
    } else {
        res.json({ roomId: roomId, token });
    }
};
