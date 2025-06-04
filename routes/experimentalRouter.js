const express = require('express');
const router = express.Router();

/* ───────────────────────────── Experimental Routes ─────────────────────────────── */

router.get('/body', (req, res) => {
  res.render('body', {
    title: 'Body Map Visualization',
    metaDescription: 'Interactive visualization of biosynthetic gene clusters found in human body-associated microbiomes.',
    activePage: 'body'
  });
});

router.get('/test', (req, res) => {
  res.render('test', {
    title: 'Test Page',
    metaDescription: 'Test page for development purposes.',
    activePage: 'test'
  });
});

module.exports = router;