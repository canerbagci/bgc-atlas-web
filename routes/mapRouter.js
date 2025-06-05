const express = require('express');
const router = express.Router();
const mapService = require('../services/mapService');
const { defaultRateLimiter } = require('../services/rateLimitMiddleware');

/* ───────────────────────────── Map Routes ─────────────────────────────── */

// Apply rate limiting to all routes in this router
router.use('/map-data-gcf', defaultRateLimiter);
router.use('/map-data', defaultRateLimiter);
router.use('/body-map-data', defaultRateLimiter);
router.use('/filter', defaultRateLimiter);
router.use('/column-values', defaultRateLimiter);

router.get('/map-data-gcf', async (req, res, next) => {
  try {
    const gcfId = req.query.gcf ? parseInt(req.query.gcf, 10) : null;
    if (req.query.gcf && isNaN(gcfId)) {
      return res.status(400).json({ error: 'Invalid gcf parameter' });
    }

    const samples = req.query.samples ? req.query.samples.split(',') : null;
    const data = await mapService.getMapDataForGcf(gcfId, samples);
    res.json(data);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get('/map-data', async (req, res, next) => {
  try {
    const data = await mapService.getMapData();
    res.json(data);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get('/body-map-data', async (req, res, next) => {
  try {
    const data = await mapService.getBodyMapData();
    res.json(data);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get('/filter/:column', async (req, res, next) => {
  try {
    const data = await mapService.getFilteredMapData(req.params.column);
    res.json(data);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get('/column-values/:column', async (req, res, next) => {
  try {
    const column = req.params.column;
    const data = await mapService.getColumnValues(column);
    res.json(data);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

module.exports = router;
