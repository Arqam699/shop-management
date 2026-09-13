const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const connectDB = require('./config/db');

const Admin = require('./models/Admin');

const authRoutes = require('./routes/authRoutes');
const superAdminRoutes = require('./routes/superAdmin.routes');


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
// GLOBAL MIDDLEWARE
// =====================================================

// Increased limit because fingerprint images
// can be sent as Base64.

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
// CORS
// =====================================================


// -----------------------------------------------------
// NORMALIZE ORIGIN FUNCTION
// -----------------------------------------------------

const normalizeOrigin = (origin) => {
  if (!origin) return '';

  return origin
    .trim()
    .replace(/\/+$/, '');
};


// -----------------------------------------------------
// ENVIRONMENT-BASED ORIGINS
// -----------------------------------------------------

const configuredOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGINS,
]
  .filter(Boolean)
  .flatMap((value) => value.split(','))
  .map(normalizeOrigin)
  .filter(Boolean);


// -----------------------------------------------------
// DEVELOPMENT ORIGINS
// -----------------------------------------------------

const developmentOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];


// -----------------------------------------------------
// PRODUCTION FRONTEND ORIGINS
// -----------------------------------------------------

const productionOrigins = [
  'https://shop-frontend-black-ten.vercel.app',
];


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


// -----------------------------------------------------
// DEBUG
// -----------------------------------------------------

console.log(
  '[CORS] Allowed origins:',
  Array.from(allowedOrigins)
);


// =====================================================
// CORS OPTIONS
// =====================================================

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without Origin.
    // For example:
    // Postman
    // server-to-server
    // health checks

    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);


    // Allow approved origins

    if (allowedOrigins.has(normalizedOrigin)) {
      return callback(null, true);
    }


    // Block unknown origins

    console.error(
      `[CORS BLOCKED] Origin: ${origin}`
    );

    return callback(
      new Error(
        `CORS origin is not allowed: ${origin}`
      )
    );
  },


  // Required when authentication uses cookies

  credentials: true,


  // Allowed HTTP methods

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],


  // Allowed custom headers

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Device-ID',
  ],


  optionsSuccessStatus: 204,
};


// =====================================================
// APPLY CORS
// =====================================================

app.use(
  cors(corsOptions)
);


// =====================================================
// EXPLICIT PREFLIGHT HANDLER
// EXPRESS 5 COMPATIBLE
// =====================================================

// IMPORTANT:
// Do NOT use '*'
// Express 5 does not support unnamed wildcard '*'.

app.options(
  '/{*any}',
  cors(corsOptions)
);


// =====================================================
// SECURITY HEADERS
// =====================================================

app.use(
  (req, res, next) => {
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
  }
);


// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
  '/health',
  (req, res) => {
    return res.status(200).json({
      status: 'ok',
      service: 'Shop Management API',
    });
  }
);


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
// SUPER ADMIN ROUTES
// =====================================================

app.use(
  '/api/super-admin',
  superAdminRoutes
);


// =====================================================
// PERMANENT ADMIN SESSION SEEDER
// =====================================================

const seedAdminAccount = async () => {
  try {
    const adminEmail = (
      process.env.ADMIN_EMAIL ||
      'admin@shop.com'
    )
      .trim()
      .toLowerCase();


    const adminPassword =
      process.env.ADMIN_PASSWORD ||
      'SecureAdminPassword123';


    let admin =
      await Admin.findOne({
        email: adminEmail,
      });


    // =================================================
    // CREATE ADMIN IF NOT EXISTS
    // =================================================

    if (!admin) {
      admin = new Admin({
        email: adminEmail,
        password: adminPassword,
      });


      await admin.save();


      console.log(
        `[SEED SUCCESS] Admin account initialized: ${adminEmail}`
      );

      return;
    }


    // =================================================
    // SYNC PASSWORD WITH ENV
    // =================================================

    const isMatch =
      await admin.comparePassword(
        adminPassword
      );


    if (!isMatch) {
      admin.password =
        adminPassword;


      await admin.save();


      console.log(
        `[SEED UPDATE] Password synced from .env for: ${adminEmail}`
      );
    }


    console.log(
      `[SEED READY] Admin account already exists: ${adminEmail}`
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
// EXPRESS 5 COMPATIBLE
// =====================================================

app.all(
  '/{*any}',
  (req, res) => {
    return res.status(404).json({
      success: false,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
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


const startServer = async () => {

  try {

    // =================================================
    // DATABASE CONNECTION
    // =================================================

    await connectDB();


    console.log(
      'MongoDB connection is ready.'
    );


    // =================================================
    // SEED ADMIN
    // =================================================

    await seedAdminAccount();


    // =================================================
    // START SERVER
    // =================================================

    app.listen(
      PORT,
      () => {

        console.log(
          `Server executing in ${
            process.env.NODE_ENV ||
            'development'
          } mode on port ${PORT}`
        );


        console.log(
          `API running on http://localhost:${PORT}`
        );

      }
    );

  } catch (error) {

    console.error(
      'SERVER STARTUP ERROR:',
      error.message
    );

    process.exit(1);
  }
};


// =====================================================
// START APPLICATION
// =====================================================

startServer();