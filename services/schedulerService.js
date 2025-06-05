const Bree = require('bree');
const path = require('path');
const logger = require('../utils/logger');
const jobService = require('./jobService');

// Map to store event emitters for each job
const jobEmitters = new Map();

// Queue for jobs waiting to be processed
const jobQueue = [];

// Flag to indicate if a job is currently running
let isProcessingJob = false;

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

          // Try to remove the job from Bree
          try {
            const jobName = `search-${message.jobId}`;
            if (bree.config.jobs.some(job => job.name === jobName)) {
              logger.info(`Removing job ${jobName} from Bree`);
              bree.remove(jobName).catch(err => {
                logger.warn(`Error removing job ${jobName} from Bree: ${err.message}`);
              });
            }
          } catch (error) {
            logger.warn(`Error checking/removing job from Bree: ${error.message}`);
          }

          // Clean up emitter
          if (message.jobId && jobEmitters.has(message.jobId)) {
            logger.info(`Removing emitter for job ${message.jobId}`);
            jobEmitters.delete(message.jobId);
          }

          // Remove job from queue regardless of its position
          const jobIndex = jobQueue.indexOf(message.jobId);
          if (jobIndex !== -1) {
            logger.info(`Removing job ${message.jobId} from queue at position ${jobIndex + 1}`);
            jobQueue.splice(jobIndex, 1);
          } else {
            logger.info(`Job ${message.jobId} not found in queue. Queue length: ${jobQueue.length}`);
          }

          // Reset processing flag and start next job
          logger.info(`Resetting processing flag and starting next job after ${message.jobId}`);
          isProcessingJob = false;

          // Run queue cleanup and process next job
          logger.info(`Running queue cleanup and processing next job after ${message.jobId}`);
          runQueueCleanup()
            .then(() => {
              logger.info(`Queue cleanup completed for job ${message.jobId}, processing next job`);
              processNextJob();
            })
            .catch(error => {
              logger.error(`Error during queue cleanup after job ${message.jobId}: ${error.message}`);
              // Still try to process next job even if cleanup failed
              logger.info(`Attempting to process next job despite cleanup error`);
              processNextJob();
            });
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

    // Check for any queued jobs in the database and add them to the queue
    try {
      const queuedJobs = await jobService.getQueuedJobs();
      logger.info(`Found ${queuedJobs.length} queued jobs in the database`);

      // Clear the current queue
      jobQueue.length = 0;
      isProcessingJob = false;

      // Add jobs to the queue
      for (const job of queuedJobs) {
        logger.info(`Adding job ${job.job_id} to queue from database`);
        jobQueue.push(job.job_id);
      }

      // Start processing jobs if there are any
      if (jobQueue.length > 0 && !isProcessingJob) {
        logger.info(`Starting to process ${jobQueue.length} queued jobs`);
        processNextJob();
      }

      // Start periodic queue cleanup
      startQueueCleanup();
    } catch (dbError) {
      logger.error(`Error retrieving queued jobs from database: ${dbError.message}`);
      // Continue anyway, as new jobs can still be added
    }
  } catch (error) {
    logger.error(`Error starting Bree scheduler: ${error.message}`);
    throw error;
  }
}

// Interval ID for queue cleanup
let queueCleanupInterval = null;

/**
 * Run queue cleanup
 * @returns {Promise<void>}
 */
