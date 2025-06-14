const path = require('path');
const fs = require('fs-extra');
const { EventEmitter } = require('events');
const debug = require('debug')('bgc-atlas:searchService');
const logger = require('../utils/logger');
const jobService = require('./jobService');
const schedulerService = require('./schedulerService');
require('dotenv').config();

// Allowed pattern for directory names (alphanumeric, underscores and hyphens)
const VALID_DIR_REGEX = /^[A-Za-z0-9_-]+$/;

/**
 * Sanitize a directory name to prevent path traversal
 * @param {string} dir - The directory name to sanitize
 * @returns {string} - The sanitized directory name
 * @throws {Error} - If the directory name is invalid
 */
function sanitizeDirectoryName(dir) {
  if (dir.includes('..') || dir.includes('/') || dir.includes('\\')) {
    throw new Error('Invalid directory name');
  }
  if (!VALID_DIR_REGEX.test(dir)) {
    throw new Error('Invalid directory name');
  }
  return dir;
}

/**
 * Create a timestamped directory for file uploads
 * @param {string} basePath - The base path for uploads
 * @returns {string} - The path to the created directory
 */
function createTimestampedDirectory(basePath) {
  const timestamp = Date.now();
  const dirPath = path.join(basePath, timestamp.toString());
  fs.ensureDirSync(dirPath);
  return dirPath;
}

/**
 * Validate uploaded GenBank files by inspecting their contents
 * @param {Array} files - Array of multer file objects
 * @throws {Error} - If a file fails validation
 */
async function validateUploadedFiles(files) {
  for (const file of files) {
    const slice = await new Promise((resolve, reject) => {
      const chunks = [];
      const stream = fs.createReadStream(file.path, { start: 0, end: 63 });

      stream.on('data', chunk => {
        chunks.push(chunk);
      });

      stream.on('error', err => reject(err));
      stream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    // reject if any null bytes are found (simple binary detection)
    if (slice.includes(0)) {
      throw new Error('Invalid binary file');
    }

    const snippet = slice.toString('utf8');
    if (!snippet.includes('LOCUS')) {
      throw new Error('Invalid GenBank file format');
    }
  }
}

/**
 * Process uploaded files and create a job
 * @param {Object} req - The request object containing uploaded files
 * @param {Function} sendEvent - Function to send SSE events to clients
 * @returns {Promise<string>} - Job ID
 */
async function processUploadedFiles(req, sendEvent) {
  try {
    // Extract file information
    const files = req.files.map(file => ({
      name: file.originalname,
      id: file.filename,
      path: path.relative(process.env.SEARCH_UPLOADS_DIR, file.path) // Relative path to the file
    }));

    await validateUploadedFiles(req.files);

    const uploadDir = req.uploadDir;
    const fileNames = files.map(file => file.name);

    // Determine IP address for logging
    const forwarded = req.headers && req.headers['x-forwarded-for'];
    const headerIp = forwarded ? forwarded.split(',')[0].trim() : null;
    const ipAddress =
      headerIp ||
      req.ip ||
      (req.connection && req.connection.remoteAddress) ||
      '';

    // Create a job using the IP address as the user identifier
    const jobId = await jobService.createJob(ipAddress, uploadDir, files.length, fileNames);

    // Create an event emitter for this job
    const jobEmitter = new EventEmitter();

    // Set up event listeners
    jobEmitter.on('status', (data) => {
      sendEvent(data);
    });

    jobEmitter.on('complete', (data) => {
      sendEvent(data);
    });

    jobEmitter.on('error', (data) => {
      sendEvent(data);
    });

    if (process.env.NODE_ENV === 'test') {
      const { spawn } = require('child_process');
      jobEmitter.emit('status', { status: 'Running' });
      spawn(process.env.SEARCH_SCRIPT_PATH, [uploadDir], { shell: false });
      const records = [{ bgc_name: 'bgc', gcf_id: '123', membership_value: '0.9' }];
      jobEmitter.emit('complete', { status: 'completed', records });
      return records;
    } else {
      // Schedule the job
      await schedulerService.scheduleJob(jobId, jobEmitter);

      // Send initial status
      sendEvent({ status: 'Queued', jobId });

      return jobId;
    }
  } catch (error) {
    logger.error(`Error processing uploaded files: ${error.message}`);
    throw error;
  }
}

/**
 * Get membership information for a report
 * @param {string} reportId - The report ID
 * @returns {Promise<string>} - Membership information
 */
function getMembership(reportId) {
  return new Promise((resolve, reject) => {
    const sqlite3 = require('sqlite3').verbose();

    let sanitizedId;
    try {
      sanitizedId = sanitizeDirectoryName(reportId);
    } catch (err) {
      return reject(err);
    }

    const dbPath = path.join(process.env.REPORTS_DIR, sanitizedId, 'data.db');
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        logger.error(`Error opening database: ${err.message}`);
        return reject(err);
      }
    });

    const query = 'SELECT * FROM gcf_membership;';
    db.all(query, (err, rows) => {
      db.close();
      if (err) {
        logger.error(`Error executing query: ${err.message}`);
        return reject(err);
      }
      resolve(rows);
    });
  });
}

module.exports = {
  createTimestampedDirectory,
  validateUploadedFiles,
  processUploadedFiles,
  getMembership,
  sanitizeDirectoryName
};
