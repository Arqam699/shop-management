const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');

const protectSuperAdmin = async (req, res, next) => {
  try {
    const token = req.cookies.superAdminToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, Super Admin token not provided',
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (decoded.role !== 'SuperAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Super Admin access required',
      });
    }

    const superAdmin = await SuperAdmin.findById(
      decoded.userId
    ).select('-password');

    if (!superAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Super Admin account not found',
      });
    }

    req.superAdmin = superAdmin;

    next();

  } catch (error) {
    console.error('Super Admin Auth Error:', error);

    return res.status(401).json({
      success: false,
      message: 'Not authorized, invalid or expired Super Admin token',
    });
  }
};

module.exports = {
  protectSuperAdmin,
};