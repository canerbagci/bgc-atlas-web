const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const debug = require('debug')('bgc-atlas:searchService');
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
 * Process uploaded files and run the search script
 * @param {Object} req - The request object containing uploaded files
 * @param {Function} sendEvent - Function to send SSE events to clients
 * @returns {Promise<Array>} - Array of search results
 */
async function processUploadedFiles(req, sendEvent) {
  return new Promise((resolve, reject) => {
    sendEvent({ status: 'Running' });

    // Process files and generate results here
    const files = req.files.map(file => ({
      name: file.originalname,
      id: file.filename,
      value: 'Sample Value', // Replace with actual logic
      path: path.relative(process.env.SEARCH_UPLOADS_DIR, file.path) // Relative path to the file
    }));

    const uploadDir = req.uploadDir;

    // Execute the script
    const scriptPath = process.env.SEARCH_SCRIPT_PATH;
    const scriptArgs = [uploadDir];

    const scriptProcess = spawn('bash', [scriptPath, ...scriptArgs]);

    let scriptOutput = '';

    scriptProcess.stdout.on('data', (data) => {
      scriptOutput += data.toString();
    });

    scriptProcess.stderr.on('data', (data) => {
      console.error(`Script stderr: ${data}`);
      scriptOutput += data.toString();
    });

    scriptProcess.on('close', (code) => {
      debug('close, scriptOutput: %s', scriptOutput);
      if (code !== 0) {
        sendEvent({ status: 'Error', message: `Script exited with code ${code}`, output: scriptOutput });
        return reject(new Error(`Script exited with code ${code}: ${scriptOutput}`));
      }

      const regex = /^gcf_membership.*/gm;
      const matches = scriptOutput.match(regex);

      if (!matches) {
        sendEvent({ status: 'Error', message: 'No membership lines found' });
        return reject(new Error('No membership lines found'));
      }

      const records = [];

      matches.forEach((line) => {
        const splitArray = line.substring(line.indexOf("\t") + 1).trim().split("|");

        const record = {
          bgc_name: splitArray[6],
          gcf_id: splitArray[7],
          membership_value: splitArray[8]
        };

        records.push(record);
      });

      sendEvent({ status: 'Complete', records: records });
      resolve(records);
    });
  });
}

/**
 * Get membership information for a report
 * @param {string} reportId - The report ID
 * @returns {Promise<string>} - Membership information
 */
function getMembership(reportId) {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');

    let sanitizedId;
    try {
      sanitizedId = sanitizeDirectoryName(reportId);
    } catch (err) {
      return reject(err);
    }

    const query = `SELECT * FROM gcf_membership;`;

    const dbPath = path.join(process.env.REPORTS_DIR, sanitizedId, 'data.db');
    const getReportIdProc = spawn('sqlite3', [
      dbPath,
      query
    ]);

    let membershipString = '';

    getReportIdProc.stderr.on('data', function(data) {
      debug(data.toString());
    });

    getReportIdProc.stdout.on('data', function(data) {
      debug('membership string: ' + data.toString());
      membershipString = data.toString();
    });

    getReportIdProc.on('close', function(code) {
      if (code === 0) {
        debug('SQLite process exited successfully.');
        debug('membership: ' + membershipString);
        resolve(membershipString);
      } else {
        console.error(`SQLite process exited with code ${code}.`);
        reject(`SQLite process exited with code ${code}`);
      }
    });
  });
}

module.exports = {
  createTimestampedDirectory,
  processUploadedFiles,
  getMembership,
  sanitizeDirectoryName
};
