const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 requests / 15 minutes for strict login/register
  skipSuccessfulRequests: true,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 requests / 15 minutes for refresh
  skipSuccessfulRequests: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // 300 requests / 15 minutes for general API
  skipSuccessfulRequests: false,
});

module.exports = {
  authLimiter,
  refreshLimiter,
  apiLimiter,
};
