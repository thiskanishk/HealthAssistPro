
const rateLimit = require('express-rate-limit');

const diagnoseRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // limit each user to 5 requests per windowMs
  message: {
    message: 'Too many diagnosis attempts from this user. Please try again after a minute.'
  }
});

module.exports = diagnoseRateLimiter;
