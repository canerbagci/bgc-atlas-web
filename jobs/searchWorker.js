// Worker script for processing search jobs
const { parentPort, workerData } = require('worker_threads');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const { pool } = require('../config/database');
const jobService = require('../services/jobService');
const logger = require('../utils/logger');
require('dotenv').config();

// Log worker data
logger.info(`Search worker started with worker data: ${JSON.stringify(workerData || {})}`);

// Get the job ID from worker data
const { jobId } = workerData || {};

// Log worker startup and job ID
logger.info(`Search worker started with job ID: ${jobId || 'undefined'}`);
if (!jobId) {
  logger.error('No job ID provided in worker data');
  parentPort.postMessage({ type: 'error', error: 'No job ID provided in worker data' });
  if (parentPort) {
    parentPort.close();
  }
  return;
}

// Signal ready to parent before processing
parentPort.postMessage({ type: 'ready' });

// Process the job immediately
(async () => {
  try {
    if (!jobId) {
      throw new Error('No job ID provided in worker data');
    }

    // Get job details from database
    const job = await jobService.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Update job status to running
    await jobService.updateJobStatus(jobId, 'running');

    // Send message to parent to update clients
    parentPort.postMessage({ 
      type: 'status', 
      jobId, 
      status: 'Running' 
    });

    // Execute the search script
    const scriptPath = process.env.SEARCH_SCRIPT_PATH;
    const uploadDir = job.upload_dir;
    const scriptArgs = [uploadDir];

    // Validate script path existence and safety
    const resolvedScript = path.resolve(scriptPath);
    if (!fs.existsSync(resolvedScript)) {
      throw new Error('Search script not found');
    }

    const safeDir = path.resolve(process.env.SEARCH_UPLOADS_DIR || '', '..');
    if (!resolvedScript.startsWith(safeDir + path.sep)) {
      throw new Error('Invalid search script path');
    }

    const scriptProcess = spawn(resolvedScript, scriptArgs, { shell: false });

    let scriptOutput = '';

    scriptProcess.stdout.on('data', (data) => {
      scriptOutput += data.toString();
    });

    scriptProcess.stderr.on('data', (data) => {
      logger.error(`Script stderr: ${data}`);
      scriptOutput += data.toString();
    });

    // Wait for script to complete
    await new Promise((resolve, reject) => {
      scriptProcess.on('close', async (code) => {
        if (code !== 0) {
          await jobService.updateJobStatus(jobId, 'failed');
          parentPort.postMessage({ 
            type: 'error', 
            jobId, 
            message: `Script exited with code ${code}`, 
            output: scriptOutput 
          });
          return reject(new Error(`Script exited with code ${code}: ${scriptOutput}`));
        }

        const regex = /^gcf_membership.*/gm;
        const matches = scriptOutput.match(regex);

        if (!matches) {
          await jobService.updateJobStatus(jobId, 'failed');
          parentPort.postMessage({ 
            type: 'error', 
            jobId, 
            message: 'No membership lines found' 
          });
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

        // Store results in database
        await jobService.storeResults(jobId, records);

        // Update job status to completed
        await jobService.updateJobStatus(jobId, 'completed');

        // Send results to parent
        parentPort.postMessage({ 
          type: 'complete', 
          jobId, 
          records 
        });

        resolve();
      });
    });

    // Signal successful completion
    logger.info(`Job ${jobId} completed successfully, sending 'done' message to parent`);
    parentPort.postMessage({ type: 'done', jobId });

    // Wait a moment to ensure the message is sent before closing
    await new Promise(resolve => setTimeout(resolve, 100));

  } catch (error) {
    logger.error(`Error in search worker: ${error.message}`);

    // Try to update job status to failed if possible
    try {
      if (jobId) {
        await jobService.updateJobStatus(jobId, 'failed');
        logger.info(`Job ${jobId} failed, sending 'error' message to parent`);
        parentPort.postMessage({ 
          type: 'error', 
          jobId, 
          message: error.message 
        });
      }
    } catch (updateError) {
      logger.error(`Failed to update job status: ${updateError.message}`);
    }

    // Signal error to parent
    logger.info(`Sending general error message to parent`);
    parentPort.postMessage({ type: 'error', error: error.message });

    // Wait a moment to ensure the message is sent before closing
    await new Promise(resolve => setTimeout(resolve, 100));
  } finally {
    // Always signal completion to parent
    logger.info(`Worker for job ${jobId} is closing communication channel`);
    if (parentPort) {
      parentPort.close();
    }
  }
})();
