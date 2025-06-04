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

/* ───────────────────────────── routes ─────────────────────────────── */

// 1. Landing page - links to full-AS and product-AS
router.get('/monthly-soil/?', async (_req, res, next) => {
  try {
    const fullMonths = await listMonths(FULL_AS_DIR);
    const productMonths = await listMonths(PRODUCT_AS_DIR);

    res.type('html').send(`<!doctype html>
      <html><head><meta charset="utf-8"><title>Monthly Soil BGC Data</title>
      <style>
        body { font-family: sans-serif; margin: 2rem; line-height: 1.5; }
        h1 { margin-top: 0; color: #2c3e50; }
        h2 { color: #3498db; margin-top: 2rem; }
        .container { max-width: 1000px; margin: 0 auto; }
        .description { background: #f8f9fa; padding: 1rem; border-radius: 5px; margin-bottom: 1.5rem; }
        ul { padding-left: 1.5rem; }
        a { color: #2980b9; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
      </head><body>
        <div class="container">
          <h1>Monthly Soil BGC Catalogue</h1>

          <div class="description">
            <p>Schönbuch monthly soil sampling data</p>
          </div>

          <h2>Complete antiSMASH Results</h2>
          <p>Full antiSMASH results for each dataset by month:</p>
          <ul>
            ${fullMonths.map(month =>
    `<li><a href="/monthly-soil/full-AS/${month}/">${month.toUpperCase()}</a></li>`
  ).join('\n')}
          </ul>

          <h2>Product-Specific Results</h2>
          <p>Results filtered by specific BGC product types:</p>
          <ul>
            ${productMonths.map(month =>
    `<li><a href="/monthly-soil/product-AS/${month}/">${month.toUpperCase()}</a></li>`
  ).join('\n')}
          </ul>
        </div>
      </body></html>`);
  } catch (err) { next(err); }
});

// 2. Full-AS month index page
router.get('/monthly-soil/full-AS/:month/?', async (req, res, next) => {
  try {
    const month = req.params.month;
    const monthDir = path.join(FULL_AS_DIR, month);
    const datasets = await listDatasets(monthDir);

    res.type('html').send(`<!doctype html>
      <html><head><meta charset="utf-8"><title>${month.toUpperCase()} - Full antiSMASH Results</title>
      <style>
        body { font-family: sans-serif; margin: 2rem; line-height: 1.5; }
        h1 { margin-top: 0; color: #2c3e50; }
        .container { max-width: 1000px; margin: 0 auto; }
        .back-link { margin-bottom: 1rem; display: block; }
        ul { padding-left: 1.5rem; column-count: 3; }
        @media (max-width: 768px) { ul { column-count: 2; } }
        @media (max-width: 480px) { ul { column-count: 1; } }
        a { color: #2980b9; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
      </head><body>
        <div class="container">
          <a href="/monthly-soil/" class="back-link">← Back to Monthly Soil Index</a>
          <h1>${month.toUpperCase()} - Full antiSMASH Results (${datasets.length} datasets)</h1>
          <ul>
            ${datasets.map(dataset => `<li><a href="/monthly-soil/full-AS/${month}/${dataset}/index.html">${dataset}</a></li>`).join('\n')}
          </ul>
        </div>
      </body></html>`);
  } catch (err) { next(err); }
});

// 3. Product-AS month index page
router.get('/monthly-soil/product-AS/:month/?', async (req, res, next) => {
  try {
    const month = req.params.month;
    const monthDir = path.join(PRODUCT_AS_DIR, month);
    const productTypes = await listProductTypes(monthDir);

    res.type('html').send(`<!doctype html>
      <html><head><meta charset="utf-8"><title>${month.toUpperCase()} - Product-Specific Results</title>
      <style>
        body { font-family: sans-serif; margin: 2rem; line-height: 1.5; }
        h1 { margin-top: 0; color: #2c3e50; }
        .container { max-width: 1000px; margin: 0 auto; }
        .back-link { margin-bottom: 1rem; display: block; }
        ul { padding-left: 1.5rem; }
        a { color: #2980b9; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
      </head><body>
        <div class="container">
          <a href="/monthly-soil/" class="back-link">← Back to Monthly Soil Index</a>
          <h1>${month.toUpperCase()} - Product-Specific Results</h1>
          <p>Select a product type:</p>
          <ul>
            ${productTypes.map(productType => `<li><a href="/monthly-soil/product-AS/${month}/${productType}/">${productType}</a></li>`).join('\n')}
          </ul>
        </div>
      </body></html>`);
  } catch (err) { next(err); }
});

// 4. Product-AS product type index page
router.get('/monthly-soil/product-AS/:month/:productType/?', async (req, res, next) => {
  try {
    const { month, productType } = req.params;
    const productTypeDir = path.join(PRODUCT_AS_DIR, month, productType);
    const datasets = await listDatasets(productTypeDir);

    res.type('html').send(`<!doctype html>
      <html><head><meta charset="utf-8"><title>${productType} Results - ${month.toUpperCase()}</title>
      <style>
        body { font-family: sans-serif; margin: 2rem; line-height: 1.5; }
        h1 { margin-top: 0; color: #2c3e50; }
        .container { max-width: 1000px; margin: 0 auto; }
        .back-link { margin-bottom: 1rem; display: block; }
        ul { padding-left: 1.5rem; column-count: 3; }
        @media (max-width: 768px) { ul { column-count: 2; } }
        @media (max-width: 480px) { ul { column-count: 1; } }
        a { color: #2980b9; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
      </head><body>
        <div class="container">
          <a href="/monthly-soil/product-AS/${month}/" class="back-link">← Back to ${month.toUpperCase()} Product Types</a>
          <h1>${productType} Results - ${month.toUpperCase()} (${datasets.length} datasets)</h1>
          <ul>
            ${datasets.map(dataset => `<li><a href="/monthly-soil/product-AS/${month}/${productType}/${dataset}/index.html">${dataset}</a></li>`).join('\n')}
          </ul>
        </div>
      </body></html>`);
  } catch (err) { next(err); }
});

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