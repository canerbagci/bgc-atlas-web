const express = require('express');
const router = express.Router();
const bgcService = require('../services/bgcService');
const { defaultRateLimiter } = require('../services/rateLimitMiddleware');
const logger = require('../utils/logger');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/* ───────────────────────────── GCF Routes ─────────────────────────────── */

// Apply rate limiting to all routes in this router
router.use('/gcf-count-hist', defaultRateLimiter);
router.use('/gcf-table-sunburst', defaultRateLimiter);
router.use('/gcf-table', defaultRateLimiter);

router.get('/gcf-count-hist', async (req, res, next) => {
  try {
    const bgcInfo = await bgcService.getGcfCountHistogram();
    res.json(bgcInfo);
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

router.get('/gcf-table-sunburst', async (req, res, next) => {
  try {
    const gcfId = req.query.gcf ? parseInt(req.query.gcf, 10) : null;
    if (req.query.gcf && isNaN(gcfId)) {
      return res.status(400).json({ error: 'Invalid gcf parameter' });
    }

    const samples = req.query.samples ? req.query.samples.split(',') : null;
    const sunburstData = await bgcService.getGcfTableSunburst(gcfId, samples);
    res.json(sunburstData);
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

router.get('/gcf-table', async (req, res, next) => {
  try {
    // Extract pagination parameters from the request
    const options = {
      draw: req.query.draw,
      start: parseInt(req.query.start) || 0,
      length: parseInt(req.query.length) || 10,
      order: req.query.order ? JSON.parse(req.query.order) : []
    };

    // Get paginated data from the service
    const result = await bgcService.getGcfTable(options);

    // Return the result directly (it's already in the format expected by DataTables)
    res.json(result);
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

// Route for the GCF gene view page
router.get('/gcf-gene-view', (req, res) => {
  res.render('gcf_gene_view', { title: 'GCF Gene View' });
});

// API endpoint to get BGCs and their genes for a specific GCF
router.get('/gcf-genes/:gcfId', async (req, res, next) => {
  try {
    const gcfId = parseInt(req.params.gcfId, 10);
    if (isNaN(gcfId)) {
      return res.status(400).json({ error: 'Invalid GCF ID' });
    }

    // Path to the SQLite database
    const dbPath = process.env.BIGSLICE_DB_PATH || '/ceph/ibmi/tgm/bgc-atlas/search/bigslice_2.0.0_T0.4_16April/result/data.db';

    // Import the PostgreSQL pool
    const { pool } = require('../config/database');

    // Open the SQLite database
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        logger.error(`Error opening database: ${err.message}`);
        return res.status(500).json({ error: 'Database connection error' });
      }

      // Get BGCs for the specified GCF
      const bgcQuery = `
        SELECT bgc.id, bgc.name, gcf_membership.membership_value, bgc.length_nt
        FROM gcf_membership
        JOIN bgc ON gcf_membership.bgc_id = bgc.id
        WHERE gcf_membership.gcf_id = ?
        ORDER BY gcf_membership.membership_value ASC
      `;

      db.all(bgcQuery, [gcfId], async (err, bgcs) => {
        if (err) {
          logger.error(`Error querying BGCs: ${err.message}`);
          db.close();
          return res.status(500).json({ error: 'Database query error' });
        }

        if (bgcs.length === 0) {
          db.close();
          return res.status(404).json({ error: 'No BGCs found for this GCF' });
        }

        // Get all BGC IDs
        const bgcIds = bgcs.map(bgc => bgc.id);
        const placeholders = bgcIds.map(() => '?').join(',');

        // Get genes (CDS) for all BGCs
        const cdsQuery = `
          SELECT cds.id, cds.bgc_id, cds.nt_start, cds.nt_end, cds.strand, 
                 cds.locus_tag, cds.protein_id, cds.product
          FROM cds
          WHERE cds.bgc_id IN (${placeholders})
          ORDER BY cds.bgc_id, cds.nt_start
        `;

        db.all(cdsQuery, bgcIds, async (err, genes) => {
          db.close();

          if (err) {
            logger.error(`Error querying genes: ${err.message}`);
            return res.status(500).json({ error: 'Database query error' });
          }

          try {
            // Query the PostgreSQL database to get region_id, assembly, and anchor for each BGC
            const pgQuery = `
              SELECT bgm.bgc_id, bgm.region_id, r.assembly, r.anchor
              FROM bigslice_gcf_membership bgm
              JOIN regions r ON bgm.region_id = r.region_id
              WHERE bgm.bgc_id = ANY($1)
            `;

            const pgResult = await pool.query(pgQuery, [bgcIds]);

            // Create a mapping from bgc_id to region info
            const regionMap = {};
            pgResult.rows.forEach(row => {
              regionMap[row.bgc_id] = {
                region_id: row.region_id,
                assembly: row.assembly,
                anchor: row.anchor
              };
            });

            // Group genes by BGC and add region info
            const bgcMap = {};
            bgcs.forEach(bgc => {
              bgcMap[bgc.id] = {
                ...bgc,
                genes: [],
                region_info: regionMap[bgc.id] || null
              };
            });

            genes.forEach(gene => {
              if (bgcMap[gene.bgc_id]) {
                bgcMap[gene.bgc_id].genes.push(gene);
              }
            });

            // Convert to array
            const result = Object.values(bgcMap);

            res.json(result);
          } catch (pgError) {
            logger.error(`Error querying PostgreSQL: ${pgError.message}`);
            return res.status(500).json({ error: 'Database query error' });
          }
        });
      });
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

module.exports = router;
