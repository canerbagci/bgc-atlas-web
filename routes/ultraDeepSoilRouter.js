const express = require('express');
const path = require('path');
const ultraDeepSoilService = require('../services/ultraDeepSoilService');

const router = express.Router();
const { BASE_DIR, MAGS_DIR, META_DIR } = ultraDeepSoilService;

/* ───────────────────────────── routes ─────────────────────────────── */

// 1. Landing page – links to metagenome + mags
router.get('/ultra-deep-soil/?', async (_req, res, next) => {
  try {
    const dirs = await ultraDeepSoilService.listMagDirectories();
    const magCount = dirs.length;
    const html = ultraDeepSoilService.generateIndexHtml(magCount);
    res.type('html').send(html);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

// 2. MAGs index page
router.get('/ultra-deep-soil/mags/?', async (_req, res, next) => {
  try {
    const dirs = await ultraDeepSoilService.listMagDirectories();
    const html = ultraDeepSoilService.generateMagListHtml(dirs);
    res.type('html').send(html);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

// 3a. Serve /ultra-deep-soil/metagenome/***  (raw antiSMASH output)
router.use(
  '/ultra-deep-soil/metagenome',
  express.static(META_DIR, { index: 'index.html' })   // antiSMASH ships its own index.html
);

// 3b. Serve /ultra-deep-soil/mags/***  (all MAG folders)
//     – our list route (2) is defined *before* this, so it wins for `/mags/`.
router.use(
  '/ultra-deep-soil/mags',
  express.static(MAGS_DIR, { index: 'index.html' })   // every MAG’s antiSMASH output lives here
);

// 4. Fallback: serve anything else under /ultra-deep-soil
router.use(
  '/ultra-deep-soil',
  express.static(BASE_DIR, { index: false })
);

module.exports = router;
