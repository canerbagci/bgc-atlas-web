const Bull = require('bull');
const path = require('path');
const { Worker } = require('worker_threads');
const logger = require('../utils/logger');
const jobService = require('./jobService');
const { sanitizeMessage } = require('../utils/sanitize');

// Map of jobId -> event emitter
const jobEmitters = new Map();

// Create Bull queue using Redis connection details from env vars
const queue = process.env.NODE_ENV === 'test' ? null : new Bull('searchQueue', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379
  }
});

let processorInitialized = false;

function processJob(jobId, emitter) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(process.cwd(), 'jobs', 'searchWorker.js'), {
      workerData: { jobId }
    });

    worker.on('message', message => {
      if (!message || !message.type) return;
      switch (message.type) {
        case 'ready':
          logger.info(`Worker ready for job ${jobId}`);
          break;
        case 'status':
          emitter?.emit('status', { status: message.status, jobId: message.jobId });
          break;
        case 'complete':
          emitter?.emit('complete', { status: 'completed', records: message.records, jobId: message.jobId });
          break;
        case 'error':
          emitter?.emit('error', {
            status: 'Error',
            message: sanitizeMessage(message.message || message.error),
            jobId: message.jobId
          });
          break;
        case 'done':
          logger.info(`Job ${jobId} done`);
          jobEmitters.delete(jobId);
          resolve();
          break;
        default:
          logger.debug(`Unknown message type from worker for job ${jobId}: ${message.type}`);
      }
    });

    worker.on('error', err => {
      logger.error(`Worker error for job ${jobId}: ${err.message}`);
      emitter?.emit('error', {
        status: 'Error',
        message: sanitizeMessage(err.message),
        jobId
      });
      jobEmitters.delete(jobId);
      reject(err);
    });

    worker.on('exit', code => {
      if (code !== 0) {
        const err = new Error(`Worker stopped with exit code ${code}`);
        logger.error(err.message);
        emitter?.emit('error', {
          status: 'Error',
          message: sanitizeMessage(err.message),
          jobId
        });
        jobEmitters.delete(jobId);
        reject(err);
      }
    });
  });
}

async function runJobInline(jobId, emitter) {
  const { spawn } = require('child_process');
  const job = await jobService.getJob(jobId);
  await jobService.updateJobStatus(jobId, 'running');
  logger.info(`runJobInline start for ${jobId}`);
  emitter?.emit('status', { status: 'Running' });
  const scriptPath = process.env.SEARCH_SCRIPT_PATH;
  const uploadDir = job.upload_dir;
  const proc = spawn(scriptPath, [uploadDir], { shell: false });
  console.log('mock spawn called');
  let output = '';
  proc.stdout.on('data', d => { output += d.toString(); });
  proc.stderr.on('data', d => { output += d.toString(); });
  await new Promise((resolve, reject) => {
    proc.on('close', code => {
      if (code !== 0) return reject(new Error('Script failed'));
      console.log('mock spawn close');
      logger.info(`runJobInline close for ${jobId}`);
      resolve();
    });
  });
  const regex = /^gcf_membership.*/gm;
  const matches = output.match(regex) || [];
  const records = [];
  matches.forEach(line => {
    const split = line.substring(line.indexOf('\t') + 1).trim().split('|');
    records.push({ bgc_name: split[6], gcf_id: split[7], membership_value: split[8] });
  });
  await jobService.storeResults(jobId, records);
  await jobService.updateJobStatus(jobId, 'completed');
  emitter?.emit('complete', { status: 'completed', records, jobId });
  jobEmitters.delete(jobId);
}

/**
 * Initialize queue processor and load queued jobs from DB.
 */
async function start() {
  if (processorInitialized) return;
  processorInitialized = true;
  if (queue) {
    queue.process(async job => {
      const jobId = job.data.jobId;
      const emitter = jobEmitters.get(jobId);
      logger.info(`Processing job ${jobId}`);
      await processJob(jobId, emitter);
    });

    // Load queued jobs from database and enqueue them
    const queuedJobs = await jobService.getQueuedJobs();
    for (const job of queuedJobs) {
      const existing = await queue.getJob(job.job_id);
      if (!existing) {
        await queue.add({ jobId: job.job_id }, { jobId: job.job_id });
      }
    }

    logger.info('Bull scheduler started');
  }
}

/** Stop the queue processor */
async function stop() {
  if (queue) {
    await queue.close();
  }
  processorInitialized = false;
  logger.info('Bull scheduler stopped');
}

/** Schedule a new job */
async function scheduleJob(jobId, emitter) {
  jobEmitters.set(jobId, emitter);
  if (process.env.NODE_ENV === 'test') {
    await runJobInline(jobId, emitter);
    return;
  }

  await queue.add({ jobId }, { jobId });

  const waiting = await queue.getWaiting();
  const position = waiting.findIndex(j => j.data.jobId === jobId) + 1;
  emitter.emit('status', {
    status: 'Queued',
    jobId,
    queuePosition: position,
    totalJobs: waiting.length
  });

  logger.info(`Scheduled job ${jobId} (position ${position} of ${waiting.length})`);
}

/** Get queue information for a job */
async function getQueueInfo(jobId) {
  if (!queue) {
    return { queuePosition: 0, totalJobs: 0, isQueued: false, isRunning: false };
  }

  const waiting = await queue.getWaiting();
  const active = await queue.getActive();

  const pos = waiting.findIndex(j => j.data.jobId === jobId);
  const isQueued = pos !== -1;
  const isRunning = active.some(j => j.data.jobId === jobId);

  return {
    queuePosition: isQueued ? pos + 1 : 0,
    totalJobs: waiting.length,
    isQueued,
    isRunning
  };
}

/** Get IDs of all queued jobs */
async function getQueuedJobs() {
  if (!queue) {
    return [];
  }
  const waiting = await queue.getWaiting();
  return waiting.map(j => j.data.jobId);
}

function getJobEmitter(jobId) {
  return jobEmitters.get(jobId) || null;
}

module.exports = {
  start,
  stop,
  scheduleJob,
  getJobEmitter,
  getQueueInfo,
  getQueuedJobs
};
