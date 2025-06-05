const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const searchService = require('../services/searchService');

/* ───────────────────────────── Upload Routes ─────────────────────────────── */

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create the upload directory once per request
    if (!req.uploadDir) {
      const baseUploadPath = process.env.SEARCH_UPLOADS_DIR || '/ceph/ibmi/tgm/bgc-atlas/search/uploads';
      req.uploadDir = searchService.createTimestampedDirectory(baseUploadPath);
    }
    cb(null, req.uploadDir);
  },
  filename: function (req, file, cb) {
    let safeName = path.basename(file.originalname);
    safeName = safeName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${uuidv4()}_${safeName}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.gbk' || ext === '.genbank') {
      cb(null, true);
    } else {
      cb(new Error('Only .gbk or .genbank files are allowed'));
    }
  }
}).array('file', 100); // Limit to 100 files

// Store connected SSE clients
let clients = [];

// SSE route
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };
  clients.push(newClient);

  req.on('close', () => {
    clients = clients.filter(client => client.id !== clientId);
  });
});

// Function to send events to clients
function sendEvent(message) {
  clients.forEach(client => client.res.write(`data: ${JSON.stringify(message)}\n\n`));
}

// Upload route
router.post('/upload', (req, res, next) => {
  sendEvent({ status: 'Uploading' });

  upload(req, res, async (err) => {
    if (err) {
      sendEvent({ status: 'Error', message: err.message });
      const status = err.message.includes('.gbk') || err.message.includes('.genbank') ? 400 : 500;
      return res.status(status).json({ error: err.message });
    }

    try {
      const records = await searchService.processUploadedFiles(req, sendEvent);
      res.json(records);
    } catch (error) {
      console.error(error);
      next(error);
    }
  });
});

module.exports = router;
