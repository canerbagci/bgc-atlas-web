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
      title: 'Monthly Soil Samples',
      metaDescription: 'Browse monthly soil sample collections with antiSMASH analysis results for biosynthetic gene clusters.',
      activePage: 'monthlySoil',
      fullMonths, 
      productMonths 
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

// 2. Full-AS month index page
router.get('/monthly-soil/full-AS/:month/?', async (req, res, next) => {
  try {
    const month = req.params.month;
    const monthDir = path.join(FULL_AS_DIR, month);
    const datasetNames = await monthlySoilService.listDatasets(monthDir);
    const datasets = await monthlySoilService.getDatasetDetails(FULL_AS_DIR, month, datasetNames);

    res.render('fullASMonth', {
      title: `Full antiSMASH Analysis - ${month}`,
      metaDescription: `Complete antiSMASH analysis results for soil samples collected in ${month}, showing all detected biosynthetic gene clusters.`,
      activePage: 'monthlySoil',
      month,
      datasets
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

// 3. Product-AS month index page
router.get('/monthly-soil/product-AS/:month/?', async (req, res, next) => {
  try {
    const month = req.params.month;
    const productTypesWithDatasets = await monthlySoilService.getProductTypesWithDatasets(month);

    res.render('productASMonth', {
      title: `Product Analysis - ${month}`,
      metaDescription: `Product-focused antiSMASH analysis for soil samples collected in ${month}, categorized by secondary metabolite types.`,
      activePage: 'monthlySoil',
      month,
      productTypesWithDatasets
    });
  } catch (err) {
    console.error(err);
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
