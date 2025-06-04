const NodeCache = require('node-cache');

// Create a cache instance with default settings
// stdTTL: time to live in seconds for every generated cache element (default: 0 - unlimited)
// checkperiod: time in seconds to check for expired keys (default: 600)
const cache = new NodeCache({
  stdTTL: 3600, // Cache items expire after 1 hour by default
  checkperiod: 120 // Check for expired items every 2 minutes
});

/**
 * Get data from cache or fetch it using the provided function
 * @param {string} key - The cache key
 * @param {Function} fetchFunction - Function to fetch data if not in cache
 * @param {number} [ttl=3600] - Time to live in seconds (default: 1 hour)
 * @returns {Promise<any>} - The cached or freshly fetched data
 */
async function getOrFetch(key, fetchFunction, ttl = 3600) {
  // Try to get data from cache
  const cachedData = cache.get(key);
  
  // If data is in cache, return it
  if (cachedData !== undefined) {
    console.log("sending cached data for key:", key);
    console.log(cachedData);
    return cachedData;
  }
  
  // If data is not in cache, fetch it
  try {
    const data = await fetchFunction();
    
    // Store data in cache
    cache.set(key, data, ttl);
    
    return data;
  } catch (error) {
    // If fetching fails, don't cache the error
    console.error(`Error fetching data for key ${key}:`, error);
    throw error;
  }
}

/**
 * Remove an item from the cache
 * @param {string} key - The cache key to remove
 * @returns {boolean} - True if the key was found and removed, false otherwise
 */
function invalidate(key) {
  return cache.del(key);
}

/**
 * Remove all items from the cache
 * @returns {void}
 */
function invalidateAll() {
  cache.flushAll();
}

/**
 * Get cache statistics
 * @returns {Object} - Cache statistics
 */
function getStats() {
  return {
    keys: cache.keys(),
    stats: cache.getStats()
  };
}

module.exports = {
  getOrFetch,
  invalidate,
  invalidateAll,
  getStats
};