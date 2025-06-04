const express = require('express');
const path = require('path');
const monthlySoilService = require('../services/monthlySoilService');

const router = express.Router();
const { BASE_DIR, FULL_AS_DIR, PRODUCT_AS_DIR } = monthlySoilService;

/* ───────────────────────────── routes ─────────────────────────────── */

// 1. Landing page - links to full-AS and product-AS
router.get('/monthly-soil/?', async (_req, res, next) => {
  try {
    const fullMonths = await monthlySoilService.listMonths(FULL_AS_DIR);
    const productMonths = await monthlySoilService.listMonths(PRODUCT_AS_DIR);

    res.render('monthlySoil', { 
      fullMonths, 
      productMonths 
    });
  } catch (err) { next(err); }
});

// 2. Full-AS month index page
router.get('/monthly-soil/full-AS/:month/?', async (req, res, next) => {
  try {
    const month = req.params.month;
    const monthDir = path.join(FULL_AS_DIR, month);
    const datasetNames = await monthlySoilService.listDatasets(monthDir);
    const datasets = await monthlySoilService.getDatasetDetails(FULL_AS_DIR, month, datasetNames);

    res.render('fullASMonth', {
      month,
      datasets
    });
  } catch (err) { next(err); }
});

// 3. Product-AS month index page
router.get('/monthly-soil/product-AS/:month/?', async (req, res, next) => {
  try {
    const month = req.params.month;
    const productTypesWithDatasets = await monthlySoilService.getProductTypesWithDatasets(month);

    res.render('productASMonth', {
      month,
      productTypesWithDatasets
    });
  } catch (err) { next(err); }
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
