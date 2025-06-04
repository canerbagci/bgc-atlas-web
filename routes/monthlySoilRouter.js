const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const BASE_DIR = '/ceph/ibmi/tgm/bgc-atlas/monthly-soil';
const FULL_AS_DIR = path.join(BASE_DIR, 'full-AS');
const PRODUCT_AS_DIR = path.join(BASE_DIR, 'product-AS');

/* ───────────────────────────── helpers ────────────────────────────── */

async function listMonths(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name).sort();
  } catch (err) {
    console.error(`Error reading directory ${directory}:`, err);
    return [];
  }
}

async function listDatasets(monthDir) {
  try {
    const entries = await fs.readdir(monthDir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name).sort();
  } catch (err) {
    console.error(`Error reading directory ${monthDir}:`, err);
    return [];
  }
}

async function listProductTypes(monthDir) {
  try {
    const entries = await fs.readdir(monthDir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name).sort();
  } catch (err) {
    console.error(`Error reading directory ${monthDir}:`, err);
    return [];
  }
}

async function countBGCs(datasetPath) {
  try {
    // Look for files matching the pattern "*regionXXX.gbk"
    const files = await fs.readdir(datasetPath, { withFileTypes: true });
    const bgcCount = files.filter(file => 
      !file.isDirectory() && file.name.match(/.*region\d+\.gbk$/i)
    ).length;
    return bgcCount;
  } catch (err) {
    console.error(`Error counting BGCs in ${datasetPath}:`, err);
    return 0;
  }
}

async function getDatasetDetails(baseDir, month, datasets) {
  const detailedDatasets = [];

  for (const dataset of datasets) {
    const datasetPath = path.join(baseDir, month, dataset);
    const bgcCount = await countBGCs(datasetPath);

    detailedDatasets.push({
      name: dataset,
      bgcCount,
      path: `/monthly-soil/${baseDir.includes('full-AS') ? 'full-AS' : 'product-AS'}/${month}/${dataset}/index.html`
    });
  }

  return detailedDatasets;
}

/* ───────────────────────────── routes ─────────────────────────────── */

// 1. Landing page - links to full-AS and product-AS
router.get('/monthly-soil/?', async (_req, res, next) => {
  try {
    const fullMonths = await listMonths(FULL_AS_DIR);
    const productMonths = await listMonths(PRODUCT_AS_DIR);

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
    const datasetNames = await listDatasets(monthDir);
    const datasets = await getDatasetDetails(FULL_AS_DIR, month, datasetNames);

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
    const monthDir = path.join(PRODUCT_AS_DIR, month);
    const productTypes = await listProductTypes(monthDir);

    // Create an array to hold all product types with their datasets
    const productTypesWithDatasets = [];

    // For each product type, get all datasets and their details
    for (const productType of productTypes) {
      const productTypeDir = path.join(PRODUCT_AS_DIR, month, productType);
      const datasetNames = await listDatasets(productTypeDir);

      // Get detailed dataset information
      const datasets = [];
      for (const datasetName of datasetNames) {
        const datasetPath = path.join(productTypeDir, datasetName);
        const bgcCount = await countBGCs(datasetPath);

        datasets.push({
          name: datasetName,
          bgcCount,
          path: `/monthly-soil/product-AS/${month}/${productType}/${datasetName}/index.html`
        });
      }

      // Add product type with its datasets to the array
      productTypesWithDatasets.push({
        name: productType,
        datasets
      });
    }

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
