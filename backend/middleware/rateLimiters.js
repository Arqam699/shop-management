const { rateLimit } = require('express-rate-limit');
const MongoRateLimitStore = require('../utils/mongoRateLimitStore');

const createLoginLimiter = (collectionName) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new MongoRateLimitStore(collectionName),
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
});

const demoSignupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new MongoRateLimitStore('demo_signup_rate_limits'),
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many demo requests. Please try again in an hour.',
  },
});

const demoVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new MongoRateLimitStore('demo_email_verification_rate_limits'),
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many verification requests. Please try again in an hour.',
  },
});

module.exports = {
  adminLoginLimiter: createLoginLimiter('admin_login_rate_limits'),
  superAdminLoginLimiter: createLoginLimiter('super_admin_login_rate_limits'),
  demoSignupLimiter,
  demoVerificationLimiter,
};
