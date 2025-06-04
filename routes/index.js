var express = require('express');
var router = express.Router();
const pug = require('pug');
const bodyParser = require('body-parser');
const multer = require('multer'); // For handling file uploads
const path = require('path');
var sitemap = require('express-sitemap');

// Import services
const mapService = require('../services/mapService');
const sampleService = require('../services/sampleService');
const bgcService = require('../services/bgcService');
const searchService = require('../services/searchService');
const cacheService = require('../services/cacheService');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('map', { 
    title: 'Interactive Map', 
    metaDescription: 'Explore the global distribution of biosynthetic gene clusters (BGCs) with our interactive map visualization tool.',
    activePage: 'home' 
  });
});

router.get('/map', (req, res) => {
  res.render('map', { 
    title: 'Interactive Map', 
    metaDescription: 'Explore the global distribution of biosynthetic gene clusters (BGCs) with our interactive map visualization tool.',
    activePage: 'home' 
  });
});

router.get('/samples', (req, res) => {
  res.render('samples', { 
    title: 'Sample Database', 
    metaDescription: 'Browse and search our comprehensive database of environmental samples containing biosynthetic gene clusters from around the world.',
    activePage: 'samples' 
  });
});

router.get('/bgcs', (req, res) => {
  res.render('bgcs', { 
    title: 'Biosynthetic Gene Clusters', 
    metaDescription: 'Explore our collection of biosynthetic gene clusters (BGCs) that encode for the production of secondary metabolites.',
    activePage: 'bgcs' 
  });
});

router.get('/gcfs', (req, res) => {
  res.render('gcfs', { 
    title: 'Gene Cluster Families', 
    metaDescription: 'Discover gene cluster families (GCFs) that group similar biosynthetic gene clusters based on sequence similarity and functional characteristics.',
    activePage: 'gcfs' 
  });
});

router.get('/search', (req, res) => {
  res.render('search', {
    title: 'Advanced Search', 
    metaDescription: 'Powerful search tools to find specific biosynthetic gene clusters, samples, and gene cluster families in our database.',
    activePage: 'search' 
  });
});

router.get('/imprint', (req, res) => {
  res.render('imprint', { 
    title: 'Imprint', 
    metaDescription: 'Legal information about the BGC Atlas website, including contact details and responsible parties.',
    activePage: 'imprint' 
  });
});

router.get('/privacy', (req, res) => {
  res.render('privacy', { 
    title: 'Privacy Policy', 
    metaDescription: 'Information about how we collect, use, and protect your data when you use the BGC Atlas website.',
    activePage: 'privacy' 
  });
});

router.get('/antismash', (req, res) => {
  console.log("dataset:" + req.query.dataset);
  res.render('antismash', {
    title: 'antiSMASH Analysis', 
    metaDescription: 'View detailed antiSMASH analysis results for biosynthetic gene clusters in our database.',
    dataset: req.query.dataset, 
    anchor: req.query.anchor, 
    activePage: 'antismash'
  });
});

router.get('/downloads', (req, res) => {
  res.render('downloads', { 
    title: 'Data Downloads', 
    metaDescription: 'Download and analysis results from the BGC Atlas database for your research.',
    activePage: 'downloads' 
  });
});

router.get('/about', (req, res) => {
  res.render('about', { 
    title: 'About BGC Atlas', 
    metaDescription: 'Learn about the BGC Atlas project.',
    activePage: 'about' 
  });
});

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

var map = sitemap({
  generate: router,
  http: 'https',
  url: process.env.APP_URL
});


// Middleware to parse JSON and URL-encoded form data
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// // Middleware to handle file uploads (adjust the storage options as needed)
// const storage = multer.memoryStorage(); // Store files in memory
// const upload = multer({ storage: storage });

const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create the upload directory once per request
    if (!req.uploadDir) {
      const baseUploadPath = '/ceph/ibmi/tgm/bgc-atlas/search/uploads';
      req.uploadDir = searchService.createTimestampedDirectory(baseUploadPath);
    }
    cb(null, req.uploadDir);
  },
  filename: function (req, file, cb) {
    let safeName = path.basename(file.originalname);
    safeName = safeName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${uuidv4()}_${safeName}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.gbk' || ext === '.genbank') {
      cb(null, true);
    } else {
      cb(new Error('Only .gbk or .genbank files are allowed'));
    }
  }
}).array('file', 100); // Limit to 20 files

let clients = [];

// SSE route
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };
  clients.push(newClient);

  req.on('close', () => {
    clients = clients.filter(client => client.id !== clientId);
  });
});

// Function to send events to clients
function sendEvent(message) {
  clients.forEach(client => client.res.write(`data: ${JSON.stringify(message)}\n\n`));
}


