const express = require('express');
const path = require('path');
const monthlySoilService = require('../services/monthlySoilService');
const logger = require('../utils/logger');

const router = express.Router();
const { BASE_DIR, FULL_AS_DIR, PRODUCT_AS_DIR, NAME_REGEX } = monthlySoilService;

/* ───────────────────────────── routes ─────────────────────────────── */

// 1. Landing page - integrated view with full-AS and product-AS data
router.get('/monthly-soil/?', async (req, res, next) => {
  try {
    const fullMonths = await monthlySoilService.listMonths(FULL_AS_DIR);
    const productMonths = await monthlySoilService.listMonths(PRODUCT_AS_DIR);

    // Get data for all months
    const allFullMonthsData = [];
    const allProductMonthsData = [];

    // Fetch data for all full months
    for (const month of fullMonths) {
      const monthDir = path.join(FULL_AS_DIR, month);
      const datasetNames = await monthlySoilService.listDatasets(monthDir);
      const datasets = await monthlySoilService.getDatasetDetails(FULL_AS_DIR, month, datasetNames);

      allFullMonthsData.push({
        month,
        datasets
      });
    }

    // Fetch data for all product months
    for (const month of productMonths) {
      const productTypesWithDatasets = await monthlySoilService.getProductTypesWithDatasets(month);

      allProductMonthsData.push({
        month,
        productTypesWithDatasets
      });
    }

    res.render('monthlySoil', { 
      title: 'Monthly Soil Samples',
      metaDescription: 'Browse monthly soil sample collections with antiSMASH analysis results for biosynthetic gene clusters.',
      activePage: 'monthlySoil',
      allFullMonthsData,
      allProductMonthsData
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
});

// 2. Full-AS month index page - redirect to integrated page
router.get('/monthly-soil/full-AS/:month/?', async (req, res, next) => {
  try {
    const month = req.params.month;
    if (!NAME_REGEX.test(month)) {
      return res.status(400).send('Invalid month parameter');
    }

    // Redirect to the integrated page
    res.redirect('/monthly-soil/');
  } catch (err) {
    logger.error(err);
    next(err);
  }
});

// 3. Product-AS month index page - redirect to integrated page
router.get('/monthly-soil/product-AS/:month/?', async (req, res, next) => {
  try {
    const month = req.params.month;
    if (!NAME_REGEX.test(month)) {
      return res.status(400).send('Invalid month parameter');
    }

    // Redirect to the integrated page
    res.redirect('/monthly-soil/');
  } catch (err) {
    logger.error(err);
    next(err);
  }
});

// Note: Product-AS product type index page route removed
// Now all datasets are shown directly on the Product-AS month index page

// 5. Serve static files from the monthly-soil directory
router.use(
  '/monthly-soil/full-AS',
  express.static(FULL_AS_DIR, { index: 'index.html' })
);

router.use(
  '/monthly-soil/product-AS',
  express.static(PRODUCT_AS_DIR, { index: 'index.html' })
);

// 6. Fallback: serve anything else under /monthly-soil
router.use(
  '/monthly-soil',
  express.static(BASE_DIR, { index: false })
);

module.exports = router;
