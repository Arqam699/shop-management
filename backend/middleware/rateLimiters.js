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

module.exports = {
  adminLoginLimiter: createLoginLimiter('admin_login_rate_limits'),
  superAdminLoginLimiter: createLoginLimiter('super_admin_login_rate_limits'),
};
