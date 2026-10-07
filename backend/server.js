const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');

// =====================================================
// ROUTES
// =====================================================

const aiRoutes = require('./routes/aiRoutes');
const authRoutes = require('./routes/authRoutes');
const superAdminRoutes = require('./routes/superAdmin.routes');
const backupRoutes = require('./routes/backupRoutes');

// =====================================================
// DATABASE / MODELS
// =====================================================

const connectDB = require('./config/db');
const Admin = require('./models/Admin');
const startAiHistoryCleanup = require('./jobs/aiHistoryCleanup');

// =====================================================
// BACKUP SERVICE
// =====================================================

const {
  initializeBackupStorage,
} = require('./services/backupService');

// =====================================================
// ENVIRONMENT
// =====================================================

dotenv.config();

// =====================================================
// APP
// =====================================================

const app = express();

// =====================================================
// TRUST PROXY
// =====================================================

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// =====================================================
// CORS
// =====================================================

// -----------------------------------------------------
// NORMALIZE ORIGIN
// -----------------------------------------------------

const normalizeOrigin = (origin) => {
  if (!origin) return '';

  return String(origin)
    .trim()
    .replace(/\/+$/, '');
};

// -----------------------------------------------------
// DEVELOPMENT ORIGINS
// -----------------------------------------------------

const developmentOrigins = [
  'http://localhost:5173',
   'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

// -----------------------------------------------------
// PRODUCTION FRONTEND ORIGINS
// -----------------------------------------------------

const productionOrigins = [
  'https://arzaibpos.vercel.app',
];

// -----------------------------------------------------
// ENVIRONMENT ORIGINS
// -----------------------------------------------------

const configuredOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGINS,
]
  .filter(Boolean)
  .flatMap((value) => String(value).split(','))
  .map(normalizeOrigin)
  .filter(Boolean);

// -----------------------------------------------------
// FINAL ALLOWED ORIGINS
// -----------------------------------------------------

const allowedOrigins = new Set(
  [
    ...(process.env.NODE_ENV === 'production'
      ? [
          ...productionOrigins,
          ...configuredOrigins.filter((origin) => {
            try {
              return new URL(origin).protocol === 'https:';
            } catch {
              return false;
            }
          }),
        ]
      : developmentOrigins),
  ]
    .map(normalizeOrigin)
    .filter(Boolean)
);

// =====================================================
// CORS OPTIONS
// =====================================================

const corsOptions = {
  origin: (origin, callback) => {
    // -------------------------------------------------
    // Requests without Origin
    // -------------------------------------------------

    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);

    // -------------------------------------------------
    // Allowed Origin
    // -------------------------------------------------

    if (allowedOrigins.has(normalizedOrigin)) {
      return callback(null, true);
    }

    // -------------------------------------------------
    // Block Unknown Origin
    // -------------------------------------------------

    console.error('');
    console.error('=====================================================');
    console.error('[CORS BLOCKED]');
    console.error(`Origin: ${origin}`);
    console.error('=====================================================');
    console.error('');

    return callback(
      new Error(
        `CORS origin is not allowed: ${origin}`
      )
    );
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Device-ID',
    'X-Device-Id',
    'Accept',
    'Origin',
  ],

  exposedHeaders: [
    'Content-Disposition',
  ],

  optionsSuccessStatus: 204,
};

// =====================================================
// APPLY CORS
// =====================================================

app.use(cors(corsOptions));

// Vercel invokes the exported Express app as a serverless handler. Do not
// open a separate HTTP listener there; initialize shared database state only
// for actual API requests. CORS handles OPTIONS above this middleware, so a
// browser preflight never waits on MongoDB.
let vercelInitialization;

const initializeVercelRequest = async (req, res, next) => {
  if (process.env.VERCEL !== '1' || req.method === 'OPTIONS') {
    return next();
  }

  try {
    if (!vercelInitialization) {
      vercelInitialization = (async () => {
        const jwtSecret = process.env.JWT_SECRET || '';
        const isPlaceholderSecret = /^(replace|change|your|example)[_-]/i.test(jwtSecret);

        if (
          process.env.NODE_ENV === 'production' &&
          (Buffer.byteLength(jwtSecret, 'utf8') < 32 || isPlaceholderSecret)
        ) {
          throw new Error('Production requires a JWT_SECRET with at least 32 random bytes.');
        }

        await connectDB();
        await seedAdminAccount();
      })().catch((error) => {
        // Let later invocations retry after a transient database failure.
        vercelInitialization = null;
        throw error;
      });
    }

    await vercelInitialization;
    return next();
  } catch (error) {
    console.error('[VERCEL] Request initialization failed:', error.message);
    return res.status(503).json({
      success: false,
      code: 'SERVICE_INITIALIZATION_FAILED',
      message: 'The API is temporarily unavailable. Please try again.',
    });
  }
};

