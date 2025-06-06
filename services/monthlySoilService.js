const fs = require('fs').promises;
const path = require('path');
const cacheService = require('./cacheService');
const logger = require('../utils/logger');

const NAME_REGEX = /^[A-Za-z0-9_-]+$/;
const isValidName = name => NAME_REGEX.test(name);

// Read BASE_DIR from environment variable with fallback to default value
const BASE_DIR = process.env.MONTHLY_SOIL_BASE_DIR || '/ceph/ibmi/tgm/bgc-atlas/monthly-soil';
const FULL_AS_DIR = path.join(BASE_DIR, 'full-AS');
const PRODUCT_AS_DIR = path.join(BASE_DIR, 'product-AS');

/**
 * List all month directories in the specified directory
 * @param {string} directory - The directory to list months from
 * @returns {Promise<string[]>} - Array of month names
 */
async function listMonths(directory) {
  // Create a cache key based on the directory parameter
  const cacheKey = `listMonths_${directory}`;

  // Use the caching service to get or fetch the data
  return cacheService.getOrFetch(cacheKey, async () => {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory() && isValidName(e.name))
        .map(e => e.name)
        .sort();
    } catch (err) {
      logger.error(`Error reading directory ${directory}:`, err);
      return [];
    }
  }, 3600); // Cache for 1 hour
}

/**
 * List all dataset directories in the specified month directory
 * @param {string} monthDir - The month directory to list datasets from
 * @returns {Promise<string[]>} - Array of dataset names
 */
async function listDatasets(monthDir) {
  // Create a cache key based on the monthDir parameter
  const cacheKey = `listDatasets_${monthDir}`;

  // Use the caching service to get or fetch the data
  return cacheService.getOrFetch(cacheKey, async () => {
    try {
      const entries = await fs.readdir(monthDir, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory() && isValidName(e.name))
        .map(e => e.name)
        .sort();
    } catch (err) {
      logger.error(`Error reading directory ${monthDir}:`, err);
      return [];
    }
  }, 3600); // Cache for 1 hour
}

/**
 * List all product type directories in the specified month directory
 * @param {string} monthDir - The month directory to list product types from
 * @returns {Promise<string[]>} - Array of product type names
 */
async function listProductTypes(monthDir) {
  // Create a cache key based on the monthDir parameter
  const cacheKey = `listProductTypes_${monthDir}`;

  // Use the caching service to get or fetch the data
  return cacheService.getOrFetch(cacheKey, async () => {
    try {
      const entries = await fs.readdir(monthDir, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory() && isValidName(e.name))
        .map(e => e.name)
        .sort();
    } catch (err) {
      logger.error(`Error reading directory ${monthDir}:`, err);
      return [];
    }
  }, 3600); // Cache for 1 hour
}

/**
 * Count the number of BGCs in the specified dataset path
 * @param {string} datasetPath - The dataset path to count BGCs from
 * @returns {Promise<number>} - Number of BGCs
 */
async function countBGCs(datasetPath) {
  // Create a cache key based on the datasetPath parameter
  const cacheKey = `countBGCs_${datasetPath}`;

  // Use the caching service to get or fetch the data
  return cacheService.getOrFetch(cacheKey, async () => {
    try {
      // Look for files matching the pattern "*regionXXX.gbk"
      const files = await fs.readdir(datasetPath, { withFileTypes: true });
      const bgcCount = files.filter(file => 
        !file.isDirectory() && file.name.match(/.*region\d+\.gbk$/i)
      ).length;
      return bgcCount;
    } catch (err) {
      logger.error(`Error counting BGCs in ${datasetPath}:`, err);
      return 0;
    }
  }, 3600); // Cache for 1 hour
}

/**
 * Get detailed information about datasets in the specified month
 * @param {string} baseDir - The base directory (FULL_AS_DIR or PRODUCT_AS_DIR)
 * @param {string} month - The month name
 * @param {string[]} datasets - Array of dataset names
 * @returns {Promise<Array<{name: string, bgcCount: number, path: string}>>} - Array of dataset details
 */
async function getDatasetDetails(baseDir, month, datasets) {
  const detailedDatasets = [];

  for (const dataset of datasets.filter(isValidName)) {
    const datasetPath = path.join(baseDir, month, dataset);
    const bgcCount = await countBGCs(datasetPath);

    detailedDatasets.push({
      name: dataset,
      bgcCount,
      path: `/monthly-soil/${baseDir.includes('full-AS') ? 'full-AS' : 'product-AS'}/${month}/${dataset}/index.html`
    });
  }

  return detailedDatasets;
}

/**
 * Get all product types with their datasets for a specific month
 * @param {string} month - The month name
 * @returns {Promise<Array<{name: string, datasets: Array<{name: string, bgcCount: number, path: string}>}>>} - Array of product types with datasets
 */
async function getProductTypesWithDatasets(month) {
  // Create a cache key based on the month parameter
  const cacheKey = `getProductTypesWithDatasets_${month}`;

  // Use the caching service to get or fetch the data
  return cacheService.getOrFetch(cacheKey, async () => {
    const monthDir = path.join(PRODUCT_AS_DIR, month);
    const productTypes = await listProductTypes(monthDir);
    const productTypesWithDatasets = [];

    for (const productType of productTypes.filter(isValidName)) {
      const productTypeDir = path.join(PRODUCT_AS_DIR, month, productType);
      const datasetNames = await listDatasets(productTypeDir);

      // Get detailed dataset information
      const datasets = [];
      for (const datasetName of datasetNames.filter(isValidName)) {
        const datasetPath = path.join(productTypeDir, datasetName);
        const bgcCount = await countBGCs(datasetPath);

        datasets.push({
          name: datasetName,
          bgcCount,
          path: `/monthly-soil/product-AS/${month}/${productType}/${datasetName}/index.html`
        });
      }

      // Add product type with its datasets to the array
      productTypesWithDatasets.push({
        name: productType,
        datasets
      });
    }

    return productTypesWithDatasets;
  }, 3600); // Cache for 1 hour
}

module.exports = {
  BASE_DIR,
  FULL_AS_DIR,
  PRODUCT_AS_DIR,
  listMonths,
  listDatasets,
  listProductTypes,
  countBGCs,
  getDatasetDetails,
  getProductTypesWithDatasets,
  NAME_REGEX
};
