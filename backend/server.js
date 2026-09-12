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

// Required when the production app sits behind HTTPS reverse proxies.
// It allows secure authentication cookies to work correctly in SaaS hosting.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}


// =====================================================
// GLOBAL MIDDLEWARE
// =====================================================

// Increased limit because fingerprint images are sent as Base64
app.use(express.json({ limit: '10mb' }));

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

const configuredOrigins = String(
  process.env.CLIENT_URL ||
  process.env.FRONTEND_URL ||
  process.env.CORS_ORIGINS ||
  ''
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const developmentOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const allowedOrigins = new Set(
  configuredOrigins.length > 0
    ? configuredOrigins
    : process.env.NODE_ENV === 'production'
    ? []
    : developmentOrigins
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without an Origin header include server-to-server health
      // checks; browser requests must be explicitly approved.
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS origin is not allowed'));
    },
    credentials: true,
  })
);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});


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
//
// Base URL:
//
// /api/super-admin
//
// Examples:
//
// POST   /api/super-admin/login
// POST   /api/super-admin/logout
// GET    /api/super-admin/me
// GET    /api/super-admin/shops
// GET    /api/super-admin/dashboard
// POST   /api/super-admin/shops
// PATCH  /api/super-admin/shops/:shopId/suspend
// PATCH  /api/super-admin/shops/:shopId/activate
// PATCH  /api/super-admin/shops/:shopId/subscription
// PATCH  /api/super-admin/shops/:shopId/password
// DELETE /api/super-admin/shops/:shopId
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

  } catch (err) {

    console.error(
      `[SEED ERROR]: ${err.message}`
    );

    throw err;
  }
};


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
      err.stack
    );

    return res.status(500).json({
      success: false,
      message:
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
    // DATABASE MUST BE READY FIRST
    // =================================================

    await connectDB();

    console.log(
      'MongoDB connection is ready.'
    );


    // =================================================
    // SEED ADMIN AFTER DATABASE CONNECTION
    // =================================================

    await seedAdminAccount();


    // =================================================
    // START SERVER ONLY AFTER DB + SEED
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
