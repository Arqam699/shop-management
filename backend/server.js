const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./config/db');
const Admin = require('./models/Admin');
const authRoutes = require('./routes/authRoutes');

dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => callback(null, true), // Allows Vercel live domain automatically
    credentials: true,
  })
);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Shop Management API' });
});

// Standard API Routes mapped with both '/api/...' and fallback '/...' to prevent any 404s!
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes); // Fallback

app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/settings', require('./routes/settingsRoutes'));

app.use('/api/products', require('./routes/productRoutes'));
app.use('/products', require('./routes/productRoutes'));

app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/customers', require('./routes/customerRoutes'));

app.use('/api/sales', require('./routes/saleRoutes'));
app.use('/sales', require('./routes/saleRoutes'));

app.use('/api/installments', require('./routes/installmentRoutes'));
app.use('/installments', require('./routes/installmentRoutes'));

app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/payments', require('./routes/paymentRoutes'));

app.use('/api/returns', require('./routes/returnRoutes'));
app.use('/returns', require('./routes/returnRoutes'));

app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/reports', require('./routes/reportRoutes'));

app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/expenses', require('./routes/expenseRoutes'));

app.use('/api/audits', require('./routes/auditRoutes'));
app.use('/audits', require('./routes/auditRoutes'));

// Permanent Admin Session Seeder
const seedAdminAccount = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@shop.com').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'SecureAdminPassword123';

    let admin = await Admin.findOne({ email: adminEmail });

    if (!admin) {
      admin = new Admin({
        email: adminEmail,
        password: adminPassword,
      });
      await admin.save();
      console.log(`[SEED SUCCESS] Admin account initialized: ${adminEmail}`);
    } else {
      const isMatch = await admin.comparePassword(adminPassword);
      if (!isMatch) {
        admin.password = adminPassword;
        await admin.save();
        console.log(`[SEED UPDATE] Password synced from .env for: ${adminEmail}`);
      }
    }
  } catch (err) {
    console.error(`[SEED ERROR]: ${err.message}`);
  }
};

seedAdminAccount();

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'An unexpected application error occurred.',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server executing in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});