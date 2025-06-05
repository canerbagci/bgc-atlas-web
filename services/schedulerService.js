const Bree = require('bree');
const path = require('path');
const logger = require('../utils/logger');
const jobService = require('./jobService');

// Map to store event emitters for each job
const jobEmitters = new Map();

// Initialize Bree
const bree = new Bree({
  root: path.join(process.cwd(), 'jobs'),
  jobs: [],
  workerMessageHandler: (message, workerMetadata) => {
    // Check if workerMetadata exists before destructuring
    const name = workerMetadata?.name || 'unknown';

    // Handle messages from workers
    if (message && message.type) {
      switch (message.type) {
        case 'ready':
          logger.info(`Worker ${name} is ready`);
          break;

        case 'status':
          logger.info(`Job ${message.jobId} status: ${message.status}`);
          // Emit status update event
          if (jobEmitters.has(message.jobId)) {
            jobEmitters.get(message.jobId).emit('status', { 
              status: message.status, 
              jobId: message.jobId 
            });
          }
          break;

        case 'complete':
          logger.info(`Job ${message.jobId} completed with ${message.records.length} results`);
          // Emit complete event with results
          if (jobEmitters.has(message.jobId)) {
            jobEmitters.get(message.jobId).emit('complete', { 
              status: 'Complete', 
              records: message.records, 
              jobId: message.jobId 
            });
          }
          break;

        case 'error':
          logger.error(`Job ${message.jobId || 'unknown'} error: ${message.message || message.error}`);
          // Emit error event
          if (message.jobId && jobEmitters.has(message.jobId)) {
            jobEmitters.get(message.jobId).emit('error', { 
              status: 'Error', 
              message: message.message || message.error, 
              output: message.output, 
              jobId: message.jobId 
            });
          }
          break;

        case 'done':
          logger.info(`Worker ${name} for job ${message.jobId} is done`);
          // Clean up emitter
          if (message.jobId && jobEmitters.has(message.jobId)) {
            jobEmitters.delete(message.jobId);
          }
          break;

        default:
          logger.debug(`Unknown message type from worker ${name}: ${message.type}`);
      }
    }
  }
});

/**
 * Start the scheduler
 */
async function start() {
  try {
    await bree.start();
    logger.info('Bree scheduler started');
  } catch (error) {
    logger.error(`Error starting Bree scheduler: ${error.message}`);
    throw error;
  }
}

/**
 * Stop the scheduler
 */
async function stop() {
  try {
    await bree.stop();
    logger.info('Bree scheduler stopped');
  } catch (error) {
    logger.error(`Error stopping Bree scheduler: ${error.message}`);
    throw error;
  }
}

/**
 * Schedule a job for execution
 * @param {string} jobId - Job ID
 * @param {EventEmitter} emitter - Event emitter for job events
 * @returns {Promise<void>}
 */
async function scheduleJob(jobId, emitter) {
  try {
    // Store emitter for this job
    jobEmitters.set(jobId, emitter);

    console.log("scheduling job", jobId);

    // Add job to Bree
    await bree.add({
      name: `search-${jobId}`,
      path: path.join(process.cwd(), 'jobs', 'searchWorker.js'),
      worker: {
        workerData: { jobId }
      }
    });

    // Start the job
    await bree.start(`search-${jobId}`);

    logger.info(`Scheduled job ${jobId}`);
  } catch (error) {
    logger.error(`Error scheduling job ${jobId}: ${error.message}`);
    throw error;
  }
}

/**
 * Get the event emitter for a job
 * @param {string} jobId - Job ID
 * @returns {EventEmitter|null} - Event emitter or null if not found
 */
function getJobEmitter(jobId) {
  return jobEmitters.get(jobId) || null;
}

module.exports = {
  start,
  stop,
  scheduleJob,
  getJobEmitter
};