async function runQueueCleanup() {
  logger.info('Running queue cleanup');

  try {
    // Get all queued jobs from the database
    const queuedJobs = await jobService.getQueuedJobs();
    const queuedJobIds = queuedJobs.map(job => job.job_id);

    // Find jobs in the queue that are not in the database's queued jobs
    const jobsToRemove = [];
    for (let i = 0; i < jobQueue.length; i++) {
      const jobId = jobQueue[i];
      if (!queuedJobIds.includes(jobId)) {
        jobsToRemove.push({ index: i, jobId });
      }
    }

    // Remove jobs from the queue (in reverse order to avoid index issues)
    if (jobsToRemove.length > 0) {
      logger.info(`Found ${jobsToRemove.length} jobs to remove from queue`);

      for (let i = jobsToRemove.length - 1; i >= 0; i--) {
        const { index, jobId } = jobsToRemove[i];
        logger.info(`Removing job ${jobId} from queue at position ${index + 1}`);
        jobQueue.splice(index, 1);
      }

      // If the first job was removed and there are still jobs in the queue, start processing
      if (jobsToRemove.some(job => job.index === 0) && jobQueue.length > 0 && !isProcessingJob) {
        logger.info('First job was removed, starting next job');
        isProcessingJob = false;
        processNextJob();
      }
    } else {
      logger.info('No jobs to remove from queue');
    }
  } catch (error) {
    logger.error(`Error in queue cleanup: ${error.message}`);
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Start periodic queue cleanup
 */
function startQueueCleanup() {
  // Clear any existing interval
  if (queueCleanupInterval) {
    clearInterval(queueCleanupInterval);
  }

  // Set up interval to clean up the queue every minute
  queueCleanupInterval = setInterval(() => {
    runQueueCleanup().catch(error => {
      logger.error(`Error in periodic queue cleanup: ${error.message}`);
    });
  }, 60000); // Run every minute

  logger.info('Started periodic queue cleanup');
}

/**
 * Stop the scheduler
 */
async function stop() {
  try {
    // Stop the queue cleanup interval
    if (queueCleanupInterval) {
      clearInterval(queueCleanupInterval);
      queueCleanupInterval = null;
      logger.info('Stopped queue cleanup interval');
    }

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

    // Add job to queue
    jobQueue.push(jobId);

    // Get queue position for this job
    const queuePosition = jobQueue.indexOf(jobId) + 1;
    const totalJobs = jobQueue.length;

    // Emit queue information
    emitter.emit('status', { 
      status: 'Queued', 
      jobId,
      queuePosition,
      totalJobs
    });

    logger.info(`Scheduled job ${jobId} (position ${queuePosition} of ${totalJobs} in queue)`);

    // Process next job in queue if not already processing
    if (!isProcessingJob) {
      processNextJob();
    }
  } catch (error) {
    logger.error(`Error scheduling job ${jobId}: ${error.message}`);
    throw error;
  }
}

/**
 * Process the next job in the queue
 * @returns {Promise<void>}
 */
async function processNextJob() {
  logger.info(`Processing next job. Queue length: ${jobQueue.length}, isProcessingJob: ${isProcessingJob}`);

  // Double-check the processing flag to avoid race conditions
  if (isProcessingJob) {
    logger.info('Already processing a job, will not start another');
    return;
  }

  if (jobQueue.length === 0) {
    logger.info('No jobs in queue, nothing to process');
    isProcessingJob = false;
    return;
  }

  // Set the processing flag before doing anything else
  isProcessingJob = true;

  // Get the first job in the queue
  const jobId = jobQueue[0];
  logger.info(`Starting to process job ${jobId}`);

  try {
    // Run queue cleanup first to ensure we have the latest queue state
    logger.info(`Running queue cleanup before processing job ${jobId}`);
    await runQueueCleanup();

    // Check if the job is still in the queue after cleanup
    if (!jobQueue.includes(jobId)) {
      logger.info(`Job ${jobId} was removed during cleanup, checking for next job`);
      isProcessingJob = false;
      processNextJob();
      return;
    }

    // Double-check that this job is still at the front of the queue
    if (jobQueue[0] !== jobId) {
      logger.info(`Job ${jobId} is no longer at the front of the queue, processing next job instead`);
      isProcessingJob = false;
      processNextJob();
      return;
    }

    // Verify the job still exists in the database
    const job = await jobService.getJob(jobId);
    if (!job) {
      logger.warn(`Job ${jobId} not found in database, removing from queue`);
      jobQueue.shift();
      isProcessingJob = false;
      processNextJob();
      return;
    }

    // Check if job status is still 'queued'
    if (job.status !== 'queued') {
      logger.warn(`Job ${jobId} has status ${job.status}, not 'queued', removing from queue`);
      jobQueue.shift();
      isProcessingJob = false;
      processNextJob();
      return;
    }

    // Check if job already exists in Bree
    const jobName = `search-${jobId}`;
    const jobExists = bree.config.jobs.some(job => job.name === jobName);
    if (jobExists) {
      logger.info(`Job ${jobId} already exists in Bree, removing it first`);
      try {
        await bree.remove(jobName);
      } catch (removeError) {
        logger.warn(`Error removing existing job ${jobId}: ${removeError.message}`);
        // Continue anyway, as we'll try to add it again
      }
    }

    // Add job to Bree
    logger.info(`Adding job ${jobId} to Bree`);
    await bree.add({
      name: jobName,
      path: path.join(process.cwd(), 'jobs', 'searchWorker.js'),
      worker: {
        workerData: { jobId }
      }
    });

    // Start the job
    logger.info(`Starting job ${jobId} in Bree`);
    await bree.start(jobName);

    logger.info(`Started processing job ${jobId}`);

    // Update job status to 'running' in the database
    try {
      await jobService.updateJobStatus(jobId, 'running');
      logger.info(`Updated job ${jobId} status to 'running' in database`);
    } catch (updateError) {
      logger.warn(`Error updating job ${jobId} status: ${updateError.message}`);
      // Continue anyway, as the worker will also try to update the status
    }

    // Update queue information for all jobs in queue
    updateQueueInformation();
  } catch (error) {
    logger.error(`Error processing job ${jobId}: ${error.message}`);

    // Remove job from queue
    logger.info(`Removing job ${jobId} from queue due to error`);
    jobQueue.shift();
    isProcessingJob = false;

    // Process next job
    logger.info('Attempting to process next job after error');
    processNextJob();
  }
}

/**
 * Update queue information for all jobs in queue
 */
function updateQueueInformation() {
  for (let i = 0; i < jobQueue.length; i++) {
    const jobId = jobQueue[i];
    const emitter = jobEmitters.get(jobId);

    if (emitter) {
      emitter.emit('status', { 
        status: 'Queued', 
        jobId,
        queuePosition: i + 1,
        totalJobs: jobQueue.length
      });
    }
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

/**
 * Get queue information for a job
 * @param {string} jobId - Job ID
 * @returns {Object} - Queue information
 */
function getQueueInfo(jobId) {
  const queuePosition = jobQueue.indexOf(jobId) + 1;
  const totalJobs = jobQueue.length;
  const isQueued = queuePosition > 0;
  const isRunning = isQueued && queuePosition === 1 && isProcessingJob;

  return {
    queuePosition: isQueued ? queuePosition : 0,
    totalJobs,
    isQueued,
    isRunning
  };
}

/**
 * Get all jobs in queue
 * @returns {Array} - Array of job IDs in queue
 */
function getQueuedJobs() {
  return [...jobQueue];
}

module.exports = {
  start,
  stop,
  scheduleJob,
  getJobEmitter,
  getQueueInfo,
  getQueuedJobs
};
