const rateLimit = require('express-rate-limit');

// General limiter for the whole API — protects against floods / scraping.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // max requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down and try again shortly.' },
});

// Stricter limiter for auth endpoints (login / refresh) to slow brute-force
// password guessing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 login/refresh attempts per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
});

module.exports = { apiLimiter, authLimiter };
