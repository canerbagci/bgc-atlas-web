const express = require('express');
const router = express.Router();
const bgcService = require('../services/bgcService');

/* ───────────────────────────── BGC Routes ─────────────────────────────── */

router.get('/bgc-info', async (req, res) => {
  try {
    const gcfId = req.query.gcf ? parseInt(req.query.gcf, 10) : null;
    if (req.query.gcf && isNaN(gcfId)) {
      return res.status(400).json({ error: 'Invalid gcf parameter' });
    }

    const samples = req.query.samples ? req.query.samples.split(',') : null;
    const bgcInfo = await bgcService.getBgcInfo(gcfId, samples);
    res.json(bgcInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/pc-category-count', async (req, res) => {
  try {
    const gcfId = req.query.gcf ? parseInt(req.query.gcf, 10) : null;
    if (req.query.gcf && isNaN(gcfId)) {
      return res.status(400).json({ error: 'Invalid gcf parameter' });
    }

    const samples = req.query.samples ? req.query.samples.split(',') : null;
    const categoryCount = await bgcService.getProductCategoryCounts(gcfId, samples);
    res.json(categoryCount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/gcf-category-count', async (req, res) => {
  try {
    const catInfo = await bgcService.getGcfCategoryCounts();
    res.json(catInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/pc-product-count', async (req, res) => {
  try {
    const gcfId = req.query.gcf ? parseInt(req.query.gcf, 10) : null;
    if (req.query.gcf && isNaN(gcfId)) {
      return res.status(400).json({ error: 'Invalid gcf parameter' });
    }

    const samples = req.query.samples ? req.query.samples.split(',') : null;
    const productCount = await bgcService.getProductCounts(gcfId, samples);
    res.json(productCount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/bgc-table', async (req, res) => {
  console.log("bgc-table");
  try {
    const options = {
      gcf: req.query.gcf,
      samples: req.query.samples,
      showCoreMembers: req.query.showCoreMembers === 'true',
      showNonPutativeMembers: req.query.showNonPutativeMembers === 'true',
      draw: req.query.draw,
      start: parseInt(req.query.start),
      length: parseInt(req.query.length),
      searchValue: req.query.search.value,
      order: req.query.order || [],
      searchBuilder: req.query.searchBuilder
    };

    const result = await bgcService.getBgcTable(options);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;