const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { rooms } = require('../store/memoryStore');

// Setup uploads path
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const roomId = req.body.roomId || req.query.roomId;
    if (!roomId) {
      return cb(new Error('Room ID is required'), null);
    }
    
    const roomPath = path.join(uploadsDir, roomId);
    
    if (!fs.existsSync(roomPath)) {
      fs.mkdirSync(roomPath, { recursive: true });
    }
    cb(null, roomPath);
  },
  filename: (req, file, cb) => {
    const sanitizedName = file.originalname.replace(/[^a-z0-9\.]/gi, '_').toLowerCase();
    cb(null, Date.now() + '-' + sanitizedName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

exports.uploadMiddleware = upload.single('file');

// Judge0 CE language ID mapping
const JUDGE0_LANG_IDS = {
    'python3': 100,       // Python 3.12.5
    'python': 100,
    'javascript': 102,    // Node.js 22.08.0
    'java': 91,           // JDK 17.0.6
    'c': 104,             // C (Clang 18.1.8)
    'cpp': 105,           // C++ (GCC 14.1.0)
    'csharp': 51,         // C# (Mono 6.6.0.161)
    'go': 107,            // Go 1.23.5
    'ruby': 72,           // Ruby 2.7.0
    'php': 98,            // PHP 8.3.11
    'rust': 108,          // Rust 1.85.0
    'typescript': 101,    // TypeScript 5.6.2
    'kotlin': 111,        // Kotlin 2.1.10
    'scala': 112,         // Scala 3.4.2
    'swift': 83,          // Swift 5.2.3
    'bash': 46,           // Bash 5.0.0
    'r': 99,              // R 4.4.1
    'dart': 90,           // Dart 2.19.2
};

const JUDGE0_API = 'https://ce.judge0.com';

// Helper: poll Judge0 for result
async function pollJudge0Result(token, maxAttempts = 20) {
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const response = await axios.get(
            `${JUDGE0_API}/submissions/${token}?base64_encoded=true&fields=stdout,stderr,compile_output,status,time,memory`
        );
        const data = response.data;
        // Status id 1 = In Queue, 2 = Processing
        if (data.status && data.status.id > 2) {
            return data;
        }
    }
    throw new Error('Execution timed out');
}

exports.runCode = async (req, res) => {
    const { code, language, stdin = '' } = req.body;

    if (!code || !language) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    const languageId = JUDGE0_LANG_IDS[language];
    if (!languageId) {
        return res.status(400).json({ error: `Unsupported language: ${language}` });
    }

    try {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');

        // Submit code to Judge0
        const submitResponse = await axios.post(
            `${JUDGE0_API}/submissions?base64_encoded=true&wait=false`,
            {
                language_id: languageId,
                source_code: Buffer.from(code).toString('base64'),
                stdin: Buffer.from(stdin).toString('base64'),
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const token = submitResponse.data.token;
        if (!token) {
            return res.status(500).json({ error: 'Failed to submit code for execution' });
        }

        // Poll for result
        const result = await pollJudge0Result(token);

        // Decode base64 outputs
        const stdout = result.stdout ? Buffer.from(result.stdout, 'base64').toString('utf-8') : '';
        const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf-8') : '';
        const compileOutput = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString('utf-8') : '';

        // Format response to match what the frontend expects
        res.json({
            run: {
                stdout: stdout,
                stderr: stderr || compileOutput,
                code: result.status?.id === 3 ? 0 : 1,
            },
            status: result.status,
            time: result.time,
            memory: result.memory,
        });
    } catch (err) {
        if (err.message === 'Execution timed out') {
            res.status(408).json({ error: 'Code execution timed out' });
        } else if (err.response?.data) {
            res.status(err.response.status || 500).json(err.response.data);
        } else {
            res.status(500).json({ error: 'Execution failed: ' + (err.message || 'Unknown error') });
        }
    }
};

exports.uploadFile = async (req, res) => {
    try {
        const roomId = req.body.roomId || req.query.roomId;
        if (!roomId) {
            return res.status(400).json({ error: 'Room ID is required' });
        }

        const room = rooms.get(roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (!room.files) {
            room.files = {};
        }
        
        const filePath = path.join(uploadsDir, roomId, req.file.filename);
        let fileContent;
        
        try {
            fileContent = fs.readFileSync(filePath, 'utf-8');
        } catch (err) {
            fileContent = '[Binary file content]';
        }

        const fileId = 'file-' + Date.now();
        
        room.files[fileId] = {
            id: fileId,
            name: req.file.originalname,
            content: fileContent,
            path: path.join(roomId, req.file.filename),
            isUploadedFile: true,
            isBinary: fileContent === '[Binary file content]'
        };
        
        // Use the io instance injected by middleware in Server.js
        req.io.to(roomId).emit('file-created', {
            fileId,
            fileName: req.file.originalname,
            content: fileContent,
            isUploadedFile: true,
            isBinary: fileContent === '[Binary file content]',
            path: path.join(roomId, req.file.filename),
            roomId
        });
        
        res.json({ 
            success: true, 
            fileId, 
            fileName: req.file.originalname,
            content: fileContent,
            isBinary: fileContent === '[Binary file content]'
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.downloadFile = (req, res) => {
    try {
        const room = rooms.get(req.params.roomId);
        if (!room) return res.status(404).send('Room not found');
        
        const file = room.files[req.params.fileId];
        if (!file) return res.status(404).send('File not found');
        
        res.setHeader('Content-disposition', `attachment; filename=${file.name}`);
        res.setHeader('Content-type', 'text/plain');
        res.send(file.content);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

exports.deleteFile = (req, res) => {
    try {
        const filePath = path.join(uploadsDir, req.params.roomId, req.params.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
