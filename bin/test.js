const https = require('https');
const fs = require('fs');
const path = require('path');
const debug = require('debug')('bgc-atlas:test');
const { validateSSLCertPath, validateRequiredPaths } = require('../utils/pathValidator');
const app = require('../app');
const logger = require('../utils/logger');

const certDir = process.env.SSL_CERT_PATH || '/etc/letsencrypt/live/bgc-atlas.cs.uni-tuebingen.de';
try {
  validateSSLCertPath(certDir);
  validateRequiredPaths();
} catch (err) {
  logger.error(err.message);
  process.exit(1);
}

const privateKey = fs.readFileSync(path.join(certDir, 'privkey.pem'), 'utf8');
const certificate = fs.readFileSync(path.join(certDir, 'fullchain.pem'), 'utf8');

const credentials = {
    key: privateKey,
    cert: certificate
};

const port = 3000; // Use a different port than 443 for local testing

const server = https.createServer(credentials, app);

server.listen(port, () => {
    debug(`Server running locally on port ${port}`);
    logger.info(`Server running locally on port ${port}`);
});
