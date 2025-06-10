const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const logger = require('./utils/logger');
const { sanitizeMessage } = require('./utils/sanitize');
const geoip = require('geoip-lite');
const compression = require('compression');
const etagMiddleware = require('./services/etagMiddleware');
const csrf = require('csurf');
const helmet = require('helmet');
// Rate limiting is implemented in individual router files using the middleware from services/rateLimitMiddleware.js
require('dotenv').config();


// Import database configuration
require('./config/database');

// Import scheduler service
const schedulerService = require('./services/schedulerService');

const pageRouter = require('./routes/pageRouter');
const cacheRouter = require('./routes/cacheRouter');
const mapRouter = require('./routes/mapRouter');
const sampleRouter = require('./routes/sampleRouter');
const bgcRouter = require('./routes/bgcRouter');
const gcfRouter = require('./routes/gcfRouter');
const uploadRouter = require('./routes/uploadRouter');
const sitemapRouter = require('./routes/sitemapRouter');
const experimentalRouter = require('./routes/experimentalRouter');
const ultraDeepSoilRouter = require('./routes/ultraDeepSoilRouter');
const monthlySoilRouter = require('./routes/monthlySoilRouter');
const jobRouter = require('./routes/jobRouter');

const app = express();
app.locals.APP_URL = process.env.APP_URL || '';
app.locals.MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true' || false;
app.set('trust proxy', 1); // Trust X-Forwarded-For header for rate limiting behind proxy
app.use(compression()); // Add compression middleware for faster JSON responses
app.use(etagMiddleware);
app.use(cookieParser());


// Configure helmet for security headers including CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "code.jquery.com", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "cdn.datatables.net", "unpkg.com", "d3js.org"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "cdn.datatables.net", "stackpath.bootstrapcdn.com", "unpkg.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "cdn.datatables.net", "stackpath.bootstrapcdn.com", "unpkg.com"],
      imgSrc: ["'self'", "data:", "*.basemaps.cartocdn.com", "unpkg.com", "cdnjs.cloudflare.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Setup CSRF protection
const csrfProtection = csrf({ 
  cookie: true,
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  value: req => {
    return req.body._csrf || 
           req.query._csrf || 
           req.headers['csrf-token'] || 
           req.headers['x-csrf-token'] || 
           req.headers['x-xsrf-token'] ||
           req.headers['xsrf-token'];
  }
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Create a custom token for geolocation
morgan.token('geolocation', function (req, res) {
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  const headerIp = forwarded ? forwarded.split(',')[0].trim() : null;
  const ip = headerIp || req.ip || (req.connection && req.connection.remoteAddress) || '';
  // Remove IPv6 prefix if present
  const cleanIp = ip.replace(/^::ffff:/, '');
  const geo = geoip.lookup(cleanIp);
  if (geo) {
    return `${geo.country}, ${geo.region}, ${geo.city}`;
  }
  return 'Unknown location';
});

// Function to check if user agent is a bot
const isBot = (userAgent) => {
  if (!userAgent) return false;
  const botPatterns = [
    'bot', 'spider', 'crawler', 'scraper', 'slurp', 'baidu', 'yandex',
    'googlebot', 'bingbot', 'yahoo', 'duckduckbot', 'facebookexternalhit',
    'semrushbot', 'ahrefsbot', 'mj12bot', 'ia_archiver'
  ];
  const lowerUA = userAgent.toLowerCase();
  return botPatterns.some(pattern => lowerUA.includes(pattern));
};

// Create a custom format function that wraps the output in italic if it's a bot
morgan.format('botAware', function(tokens, req, res) {
  const userAgent = req.headers['user-agent'] || '';
  const isUserBot = isBot(userAgent);

  // Standard combined format with geolocation
  const logEntry = [
    tokens['remote-addr'](req, res),
    '-',
    tokens['remote-user'](req, res),
    '[' + tokens['date'](req, res, 'clf') + ']',
    '"' + tokens['method'](req, res) + ' ' + tokens['url'](req, res) + ' HTTP/' + tokens['http-version'](req, res) + '"',
    tokens['status'](req, res),
    tokens['res'](req, res, 'content-length'),
    '"' + tokens['referrer'](req, res) + '"',
    '"' + tokens['user-agent'](req, res) + '"',
    tokens['geolocation'](req, res)
  ].join(' ');

  // If it's a bot, wrap the log entry in ANSI italic codes
  if (isUserBot) {
    return '\x1b[3m' + logEntry + '\x1b[0m'; // ANSI codes for italic
  }

  return logEntry;
});

// Use the custom format and direct output to winston
app.use(morgan('botAware', { stream: logger.stream }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Apply CSRF protection to all routes except cache invalidation and file upload
app.use(function(req, res, next) {
  // Skip CSRF for cache invalidation endpoint
  if (req.path === '/cache-invalidate') {
    return next();
  }

  // Skip CSRF for upload endpoint (handled separately in uploadRouter)
  if (req.path === '/upload' && req.method === 'POST') {
    return next();
  }

  // Apply CSRF protection
  csrfProtection(req, res, function(err) {
    if (err) {
      logger.error('CSRF error:', err);
      // For GET requests, continue even if there's a CSRF error
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }
      // For other methods, return the error
      return next(err);
    }
    next();
  });
});

// Make CSRF token available to all views
app.use(function(req, res, next) {
  if (req.csrfToken) {
    try {
      res.locals.csrfToken = req.csrfToken();
    } catch (e) {
      logger.error('Error generating CSRF token:', e);
      res.locals.csrfToken = '';
    }
  } else {
    res.locals.csrfToken = '';
  }
  next();
});

// Mount all routers
app.use('/', pageRouter);
app.use('/', cacheRouter);
app.use('/', mapRouter);
app.use('/', sampleRouter);
app.use('/', bgcRouter);
app.use('/', gcfRouter);
app.use('/', uploadRouter);
app.use('/', sitemapRouter);
app.use('/', experimentalRouter);
app.use('/', ultraDeepSoilRouter);
app.use('/', monthlySoilRouter);
app.use('/jobs', jobRouter);

// Start the scheduler
schedulerService.start().catch(err => {
  logger.error(`Failed to start scheduler: ${err.message}`);
});

app.get('/AS/:dataset', (req, res) => {
  const dataset = req.params.dataset;
  res.redirect('/datasets/' + dataset + '/antismash/index.html');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing detailed error in development
  if (req.app.get('env') === 'development') {
    res.locals.message = sanitizeMessage(err.message);
    res.locals.error = err;
  } else {
    res.locals.message = 'An unexpected error occurred';
    res.locals.error = {};
  }

  logger.error('Unhandled error', err);

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
