const fs = require('fs');
const path = require('path');
const debug = require('debug')('bgc-atlas:pathValidator');

function validateSSLCertPath(certDir) {
  if (!fs.existsSync(certDir)) {
    throw new Error(`SSL certificate directory not found: ${certDir}`);
  }
  const required = ['privkey.pem', 'fullchain.pem', 'chain.pem'];
  required.forEach(f => {
    const p = path.join(certDir, f);
    if (!fs.existsSync(p)) {
      throw new Error(`Missing SSL certificate file: ${p}`);
    }
  });
  debug(`Using SSL certificates from ${certDir}`);
}

function validateRequiredPaths() {
  const requiredEnv = {
    SEARCH_SCRIPT_PATH: process.env.SEARCH_SCRIPT_PATH,
    REPORTS_DIR: process.env.REPORTS_DIR,
  };

  for (const [name, value] of Object.entries(requiredEnv)) {
    if (!value) {
      throw new Error(`Required environment variable ${name} is not set`);
    }
    if (!fs.existsSync(value)) {
      throw new Error(`Path for ${name} does not exist: ${value}`);
    }
    debug(`${name} => ${value}`);
  }
}

module.exports = { validateSSLCertPath, validateRequiredPaths };
