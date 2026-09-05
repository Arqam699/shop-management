const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
  let token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = await Admin.findById(decoded.userId).select('-password');
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Admin session expired or record deleted' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }
};

module.exports = { protect };