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

const createDemoLimiter = (collectionName, limit, message) => rateLimit({
  windowMs: 60 * 60 * 1000,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new MongoRateLimitStore(collectionName),
  message: { success: false, code: 'RATE_LIMITED', message },
});

const demoSignupLimiter = createDemoLimiter(
  'demo_signup_rate_limits_v2', 10,
  'Too many demo accounts requested. Please try again in an hour.'
);
const demoOtpSendLimiter = createDemoLimiter(
  'demo_otp_send_rate_limits_v2', 5,
  'Too many verification codes requested. Please try again in an hour.'
);
const demoOtpVerifyLimiter = createDemoLimiter(
  'demo_otp_verify_rate_limits_v2', 10,
  'Too many verification attempts. Please try again in an hour.'
);

module.exports = {
  adminLoginLimiter: createLoginLimiter('admin_login_rate_limits'),
  superAdminLoginLimiter: createLoginLimiter('super_admin_login_rate_limits'),
  demoSignupLimiter,
  demoOtpSendLimiter,
  demoOtpVerifyLimiter,
};
