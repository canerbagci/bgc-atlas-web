const express = require('express');
const router = express.Router();
const mapService = require('../services/mapService');
const { defaultRateLimiter } = require('../services/rateLimitMiddleware');
const logger = require('../utils/logger');

/* ───────────────────────────── Map Routes ─────────────────────────────── */

// Apply rate limiting to all routes in this router
router.use('/map-data-gcf', defaultRateLimiter);
router.use('/map-data', defaultRateLimiter);
router.use('/body-map-data', defaultRateLimiter);
router.use('/filter', defaultRateLimiter);
router.use('/column-values', defaultRateLimiter);
router.use('/biome-data-gcfs', defaultRateLimiter);

router.get('/map-data-gcf', async (req, res, next) => {
  try {
    // Parse GCF ID from query parameter
    const gcfId = req.query.gcf ? parseInt(req.query.gcf, 10) : null;
    if (req.query.gcf && isNaN(gcfId)) {
      return res.status(400).json({ error: 'Invalid gcf parameter' });
    }

    // Parse samples from query parameter
    const samples = req.query.samples ? req.query.samples.split(',') : null;

    // Parse job ID from query parameter
    const jobId = req.query.jobId || null;

    // Parse putative threshold from query parameter
    const putativeThreshold = req.query.putativeThreshold ? parseFloat(req.query.putativeThreshold) : null;

    // Validate putative threshold if provided
    if (req.query.putativeThreshold && (isNaN(putativeThreshold) || putativeThreshold < 0 || putativeThreshold > 1)) {
      return res.status(400).json({ error: 'Invalid putativeThreshold parameter. Must be a number between 0 and 1.' });
    }

    // Get map data
    const data = await mapService.getMapDataForGcf(gcfId, samples, jobId, putativeThreshold);
    res.json(data);
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

router.get('/map-data', async (req, res, next) => {
  try {
    const data = await mapService.getMapData();
    res.json(data);
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

router.get('/body-map-data', async (req, res, next) => {
  try {
    const data = await mapService.getBodyMapData();
    res.json(data);
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

router.get('/filter/:column', async (req, res, next) => {
  try {
    const data = await mapService.getFilteredMapData(req.params.column);
    res.json(data);
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

router.get('/column-values/:column', async (req, res, next) => {
  try {
    const column = req.params.column;
    const data = await mapService.getColumnValues(column);
    res.json(data);
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

router.get('/biome-data-gcfs', async (req, res, next) => {
  try {
    // Parse GCF IDs from query parameter
    let gcfIds = null;
    if (req.query.gcfs) {
      gcfIds = req.query.gcfs.split(',').map(id => {
        // If the ID is in the format "GCF_123", extract the numeric part
        if (id.startsWith('GCF_')) {
          return parseInt(id.substring(4), 10);
        }
        return parseInt(id, 10);
      }).filter(id => !isNaN(id));

      if (gcfIds.length === 0) {
        gcfIds = null;
      }
    }

    // Parse samples from query parameter
    const samples = req.query.samples ? req.query.samples.split(',') : null;

    // Parse job ID from query parameter
    const jobId = req.query.jobId || null;

    // Parse putative threshold from query parameter
    const putativeThreshold = req.query.putativeThreshold ? parseFloat(req.query.putativeThreshold) : null;

    // Validate putative threshold if provided
    if (req.query.putativeThreshold && (isNaN(putativeThreshold) || putativeThreshold < 0 || putativeThreshold > 1)) {
      return res.status(400).json({ error: 'Invalid putativeThreshold parameter. Must be a number between 0 and 1.' });
    }

    // Get biome data
    const data = await mapService.getBiomeDataForGcfs(gcfIds, samples, jobId, putativeThreshold);
    res.json(data);
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

module.exports = router;
