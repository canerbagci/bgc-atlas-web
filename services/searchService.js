const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');

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
      path: path.relative('/ceph/ibmi/tgm/bgc-atlas/search/uploads', file.path) // Relative path to the file
    }));

    const uploadDir = req.uploadDir;

    // Execute the script
    const scriptPath = '/ceph/ibmi/tgm/bgc-atlas/search/bigslice.sh';
    const scriptArgs = [uploadDir];

    console.log('Running script:', scriptPath, scriptArgs);

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
      console.log("close, scriptOutput: ", scriptOutput);
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

      console.log(matches);

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

      console.log(records);
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

    const query = `SELECT * FROM gcf_membership;`;

    console.log("query: " + query);

    const getReportIdProc = spawn('sqlite3', [
      '/vol/compl_bgcs_bigslice_def_t300/reports/' + reportId + '/data.db',
      query
    ]);

    let membershipString = '';

    getReportIdProc.stderr.on('data', function(data) {
      console.log(data.toString());
    });

    getReportIdProc.stdout.on('data', function(data) {
      console.log('membership string: ' + data.toString());
      membershipString = data.toString();
    });

    getReportIdProc.on('close', function(code) {
      if (code === 0) {
        console.log('SQLite process exited successfully.');
        console.log("membership: " + membershipString);
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
  getMembership
};