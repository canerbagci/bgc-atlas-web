const https = require('https');
const fs = require('fs');
const path = require('path');
const debug = require('debug')('bgc-atlas:test');
const { validateSSLCertPath, validateRequiredPaths } = require('../utils/pathValidator');
const app = require('../app');
const logger = require('../utils/logger');

const enableSSL = process.env.ENABLE_SSL !== 'false';
const certDir = process.env.SSL_CERT_PATH || '/etc/letsencrypt/live/bgc-atlas.cs.uni-tuebingen.de';
try {
  validateRequiredPaths();
} catch (err) {
  logger.error(err.message);
  process.exit(1);
}

let credentials;
if (enableSSL) {
  try {
    validateSSLCertPath(certDir);
    const privateKey = fs.readFileSync(path.join(certDir, 'privkey.pem'), 'utf8');
    const certificate = fs.readFileSync(path.join(certDir, 'fullchain.pem'), 'utf8');
    credentials = { key: privateKey, cert: certificate };
  } catch (err) {
    logger.error(`SSL setup failed: ${err.message}. Falling back to HTTP.`);
  }
}

const port = 3000; // Use a different port than 443 for local testing

let server;
if (credentials) {
  server = https.createServer(credentials, app);
  logger.info('Starting HTTPS server for tests');
} else {
  server = require('http').createServer(app);
  logger.info('Starting HTTP server for tests');
}

server.listen(port, () => {
    debug(`Server running locally on port ${port}`);
    logger.info(`Server running locally on port ${port}`);
});
