const express = require('express');
const router = express.Router();
const bgcService = require('../services/bgcService');

/* ───────────────────────────── GCF Routes ─────────────────────────────── */

router.get('/gcf-count-hist', async (req, res) => {
  try {
    const bgcInfo = await bgcService.getGcfCountHistogram();
    res.json(bgcInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/gcf-table-sunburst', async (req, res) => {
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
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/gcf-table', async (req, res) => {
  try {
    const rows = await bgcService.getGcfTable();
    res.json({ data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;