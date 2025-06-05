const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateSSLCertPath, validateRequiredPaths } = require('../utils/pathValidator');

describe('validateSSLCertPath', () => {
  it('throws when directory is missing', () => {
    expect(() => validateSSLCertPath('/non/existent')).toThrow('SSL certificate directory not found');
  });

  it('passes when directory and files exist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cert-'));
    fs.writeFileSync(path.join(dir, 'privkey.pem'), 'key');
    fs.writeFileSync(path.join(dir, 'fullchain.pem'), 'cert');

    expect(() => validateSSLCertPath(dir)).not.toThrow();

    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('validateRequiredPaths', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws when env vars are missing', () => {
    delete process.env.SEARCH_SCRIPT_PATH;
    delete process.env.REPORTS_DIR;
    expect(() => validateRequiredPaths()).toThrow('SEARCH_SCRIPT_PATH');
  });

  it('throws when paths do not exist', () => {
    process.env.SEARCH_SCRIPT_PATH = '/no/script';
    process.env.REPORTS_DIR = '/no/reports';
    expect(() => validateRequiredPaths()).toThrow('does not exist');
  });

  it('passes with valid paths', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'validator-'));
    const script = path.join(tmp, 'script.sh');
    fs.writeFileSync(script, '#!/bin/bash');
    const reports = fs.mkdtempSync(path.join(os.tmpdir(), 'reports-'));

    process.env.SEARCH_SCRIPT_PATH = script;
    process.env.REPORTS_DIR = reports;

    expect(() => validateRequiredPaths()).not.toThrow();

    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(reports, { recursive: true, force: true });
  });
});
