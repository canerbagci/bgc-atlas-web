const express = require('express');
const router = express.Router();
const sampleService = require('../services/sampleService');

/* ───────────────────────────── Sample Routes ─────────────────────────────── */

router.get('/getBgcId', async (req, res) => {
  try {
    const { dataset, anchor } = req.query;
    const result = await sampleService.getBgcId(dataset, anchor);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database query failed" });
  }
});

router.get('/sample-info', async (req, res) => {
  try {
    const sampleInfo = await sampleService.getSampleInfo();
    res.json(sampleInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/sample-data', async (req, res) => {
  try {
    // Extract pagination parameters from the request
    const options = {
      draw: parseInt(req.query.draw) || 1,
      start: parseInt(req.query.start) || 0,
      length: parseInt(req.query.length) || 50,
      searchValue: req.query.search ? req.query.search.value : '',
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
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/sample-data-2', async (req, res) => {
  try {
    const rows = await sampleService.getSampleData2();
    res.json({ data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;