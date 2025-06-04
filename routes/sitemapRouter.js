const express = require('express');
const router = express.Router();
var sitemap = require('express-sitemap');

/* ───────────────────────────── Sitemap Routes ─────────────────────────────── */

var map = sitemap({
  generate: router,
  http: 'https',
  url: process.env.APP_URL
});

router.get('/sitemap.xml', function (req, res) {
  map.XMLtoWeb(res);
});

router.get('/robots.txt', function (req, res) {
  map.TXTtoWeb(res);
});

module.exports = router;