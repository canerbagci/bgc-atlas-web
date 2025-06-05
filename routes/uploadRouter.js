const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const searchService = require('../services/searchService');
const logger = require('../utils/logger');
const { sanitizeMessage } = require('../utils/sanitize');
const csrf = require('csurf');

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
const clients = new Map();

// SSE route
router.get('/events', (req, res) => {
  console.log('New SSE client connected');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const clientId = Date.now();
  clients.set(clientId, res);
  console.log(`Client ${clientId} connected, total clients: ${clients.size}`);

  // Send a test event to confirm connection and include queue status
  const schedulerService = require('../services/schedulerService');
  schedulerService.getQueuedJobs().then(queuedJobs => {
    res.write(`data: ${JSON.stringify({
      type: 'connection',
      message: 'Connected to SSE',
      queueStatus: {
        totalJobs: queuedJobs.length,
        isProcessing: queuedJobs.length > 0
      }
    })}\n\n`);
  }).catch(err => {
    console.error('Error retrieving queued jobs for SSE:', err);
  });

  req.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    clients.delete(clientId);
    console.log(`Total clients after disconnect: ${clients.size}`);
  });
});

// Function to send events to clients
function sendEvent(message) {
  console.log(`Sending SSE event to ${clients.size} clients:`, message);
  clients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify(message)}\n\n`);
    } catch (error) {
      console.error('Error sending SSE event:', error);
    }
  });
}

// Create a separate CSRF middleware for the upload route
// This will be applied after multer processes the request
const uploadCsrfProtection = csrf({ 
  cookie: true,
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  value: req => {
    return req.headers['x-csrf-token'] || 
           req.headers['csrf-token'] || 
           req.headers['x-xsrf-token'] ||
           req.headers['xsrf-token'] ||
           req.query._csrf;
  }
});

// Upload route
router.post('/upload', (req, res, next) => {
  sendEvent({ status: 'Uploading' });

  // First process the file upload with multer
  upload(req, res, async (err) => {
    if (err) {
      const sanitized = sanitizeMessage(err.message);
      sendEvent({ status: 'Error', message: sanitized });
      const status = err.message.includes('.gbk') || err.message.includes('.genbank') ? 400 : 500;
      return res.status(status).json({ error: sanitized });
    }

    // Then validate the CSRF token
    uploadCsrfProtection(req, res, async (csrfErr) => {
      if (csrfErr) {
        logger.error('CSRF error in upload route:', csrfErr);
        sendEvent({ status: 'Error', message: 'Invalid CSRF token' });
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }

      try {
        const jobId = await searchService.processUploadedFiles(req, sendEvent);
        res.json({ jobId });
      } catch (error) {
        logger.error(error);
        next(error);
      }
    });
  });
});

module.exports = router;
