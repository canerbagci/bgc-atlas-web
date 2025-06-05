const express = require('express');
const router = express.Router();
const bgcService = require('../services/bgcService');
const { defaultRateLimiter } = require('../services/rateLimitMiddleware');

/* ───────────────────────────── BGC Routes ─────────────────────────────── */

// Apply rate limiting to all routes in this router
router.use('/bgc-info', defaultRateLimiter);
router.use('/pc-category-count', defaultRateLimiter);
router.use('/gcf-category-count', defaultRateLimiter);
router.use('/pc-product-count', defaultRateLimiter);
router.use('/pc-taxonomic-count', defaultRateLimiter);
router.use('/bgc-table', defaultRateLimiter);

router.get('/bgc-info', async (req, res, next) => {
  try {
    // Let the service layer handle validation
    const gcfId = req.query.gcf || null;
    const samples = req.query.samples || null;

    const bgcInfo = await bgcService.getBgcInfo(gcfId, samples);
    res.json(bgcInfo);
  } catch (error) {
    console.error(error);

    // Handle validation errors with appropriate status code
    if (error.message && error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
});

router.get('/pc-category-count', async (req, res, next) => {
  try {
    // Let the service layer handle validation
    const gcfId = req.query.gcf || null;
    const samples = req.query.samples || null;

    const categoryCount = await bgcService.getProductCategoryCounts(gcfId, samples);
    res.json(categoryCount);
  } catch (error) {
    console.error(error);

    // Handle validation errors with appropriate status code
    if (error.message && error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
});

router.get('/gcf-category-count', async (req, res, next) => {
  try {
    const catInfo = await bgcService.getGcfCategoryCounts();
    res.json(catInfo);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get('/pc-product-count', async (req, res, next) => {
  try {
    // Let the service layer handle validation
    const gcfId = req.query.gcf || null;
    const samples = req.query.samples || null;

    const productCount = await bgcService.getProductCounts(gcfId, samples);
    res.json(productCount);
  } catch (error) {
    console.error(error);

    // Handle validation errors with appropriate status code
    if (error.message && error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
});

router.get('/pc-taxonomic-count', async (req, res, next) => {
  try {
    // Let the service layer handle validation
    const gcfId = req.query.gcf || null;
    const samples = req.query.samples || null;

    const taxonomicCount = await bgcService.getTaxonomicCounts(gcfId, samples);
    res.json(taxonomicCount);
  } catch (error) {
    console.error(error);

    // Handle validation errors with appropriate status code
    if (error.message && error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
});

router.get('/bgc-table', async (req, res, next) => {
  try {
    // Safely access nested properties
    const searchValue = req.query.search && req.query.search.value ? req.query.search.value : null;

    // Let the service layer handle validation of all parameters
    const options = {
      gcf: req.query.gcf || null,
      samples: req.query.samples || null,
      showCoreMembers: req.query.showCoreMembers === 'true',
      showNonPutativeMembers: req.query.showNonPutativeMembers === 'true',
      draw: req.query.draw || '1',
      start: req.query.start || '0',
      length: req.query.length || '10',
      searchValue: searchValue,
      order: req.query.order || [],
      searchBuilder: req.query.searchBuilder || null
    };

    const result = await bgcService.getBgcTable(options);
    res.json(result);
  } catch (error) {
    console.error(error);

    // Handle validation errors with appropriate status code
    if (error.message && error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
});

module.exports = router;
