const rateLimit = require('express-rate-limit');

/**
 * Rate limiting middleware to prevent API abuse
 * 
 * This middleware uses express-rate-limit to limit repeated requests to public APIs.
 * It can be configured with different limits for different routes.
 */

// Default rate limiter for general API endpoints
const defaultRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
  skipSuccessfulRequests: false, // count successful requests against the rate limit
});

// Stricter rate limiter for sensitive operations
const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests for this sensitive operation, please try again after an hour',
  skipSuccessfulRequests: false,
});

// Very strict rate limiter for development-only routes
const devRouteRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests for this development route, please try again after an hour',
  skipSuccessfulRequests: false,
});

module.exports = {
  defaultRateLimiter,
  strictRateLimiter,
  devRouteRateLimiter
};