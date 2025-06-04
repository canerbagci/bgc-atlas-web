const express = require('express');
const fs      = require('fs').promises;
const path    = require('path');

const router      = express.Router();
const BASE_DIR    = '/ceph/ibmi/tgm/bgc-atlas/ultra-deep-soil';
const MAGS_DIR    = path.join(BASE_DIR, 'mags');
const META_DIR    = path.join(BASE_DIR, 'metagenome');

/* ───────────────────────────── helpers ────────────────────────────── */

async function listMagDirectories () {
  const entries = await fs.readdir(MAGS_DIR, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => e.name).sort();
}

/* ───────────────────────────── routes ─────────────────────────────── */

// 1. Landing page – links to metagenome + mags
router.get('/ultra-deep-soil/?', async (_req, res, next) => {
  try {
    const magCount = (await listMagDirectories()).length;
    res.type('html').send(`<!doctype html>
      <html><head><meta charset="utf-8"><title>Ultra-deep-soil index</title>
      <style>body{font-family:sans-serif;margin:2rem} h1{margin-top:0}</style>
      </head><body>
        <h1>Ultra-deep-soil BGC catalogue</h1>
        <ul>
          <li><a href="ultra-deep-soil/metagenome/">metagenome</a> – antiSMASH on whole assembly</li>
          <li><a href="ultra-deep-soil/mags/">mags</a> – ${magCount} genome bins</li>
        </ul>
      </body></html>`);
  } catch (err) { next(err); }
});

// 2. MAGs index page
router.get('/ultra-deep-soil/mags/?', async (_req, res, next) => {
  try {
    const dirs = await listMagDirectories();
    const rows = dirs.map(d => `<li><a href="./${encodeURIComponent(d)}/">${d}</a></li>`).join('\n');

    res.type('html').send(`<!doctype html>
      <html><head><meta charset="utf-8"><title>MAG list</title>
      <style>body{font-family:sans-serif;margin:2rem} h1{margin-top:0}</style>
      </head><body>
        <h1>MAGs (${dirs.length})</h1>
        <ul>${rows}</ul>
      </body></html>`);
  } catch (err) { next(err); }
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
