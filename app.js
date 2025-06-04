const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const geoip = require('geoip-lite');
const helmet = require('helmet');


// Import database configuration
require('./config/database');

const indexRouter = require('./routes/index');

const app = express();
app.use(helmet());

const ultraDeepSoilRouter = require('./routes/ultraDeepSoilRouter');
const monthlySoilRouter = require('./routes/monthlySoilRouter');
app.use('/', ultraDeepSoilRouter);
app.use('/', monthlySoilRouter);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Create a custom token for geolocation
logger.token('geolocation', function (req, res) {
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || '';
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
logger.format('botAware', function(tokens, req, res) {
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

// Use the custom format
app.use(logger('botAware'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/AS/:dataset', (req, res) => {
  const dataset = req.params.dataset;
  console.log("serving dataset: " + dataset);
  res.redirect('/datasets/' + dataset + '/antismash/index.html');
});


app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