router.post('/upload', (req, res) => {
  sendEvent({ status: 'Uploading' });

  upload(req, res, async (err) => {
    if (err) {
      sendEvent({ status: 'Error', message: err.message });
      const status = err.message.includes('.gbk') || err.message.includes('.genbank') ? 400 : 500;
      return res.status(status).json({ error: err.message });
    }

    try {
      const records = await searchService.processUploadedFiles(req, sendEvent);
      res.json(records);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  });
});

router.get('/sitemap.xml', function (req,res) {
  map.XMLtoWeb(res);
}).get('/robots.txt', function (req, res) {
  map.TXTtoWeb(res);
});

//EXPERIMENTAL

router.get('/body', (req, res) => {
  res.render('body', {
    title: 'Body Map Visualization',
    metaDescription: 'Interactive visualization of biosynthetic gene clusters found in human body-associated microbiomes.',
    activePage: 'body'
  });
  // map.XMLtoWeb(res);
});

router.get('/test', (req, res) => {
  res.render('test', {
    title: 'Test Page',
    metaDescription: 'Test page for development purposes.',
    activePage: 'test'
  });
});

router.get('/map-data-gcf', async (req, res) => {
  try {
    const gcfId = req.query.gcf ? parseInt(req.query.gcf, 10) : null;
    if (req.query.gcf && isNaN(gcfId)) {
      return res.status(400).json({ error: 'Invalid gcf parameter' });
    }

    const samples = req.query.samples ? req.query.samples.split(',') : null;
    const data = await mapService.getMapDataForGcf(gcfId, samples);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/getBgcId', async (req, res) => {
  try {
    console.log("getBgcId " + req.query.dataset + " " + req.query.anchor);
    const { dataset, anchor } = req.query;
    const result = await sampleService.getBgcId(dataset, anchor);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database query failed" });
  }
});

router.get('/map-data', async (req, res) => {
  try {
    const data = await mapService.getMapData();
    console.log("rows length: " + data.length);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/body-map-data', async (req, res) => {
  try {
    console.log("querying body map data");
    const data = await mapService.getBodyMapData();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/filter/:column', async (req, res) => {
  try {
    const data = await mapService.getFilteredMapData(req.params.column);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/column-values/:column', async (req, res) => {
  try {
    const column = req.params.column;
    const data = await mapService.getColumnValues(column);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/sample-info', async (req, res) => {
  try {
    const sampleInfo = await sampleService.getSampleInfo();
    res.json(sampleInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/sample-data', async (req, res) => {
  try {
    // Extract pagination parameters from the request
    const options = {
      draw: parseInt(req.query.draw) || 1,
      start: parseInt(req.query.start) || 0,
      length: parseInt(req.query.length) || 50,
      searchValue: req.query.search ? req.query.search.value : '',
      order: []
    };

    // Process order parameters from DataTables
    if (req.query.order) {
      for (let i = 0; i < Object.keys(req.query.order).length; i++) {
        if (req.query.order[i] && req.query.order[i].column !== undefined) {
          options.order.push({
            column: req.query.order[i].column,
            dir: req.query.order[i].dir
          });
        }
      }
    }

    // Log pagination parameters for debugging
    console.log('Pagination options:', {
      draw: options.draw,
      start: options.start,
      length: options.length,
      searchValue: options.searchValue,
      orderLength: options.order.length
    });

    // Get paginated data
    const result = await sampleService.getPaginatedSampleData(options);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/sample-data-2', async (req, res) => {
  try {
    const rows = await sampleService.getSampleData2();
    res.json({ data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/bgc-info', async (req, res) => {
  try {
    const gcfId = req.query.gcf ? parseInt(req.query.gcf, 10) : null;
    if (req.query.gcf && isNaN(gcfId)) {
      return res.status(400).json({ error: 'Invalid gcf parameter' });
    }

    const samples = req.query.samples ? req.query.samples.split(',') : null;
    const bgcInfo = await bgcService.getBgcInfo(gcfId, samples);
    res.json(bgcInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/pc-category-count', async (req, res) => {
  try {
    const gcfId = req.query.gcf ? parseInt(req.query.gcf, 10) : null;
    if (req.query.gcf && isNaN(gcfId)) {
      return res.status(400).json({ error: 'Invalid gcf parameter' });
    }

    const samples = req.query.samples ? req.query.samples.split(',') : null;
    const categoryCount = await bgcService.getProductCategoryCounts(gcfId, samples);
    res.json(categoryCount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});
router.get('/gcf-category-count', async (req, res) => {
  try {
    const catInfo = await bgcService.getGcfCategoryCounts();
    res.json(catInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/pc-product-count', async (req, res) => {
  try {
    const gcfId = req.query.gcf ? parseInt(req.query.gcf, 10) : null;
    if (req.query.gcf && isNaN(gcfId)) {
      return res.status(400).json({ error: 'Invalid gcf parameter' });
    }

    const samples = req.query.samples ? req.query.samples.split(',') : null;
    const productCount = await bgcService.getProductCounts(gcfId, samples);
    res.json(productCount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/gcf-count-hist', async (req, res) => {
  try {
    const bgcInfo = await bgcService.getGcfCountHistogram();
    res.json(bgcInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/gcf-table-sunburst', async (req, res) => {
  try {
    const gcfId = req.query.gcf ? parseInt(req.query.gcf, 10) : null;
    if (req.query.gcf && isNaN(gcfId)) {
      return res.status(400).json({ error: 'Invalid gcf parameter' });
    }

    const samples = req.query.samples ? req.query.samples.split(',') : null;
    const sunburstData = await bgcService.getGcfTableSunburst(gcfId, samples);
    res.json(sunburstData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query error' });
  }
});

router.get('/gcf-table', async (req, res) => {
  try {
    const rows = await bgcService.getGcfTable();
    res.json({ data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


router.get('/bgc-table', async (req, res) => {
  try {
    const options = {
      gcf: req.query.gcf,
      samples: req.query.samples,
      showCoreMembers: req.query.showCoreMembers === 'true',
      showNonPutativeMembers: req.query.showNonPutativeMembers === 'true',
      draw: req.query.draw,
      start: parseInt(req.query.start),
      length: parseInt(req.query.length),
      searchValue: req.query.search.value,
      order: req.query.order || [],
      searchBuilder: req.query.searchBuilder
    };

    console.log("search: " + options.searchValue);
    console.log('Search Builder Params:', options.searchBuilder);
    console.log("gcf: " + options.gcf);

    const result = await bgcService.getBgcTable(options);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// This function has been moved to searchService.js

module.exports = router;
