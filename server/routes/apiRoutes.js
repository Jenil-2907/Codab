const express = require('express');
const router = express.Router();

const roomController = require('../controllers/roomController');
const fileController = require('../controllers/fileController');

// Room endpoints
router.post('/join-room', roomController.joinRoom);
router.post('/create-room', roomController.createRoom);

// File and Code endpoints
router.post('/run-code', fileController.runCode);
router.post('/upload-file', fileController.uploadMiddleware, fileController.uploadFile);
router.get('/download-file/:roomId/:fileId', fileController.downloadFile);
router.delete('/delete-file/:roomId/:filename', fileController.deleteFile);

module.exports = router;