app.use(initializeVercelRequest);

// =====================================================
// BODY PARSERS
// =====================================================

// Fingerprint images can be sent as Base64.
// Keep the 10MB limit.

app.use(
  express.json({
    limit: '10mb',
  })
);

// -----------------------------------------------------
// NOTE:
// The API is JSON-only (the React client always sends
// application/json via Axios). urlencoded parsing is intentionally
// disabled because a cross-site HTML <form> can only send
// urlencoded/multipart/text-plain WITHOUT a CORS preflight — so
// removing this parser closes one CSRF vector.
// -----------------------------------------------------

app.use(cookieParser());

// =====================================================
// HELMET (security headers)
// =====================================================

app.use(helmet());

// =====================================================
// SECURITY HEADERS
// =====================================================

app.use((req, res, next) => {
  res.setHeader(
    'X-Content-Type-Options',
    'nosniff'
  );

  res.setHeader(
    'X-Frame-Options',
    'DENY'
  );

  res.setHeader(
    'Referrer-Policy',
    'strict-origin-when-cross-origin'
  );

  next();
});

// =====================================================
// CSRF / ORIGIN GUARD
// =====================================================
//
// Cookies are SameSite=None in production (required for the
// cross-site Vercel setup), which means the browser attaches them
// to cross-site requests. To stop classic CSRF, every
// state-changing request must come from an allowed origin.
//
// Browsers always send an Origin header for POST/PUT/PATCH/DELETE,
// so a missing Origin means a non-browser client (curl,
// server-to-server) which is not a CSRF vector.
// =====================================================

const csrfGuard = (req, res, next) => {
  const method = String(req.method || '').toUpperCase();

  const stateChanging =
    method === 'POST' ||
    method === 'PUT' ||
    method === 'PATCH' ||
    method === 'DELETE';

  if (!stateChanging) {
    return next();
  }

  const origin = normalizeOrigin(req.get('origin'));

  if (origin) {
    if (allowedOrigins.has(origin)) {
      return next();
    }

    console.error(`[CSRF BLOCKED] Origin: ${origin}`);

    return res.status(403).json({
      success: false,
      code: 'CSRF_ORIGIN_BLOCKED',
      message: 'Request blocked: untrusted origin.',
    });
  }

  const referer = req.get('referer');

  if (referer) {
    try {
      const refererOrigin = normalizeOrigin(
        new URL(referer).origin
      );

      if (allowedOrigins.has(refererOrigin)) {
        return next();
      }
    } catch (error) {
      // Malformed Referer header — fall through to block.
    }

    console.error(`[CSRF BLOCKED] Referer: ${referer}`);

    return res.status(403).json({
      success: false,
      code: 'CSRF_ORIGIN_BLOCKED',
      message: 'Request blocked: untrusted referer.',
    });
  }

  // No Origin and no Referer: non-browser client.
  return next();
};

app.use(csrfGuard);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'Shop Management API',

    environment:
      process.env.VERCEL === '1'
        ? 'vercel'
        : process.env.NODE_ENV || 'development',

    backupScheduler: 'disabled',

    backupMode: 'manual',

    timezone: 'Asia/Karachi',
  });
});

// =====================================================
// AUTH ROUTES
// =====================================================

app.use(
  '/api/auth',
  authRoutes
);

app.use(
  '/auth',
  authRoutes
);

// =====================================================
// SETTINGS
// =====================================================

app.use(
  '/api/settings',
  require('./routes/settingsRoutes')
);

app.use(
  '/settings',
  require('./routes/settingsRoutes')
);

// =====================================================
// PRODUCTS
// =====================================================

app.use(
  '/api/products',
  require('./routes/productRoutes')
);

