const express = require('express');
const router = express.Router();
const jobService = require('../services/jobService');
const schedulerService = require('../services/schedulerService');
const logger = require('../utils/logger');

/* ───────────────────────────── Job Routes ─────────────────────────────── */

// Get job status
router.get('/:jobId', async (req, res, next) => {
  try {
    const jobId = req.params.jobId;
    const job = await jobService.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get queue information if job is queued
    if (job.status === 'queued') {
      const queueInfo = schedulerService.getQueueInfo(jobId);
      job.queueInfo = queueInfo;
    }

    // Set no-cache headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    res.json(job);
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

// Get job results
router.get('/:jobId/results', async (req, res, next) => {
  try {
    const jobId = req.params.jobId;
    const job = await jobService.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check for both lowercase 'completed' and capitalized 'Complete'
    if (job.status !== 'completed' && job.status !== 'Complete') {
      return res.status(400).json({ 
        error: 'Job not completed', 
        status: job.status 
      });
    }

    // Set no-cache headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    const results = await jobService.getJobResults(jobId);
    res.json(results);
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

// Get user jobs
router.get('/user/:userId', async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const jobs = await jobService.getUserJobs(userId);
    res.json(jobs);
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

// Get queue status
router.get('/queue/status', (req, res) => {
  try {
    const queuedJobs = schedulerService.getQueuedJobs();
    const queueStatus = {
      totalJobs: queuedJobs.length,
      isProcessing: queuedJobs.length > 0,
      queuedJobs
    };

    // Set no-cache headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    res.json(queueStatus);
  } catch (error) {
    logger.error('Error getting queue status:', error);
    res.status(500).json({ error: 'Error getting queue status' });
  }
});

module.exports = router;
