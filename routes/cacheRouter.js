const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');

/* ───────────────────────────── Cache Routes ─────────────────────────────── */

// Cache statistics route - only available in development mode
router.get('/cache-stats', (req, res) => {
  // Check if we're in development mode
  if (req.app.get('env') === 'development') {
    const stats = cacheService.getStats();
    res.json(stats);
  } else {
    res.status(403).json({ error: 'This route is only available in development mode' });
  }
});

// Cache invalidation route - only available in development mode
router.post('/cache-invalidate', (req, res) => {
  // Check if we're in development mode
  if (req.app.get('env') === 'development') {
    const key = req.body.key;
    if (key) {
      const result = cacheService.invalidate(key);
      res.json({ success: result, message: result ? `Cache key '${key}' invalidated` : `Cache key '${key}' not found` });
    } else {
      cacheService.invalidateAll();
      res.json({ success: true, message: 'All cache entries invalidated' });
    }
  } else {
    res.status(403).json({ error: 'This route is only available in development mode' });
  }
});

module.exports = router;
