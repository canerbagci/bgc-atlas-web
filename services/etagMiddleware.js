/**
 * Middleware for generating and handling ETag headers for API and HTML responses.
 * This helps with caching by allowing clients to use conditional requests.
 */

const crypto = require('crypto');

/**
 * Generates an ETag based on the response body
 * @param {Object|Array|string} body - The response body
 * @returns {string} - The generated ETag
 */
function generateETag(body) {
  const hash = crypto.createHash('md5');

  // Handle different types of bodies
  if (typeof body === 'string') {
    hash.update(body);
  } else {
    hash.update(JSON.stringify(body));
  }

  return `"${hash.digest('hex')}"`;
}

/**
 * Sets common cache headers for responses
 * @param {Object} res - Express response object
 * @param {string} etag - The ETag value
 */
function setCacheHeaders(res, etag) {
  // Set ETag header
  res.setHeader('ETag', etag);

  // Set Cache-Control header - allow caching for 1 hour
  res.setHeader('Cache-Control', 'public, max-age=3600');

  // Set Vary header to ensure proper caching based on Accept and Accept-Encoding
  res.setHeader('Vary', 'Accept, Accept-Encoding');

  // Set Last-Modified header to current time
  res.setHeader('Last-Modified', new Date().toUTCString());
}

/**
 * Checks if the response can be returned as 304 Not Modified
 * @param {Object} req - Express request object
 * @param {string} etag - The ETag value
 * @returns {boolean} - Whether to return 304 Not Modified
 */
function shouldReturn304(req, etag) {
  const ifNoneMatch = req.headers['if-none-match'];
  return ifNoneMatch && ifNoneMatch === etag;
}

/**
 * Middleware that adds ETag support to API and HTML responses
 */
function etagMiddleware(req, res, next) {
  // Skip for non-GET and non-HEAD requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  // Skip for SSE endpoints
  if (req.path === '/events') {
    return next();
  }

  // Skip for job-related endpoints to ensure fresh data
  if (req.path.startsWith('/jobs/')) {
    return next();
  }

  // Store the original methods
  const originalJson = res.json;
  const originalSend = res.send;
  const originalRender = res.render;

  // Override the json method for API responses
  res.json = function(body) {
    // Generate ETag from response body
    const etag = generateETag(body);

    // Set cache headers
    setCacheHeaders(res, etag);

    // Check if client sent If-None-Match header
    if (shouldReturn304(req, etag)) {
      return res.status(304).end();
    }

    // Otherwise, send the response as usual
    return originalJson.call(this, body);
  };

  // Override the send method for HTML and other responses
  res.send = function(body) {
    // Only handle string responses (like HTML)
    if (typeof body === 'string') {
      const etag = generateETag(body);
      setCacheHeaders(res, etag);

      if (shouldReturn304(req, etag)) {
        return res.status(304).end();
      }
    }

    return originalSend.call(this, body);
  };

  // Override the render method for template rendering
  res.render = function(view, options, callback) {
    // Call the original render method
    originalRender.call(this, view, options, (err, html) => {
      if (err) {
        if (callback) {
          return callback(err);
        }
        throw err;
      }

      // Generate ETag for the rendered HTML
      const etag = generateETag(html);
      setCacheHeaders(res, etag);

      // Check for If-None-Match
      if (shouldReturn304(req, etag)) {
        return res.status(304).end();
      }

      // If callback is provided, pass the HTML to it
      if (callback) {
        return callback(null, html);
      }

      // Otherwise, send the HTML
      res.send(html);
    });

    // Return undefined to prevent Express from trying to send a response
    return undefined;
  };

  next();
}

module.exports = etagMiddleware;
