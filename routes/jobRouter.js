const express = require('express');
const router = express.Router();
const jobService = require('../services/jobService');
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
    
    if (job.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Job not completed', 
        status: job.status 
      });
    }
    
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

module.exports = router;