app.use(
  '/products',
  require('./routes/productRoutes')
);

// =====================================================
// CUSTOMERS
// =====================================================

app.use(
  '/api/customers',
  require('./routes/customerRoutes')
);

app.use(
  '/customers',
  require('./routes/customerRoutes')
);

// =====================================================
// SALES
// =====================================================

app.use(
  '/api/sales',
  require('./routes/saleRoutes')
);

app.use(
  '/sales',
  require('./routes/saleRoutes')
);

// =====================================================
// INSTALLMENTS
// =====================================================

app.use(
  '/api/installments',
  require('./routes/installmentRoutes')
);

app.use(
  '/installments',
  require('./routes/installmentRoutes')
);

// =====================================================
// PAYMENTS
// =====================================================

app.use(
  '/api/payments',
  require('./routes/paymentRoutes')
);

app.use(
  '/payments',
  require('./routes/paymentRoutes')
);

// =====================================================
// RETURNS
// =====================================================

app.use(
  '/api/returns',
  require('./routes/returnRoutes')
);

app.use(
  '/returns',
  require('./routes/returnRoutes')
);

// =====================================================
// REPORTS
// =====================================================

app.use(
  '/api/reports',
  require('./routes/reportRoutes')
);

app.use(
  '/reports',
  require('./routes/reportRoutes')
);

// =====================================================
// EXPENSES
// =====================================================

app.use(
  '/api/expenses',
  require('./routes/expenseRoutes')
);

app.use(
  '/expenses',
  require('./routes/expenseRoutes')
);

// =====================================================
// YEARLY AUDITS
// =====================================================

app.use(
  '/api/audits',
  require('./routes/auditRoutes')
);

app.use(
  '/audits',
  require('./routes/auditRoutes')
);

// =====================================================
// SUPER ADMIN
// =====================================================

app.use(
  '/api/super-admin',
  superAdminRoutes
);

// =====================================================
// AI / SHOP ASSISTANT
// =====================================================

app.use(
  '/api/ai',
  aiRoutes
);

// =====================================================
// BACKUP ROUTES
// =====================================================

app.use(
  '/api/backup',
  backupRoutes
);

// =====================================================
// ADMIN SEEDER
// =====================================================

const seedAdminAccount = async () => {
  try {
    const adminEmail = (
      process.env.ADMIN_EMAIL ||
      'admin@shop.com'
    )
      .trim()
      .toLowerCase();

    const admin = await Admin.findOne({
      email: adminEmail,
    });

    // =================================================
    // ADMIN ALREADY EXISTS -> NEVER TOUCH IT
    //
    // The seeder must NEVER overwrite an existing admin's
    // password from the environment. Password changes go
    // through the change-password flow only.
    // =================================================

    if (admin) {
      return;
    }

    // =================================================
    // CREATE ADMIN IF NOT EXISTS
    //
    // Requires ADMIN_PASSWORD from the environment.
    // There is intentionally NO hardcoded fallback
    // password — seeding with a known default would be
    // a critical security hole.
    // =================================================

    const adminPassword =
      process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.warn(
        '[SEED SKIP] No admin account found and ' +
        'ADMIN_PASSWORD is not set. Skipping admin ' +
        'creation — set ADMIN_PASSWORD to seed the ' +
        'initial admin account.'
      );

      return;
    }

    if (
      adminPassword.length < 12 ||
      Buffer.byteLength(adminPassword, 'utf8') > 72
    ) {
      throw new Error(
        'ADMIN_PASSWORD must be at least 12 characters and at most 72 UTF-8 bytes.'
      );
    }

    const newAdmin = new Admin({
      email: adminEmail,
      password: adminPassword,
    });

    await newAdmin.save();

    console.log(
      `[SEED SUCCESS] Admin account initialized: ${adminEmail}`
    );
  } catch (err) {
    console.error(
      `[SEED ERROR]: ${err.message}`
    );

    throw err;
  }
};

// =====================================================
// 404 HANDLER
// =====================================================

