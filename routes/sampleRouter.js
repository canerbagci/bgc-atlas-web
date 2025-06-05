const express = require('express');
const router = express.Router();
const sampleService = require('../services/sampleService');
const { defaultRateLimiter } = require('../services/rateLimitMiddleware');
const logger = require('../utils/logger');

/* ───────────────────────────── Sample Routes ─────────────────────────────── */

// Apply rate limiting to all routes in this router
router.use('/getBgcId', defaultRateLimiter);
router.use('/sample-info', defaultRateLimiter);
router.use('/sample-data', defaultRateLimiter);
router.use('/sample-data-2', defaultRateLimiter);

router.get('/getBgcId', async (req, res, next) => {
  try {
    const { dataset, anchor } = req.query;

    // Let the service layer handle validation
    const result = await sampleService.getBgcId(dataset, anchor);
    res.json(result);
  } catch (error) {
    logger.error(error);

    // Handle validation errors with appropriate status code
    if (error.message && error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
});

router.get('/sample-info', async (req, res, next) => {
  try {
    const sampleInfo = await sampleService.getSampleInfo();
    res.json(sampleInfo);
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

router.get('/sample-data', async (req, res, next) => {
  try {
    // Safely access nested properties
    const searchValue = req.query.search && req.query.search.value ? req.query.search.value : null;

    // Extract pagination parameters from the request
    // Let the service layer handle validation
    const options = {
      draw: req.query.draw || '1',
      start: req.query.start || '0',
      length: req.query.length || '50',
      searchValue: searchValue,
      order: []
    };

    // Process order parameters from DataTables
    if (req.query.order) {
      for (let i = 0; i < Object.keys(req.query.order).length; i++) {
        if (req.query.order[i] && req.query.order[i].column !== undefined) {
          options.order.push({
            column: req.query.order[i].column,
            dir: req.query.order[i].dir
          });
        }
      }
    }

    // Get paginated data
    const result = await sampleService.getPaginatedSampleData(options);
    res.json(result);
  } catch (error) {
    logger.error(error);

    // Handle validation errors with appropriate status code
    if (error.message && error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
});

router.get('/sample-data-2', async (req, res, next) => {
  try {
    const rows = await sampleService.getSampleData2();
    res.json({ data: rows });
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

module.exports = router;
