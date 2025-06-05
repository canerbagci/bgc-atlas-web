const express = require('express');
const router = express.Router();
const bgcService = require('../services/bgcService');
const { defaultRateLimiter } = require('../services/rateLimitMiddleware');

/* ───────────────────────────── GCF Routes ─────────────────────────────── */

// Apply rate limiting to all routes in this router
router.use('/gcf-count-hist', defaultRateLimiter);
router.use('/gcf-table-sunburst', defaultRateLimiter);
router.use('/gcf-table', defaultRateLimiter);

router.get('/gcf-count-hist', async (req, res, next) => {
  try {
    const bgcInfo = await bgcService.getGcfCountHistogram();
    res.json(bgcInfo);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get('/gcf-table-sunburst', async (req, res, next) => {
  try {
    const gcfId = req.query.gcf ? parseInt(req.query.gcf, 10) : null;
    if (req.query.gcf && isNaN(gcfId)) {
      return res.status(400).json({ error: 'Invalid gcf parameter' });
    }

    const samples = req.query.samples ? req.query.samples.split(',') : null;
    const sunburstData = await bgcService.getGcfTableSunburst(gcfId, samples);
    res.json(sunburstData);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get('/gcf-table', async (req, res, next) => {
  try {
    // Extract pagination parameters from the request
    const options = {
      draw: req.query.draw,
      start: parseInt(req.query.start) || 0,
      length: parseInt(req.query.length) || 10,
      order: req.query.order ? JSON.parse(req.query.order) : []
    };

    // Get paginated data from the service
    const result = await bgcService.getGcfTable(options);

    // Return the result directly (it's already in the format expected by DataTables)
    res.json(result);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

module.exports = router;
