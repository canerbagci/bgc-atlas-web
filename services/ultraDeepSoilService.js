const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const BASE_DIR = process.env.ULTRA_DEEP_SOIL_DIR || '/ceph/ibmi/tgm/bgc-atlas/ultra-deep-soil';
const MAGS_DIR = path.join(BASE_DIR, 'mags');
const META_DIR = path.join(BASE_DIR, 'metagenome');

/**
 * List all MAG directories
 * @returns {Promise<string[]>} - Array of MAG directory names
 */
async function listMagDirectories() {
  try {
    const entries = await fs.readdir(MAGS_DIR, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name).sort();
  } catch (err) {
    logger.error(`Error reading MAG directories:`, err);
    return [];
  }
}

/**
 * Generate HTML for the MAG list
 * @param {string[]} dirs - Array of MAG directory names
 * @returns {string} - HTML string for the MAG list
 */
function generateMagListHtml(dirs) {
  const rows = dirs.map(d => `<li><a href="./${encodeURIComponent(d)}/">${d}</a></li>`).join('\n');
  
  return `<!doctype html>
    <html><head><meta charset="utf-8"><title>MAG list</title>
    <style>body{font-family:sans-serif;margin:2rem} h1{margin-top:0}</style>
    </head><body>
      <h1>MAGs (${dirs.length})</h1>
      <ul>${rows}</ul>
    </body></html>`;
}

/**
 * Generate HTML for the ultra deep soil index page
 * @param {number} magCount - Number of MAG directories
 * @returns {string} - HTML string for the index page
 */
function generateIndexHtml(magCount) {
  return `<!doctype html>
    <html><head><meta charset="utf-8"><title>Ultra-deep-soil index</title>
    <style>body{font-family:sans-serif;margin:2rem} h1{margin-top:0}</style>
    </head><body>
      <h1>Ultra-deep-soil BGC catalogue</h1>
      <ul>
        <li><a href="ultra-deep-soil/metagenome/">metagenome</a> – antiSMASH on whole assembly</li>
        <li><a href="ultra-deep-soil/mags/">mags</a> – ${magCount} genome bins</li>
      </ul>
    </body></html>`;
}

module.exports = {
  BASE_DIR,
  MAGS_DIR,
  META_DIR,
  listMagDirectories,
  generateMagListHtml,
  generateIndexHtml
};
