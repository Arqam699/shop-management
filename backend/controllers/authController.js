const Admin = require('../models/Admin');
const { generateToken } = require('../utils/token');

// @desc    Admin login & get token
// @route   POST /api/auth/login
// @access  Public
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    // Clean email
    const cleanEmail = email.trim().toLowerCase();

    const admin = await Admin.findOne({ email: cleanEmail });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate JWT and set authentication cookie
    generateToken(res, admin._id);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        email: admin.email,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// @desc    Admin logout / clear cookie (Deployment cross-domain cookies safe)
// @route   POST /api/auth/logout
// @access  Private
const logoutAdmin = (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    expires: new Date(0),
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

// @desc    Get current session status
// @route   GET /api/auth/me
// @access  Private
const getAdminProfile = async (req, res) => {
  try {
    if (!req.admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        email: req.admin.email,
      },
    });
  } catch (error) {
    console.error('Get Admin Profile Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// @desc    Verify Admin Password for Unlocking Master Deletion Switch
// @route   POST /api/auth/verify-password
// @access  Private
const verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to confirm identity.',
      });
    }

    const admin = await Admin.findById(req.admin._id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found.',
      });
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect Admin Password. Access Denied!',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password verified successfully!',
    });
  } catch (error) {
    console.error('Password Verification Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Password verification failed: ' + error.message,
    });
  }
};

module.exports = {
  loginAdmin,
  logoutAdmin,
  getAdminProfile,
  verifyPassword, // Exported for Settings Switch!
};