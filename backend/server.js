const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const cron = require('node-cron');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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

// =====================================================
// BACKUP SERVICE
// =====================================================

const {
  runAutomaticDailyBackups,
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
    ...developmentOrigins,
    ...productionOrigins,
    ...configuredOrigins,
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

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

app.use(cookieParser());

// =====================================================
// HELMET (security headers)
// =====================================================

app.use(helmet());

// =====================================================
// RATE LIMITING
//
// trust proxy is already enabled in production above,
// so rate limiting sees the real client IP behind Vercel.
// =====================================================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Too many auth attempts. Please try again in 15 minutes.',
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Too many requests. Please try again in 15 minutes.',
  },
});

// General limiter for the whole API...
app.use('/api', apiLimiter);

// ...plus a strict limiter on auth endpoints.
app.use('/api/auth', authLimiter);

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

    backupScheduler:
      process.env.VERCEL === '1'
        ? 'disabled-on-vercel'
        : 'active',

    timezone: 'Asia/Karachi',

    automaticBackupTime: '23:59',
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
// AUTOMATIC BACKUP SCHEDULER
// =====================================================
//
// LOCAL MACHINE ONLY
//
// Every day at 11:59 PM Pakistan Time.
//
// IMPORTANT:
// This scheduler is NOT started on Vercel.
// Vercel serverless functions are not persistent.
//
// =====================================================

let backupScheduler = null;

const initializeAutomaticBackupScheduler = () => {
  // ---------------------------------------------------
  // Do not run scheduler on Vercel
  // ---------------------------------------------------

  if (process.env.VERCEL === '1') {
    console.log(
      '[BACKUP] Vercel: local cron skipped.'
    );

    return null;
  }

  // ---------------------------------------------------
  // Prevent duplicate scheduler
  // ---------------------------------------------------

  if (backupScheduler) {
    console.log(
      '[BACKUP] Scheduler already initialized.'
    );

    return backupScheduler;
  }

  // ---------------------------------------------------
  // Create Cron
  // ---------------------------------------------------

  backupScheduler = cron.schedule(
    '59 23 * * *',
    async () => {
      console.log('[BACKUP] Daily auto-backup started.');

      try {
        const result =
          await runAutomaticDailyBackups();

        console.log(
          `[BACKUP] Daily auto-backup done. ` +
          `Shops: ${result?.total ?? 0}, ` +
          `OK: ${result?.success ?? 0}, ` +
          `Failed: ${result?.failed ?? 0}`
        );
      } catch (error) {
        console.error(
          '[BACKUP] Daily auto-backup ERROR:',
          error.message || error
        );
      }
    },
    {
      timezone: 'Asia/Karachi',
    }
  );

  console.log(
    '[BACKUP] Daily auto-backup: 11:59 PM (Asia/Karachi)'
  );

  return backupScheduler;
};

// =====================================================
// 404 HANDLER
// =====================================================

app.all(
  '/{*any}',
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
        err.message ||
        'An unexpected application error occurred.',
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
    // =================================================
    // 1. DATABASE CONNECTION
    // =================================================

    await connectDB();

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
    // 4. AUTOMATIC BACKUP SCHEDULER
    // =================================================

    if (process.env.VERCEL !== '1') {
      initializeAutomaticBackupScheduler();
    } else {
      console.log(
        '[BACKUP] Automatic cron scheduler disabled on Vercel.'
      );
    }

    // =================================================
    // 5. START HTTP SERVER
    // =================================================

    app.listen(
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

    process.exit(1);
  }
};

// =====================================================
// START APPLICATION
// =====================================================

startServer();

// =====================================================
// EXPORT APP
// =====================================================
//
// Useful for Vercel / serverless environments.
// Local app.listen() continues to work as well.
//
// =====================================================

module.exports = app;