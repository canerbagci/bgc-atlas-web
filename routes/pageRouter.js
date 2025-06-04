const express = require('express');
const router = express.Router();

/* ───────────────────────────── Page Routes ─────────────────────────────── */

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('map', { 
    title: 'Home',
    metaDescription: 'Explore the global distribution of biosynthetic gene clusters (BGCs) with our interactive map visualization tool.',
    activePage: 'home' 
  });
});

router.get('/map', (req, res) => {
  res.render('map', { 
    title: 'Home',
    metaDescription: 'Explore the global distribution of biosynthetic gene clusters (BGCs) with our interactive map visualization tool.',
    activePage: 'home' 
  });
});

router.get('/samples', (req, res) => {
  res.render('samples', { 
    title: 'Samples',
    metaDescription: 'Browse and search our comprehensive database of environmental samples containing biosynthetic gene clusters from around the world.',
    activePage: 'samples' 
  });
});

router.get('/bgcs', (req, res) => {
  res.render('bgcs', { 
    title: 'BGCs',
    metaDescription: 'Explore our collection of biosynthetic gene clusters (BGCs) that encode for the production of secondary metabolites.',
    activePage: 'bgcs' 
  });
});

router.get('/gcfs', (req, res) => {
  res.render('gcfs', { 
    title: 'GCFs',
    metaDescription: 'Discover gene cluster families (GCFs) that group similar biosynthetic gene clusters based on sequence similarity and functional characteristics.',
    activePage: 'gcfs' 
  });
});

router.get('/search', (req, res) => {
  res.render('search', {
    title: 'Search',
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
    title: 'Downloads',
    metaDescription: 'Download and analysis results from the BGC Atlas database for your research.',
    activePage: 'downloads' 
  });
});

router.get('/about', (req, res) => {
  res.render('about', { 
    title: 'About',
    metaDescription: 'Learn about the BGC Atlas project.',
    activePage: 'about' 
  });
});

module.exports = router;