// NOTE:
// Express 4 does not understand the Express 5 wildcard syntax
// ('/{*any}'). A plain app.use() fallback catches every unmatched
// request reliably and still returns JSON (not Express' HTML 404).
app.use(
  (req, res) => {
    return res.status(404).json({
      success: false,
      message:
        `Route not found: ${req.method} ${req.originalUrl}`,
    });
  }
);

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(
      'GLOBAL SERVER ERROR:',
      err.stack || err.message
    );

    // -------------------------------------------------
    // CORS ERROR
    // -------------------------------------------------

    if (
      err.message &&
      err.message.includes(
        'CORS origin is not allowed'
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          'CORS origin is not allowed.',
      });
    }

    // -------------------------------------------------
    // GENERAL SERVER ERROR
    // -------------------------------------------------

    return res.status(
      err.status || 500
    ).json({
      success: false,
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected application error occurred.'
          : err.message || 'An unexpected application error occurred.',
    });
  }
);

// =====================================================
// SERVER STARTUP
// =====================================================

const PORT =
  process.env.PORT || 5000;

// =====================================================
// START SERVER
// =====================================================

const startServer = async () => {
  try {
    const jwtSecret = process.env.JWT_SECRET || '';
    const isPlaceholderSecret =
      /^(replace|change|your|example)[_-]/i.test(jwtSecret);

    if (
      process.env.NODE_ENV === 'production' &&
      (Buffer.byteLength(jwtSecret, 'utf8') < 32 ||
        isPlaceholderSecret)
    ) {
      throw new Error(
        'Production requires a JWT_SECRET with at least 32 random bytes.'
      );
    }

    // =================================================
    // 1. DATABASE CONNECTION
    // =================================================

    await connectDB();

    // AI chat history is the one shop record group configured for daily cleanup.
    // Run the scheduler only in the persistent local server process.
    if (process.env.VERCEL !== '1') {
      startAiHistoryCleanup();
    }

    // =================================================
    // 2. BACKUP STORAGE INITIALIZATION
    // =================================================
    //
    // ONLY LOCAL MACHINE
    //
    // Vercel cannot use the user's Windows Desktop.
    //
    // =================================================

    if (process.env.VERCEL !== '1') {
      try {
        const backupPaths =
          await initializeBackupStorage();

        console.log(
          `[BACKUP] Folder: ${backupPaths.backupDir}`
        );
      } catch (backupError) {
        // Do not crash the complete application
        // because of local backup initialization.

        console.error(
          '[BACKUP] Local storage initialization failed:'
        );

        console.error(
          backupError.message
        );
      }
    } else {
      console.log(
        '[BACKUP] Vercel environment detected.'
      );

      console.log(
        '[BACKUP] Local Desktop backup storage initialization skipped.'
      );
    }

    // =================================================
    // 3. ADMIN SEED
    // =================================================

    await seedAdminAccount();

    // =================================================
    // 4. AUTOMATIC BACKUP — DISABLED (manual backup only)
    // =================================================
    //
    // Shop owner decision: no automatic backups. Many users
    // run low-end PCs, so auto-created backups would waste
    // disk space. The admin takes a backup manually from the
    // Backup page whenever they want one.
    //
    // =================================================

    console.log(
      '[BACKUP] Automatic backup disabled — manual backup only.'
    );

    // =================================================
    // 5. START HTTP SERVER
    // =================================================

    if (process.env.VERCEL !== '1') app.listen(
      PORT,
      () => {
        console.log('');

        console.log(
          '====================================================='
        );

        console.log(
          `Server running -> http://localhost:${PORT}`
        );

        if (process.env.VERCEL === '1') {
          console.log(
            '[VERCEL] Cloud mode: local backup & cron skipped.'
          );
        }

        console.log(
          '====================================================='
        );

        console.log('');
      }
    );
  } catch (error) {
    console.error('');

    console.error(
      '====================================================='
    );

    console.error(
      'SERVER STARTUP ERROR'
    );

    console.error(
      error.stack || error.message
    );

    console.error(
      '====================================================='
    );

    console.error('');

    // IMPORTANT:
    // We still fail startup for critical errors
    // such as MongoDB/auth initialization.

    if (process.env.VERCEL !== '1') process.exitCode = 1;
  }
};

// =====================================================
// START APPLICATION
// =====================================================

if (process.env.VERCEL !== '1') {
  startServer();
}

// =====================================================
// EXPORT APP
// =====================================================
//
// Useful for Vercel / serverless environments.
// Local app.listen() continues to work as well.
//
// =====================================================

module.exports = app;
