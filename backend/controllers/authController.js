const Admin = require('../models/Admin');
const Shop = require('../models/Shop');

const {
  generateToken,
} = require('../utils/token');


// ========================================================
// LOGIN ADMIN
// ========================================================

const loginAdmin = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    // ====================================================
    // VALIDATION
    // ====================================================

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please provide a valid email and password (maximum 72 UTF-8 bytes).',
      });
    }

    const cleanEmail =
      email.trim().toLowerCase();

    // ====================================================
    // FIND ADMIN
    // ====================================================

    const admin =
      await Admin.findOne({
        email: cleanEmail,
      });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid credentials',
      });
    }

    // ====================================================
    // CHECK PASSWORD
    // ====================================================

    const isMatch =
      await admin.comparePassword(
        password
      );

    if (!isMatch) {
      await Admin.updateOne(
        { _id: admin._id },
        { $inc: { failedLoginAttempts: 1 } }
      );

      return res.status(401).json({
        success: false,
        message:
          'Invalid credentials',
      });
    }

    // Count consecutive failures only; a successful login resets the counter.
    if (admin.failedLoginAttempts > 0) {
      await Admin.updateOne(
        { _id: admin._id },
        { $set: { failedLoginAttempts: 0 } }
      );
    }

    // ====================================================
    // CHECK SHOP ASSIGNMENT
    // ====================================================

    if (!admin.shopId) {
      return res.status(403).json({
        success: false,
        message:
          'Your account is not assigned to a shop',
      });
    }

    // ====================================================
    // FIND SHOP
    // ====================================================

    const shop =
      await Shop.findById(
        admin.shopId
      );

    if (!shop) {
      return res.status(403).json({
        success: false,
        message:
          'Your shop account was not found',
      });
    }

    // ====================================================
    // CHECK SUSPENDED
    // ====================================================

    if (
      shop.subscriptionStatus ===
      'Suspended'
    ) {
      return res.status(403).json({
        success: false,
        accountSuspended: true,
        code:
          'ACCOUNT_SUSPENDED',
        message:
          'Your shop account has been suspended. Please contact the administrator.',
        suspensionReason:
          shop.suspensionReason ||
          'No suspension reason was provided.',
      });
    }

    // ====================================================
    // CHECK EXPIRY
    // ====================================================

    if (
      shop.subscriptionExpiresAt &&
      new Date() >=
        new Date(
          shop.subscriptionExpiresAt
        )
    ) {
      if (
        shop.subscriptionStatus !==
        'Expired'
      ) {
        shop.subscriptionStatus =
          'Expired';

        await shop.save();
      }

      return res.status(403).json({
        success: false,
        code:
          'SUBSCRIPTION_EXPIRED',
        message:
          'Your subscription has expired. Please contact the administrator to renew your access.',
      });
    }

    // ====================================================
    // ALREADY EXPIRED
    // ====================================================

    if (
      shop.subscriptionStatus ===
      'Expired'
    ) {
      return res.status(403).json({
        success: false,
        code:
          'SUBSCRIPTION_EXPIRED',
        message:
          'Your subscription has expired. Please contact the administrator to renew your access.',
      });
    }

    // ====================================================
    // DEVICE ID
    // ====================================================

    const deviceId =
      String(
        req.get(
          'X-Device-Id'
        ) || ''
      ).trim();

    if (
      !/^[a-zA-Z0-9_-]{16,128}$/.test(
        deviceId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Device identity is missing. Please refresh the application and try again.',
      });
    }

    // ====================================================
    // CHECK DEVICE
    // ====================================================

    const deviceIndex =
      shop.authorizedDevices.findIndex(
        (device) =>
          device.deviceId ===
          deviceId
      );

    // ====================================================
    // MAXIMUM 3 DEVICES
    // ====================================================

    if (
      deviceIndex === -1 &&
      shop.authorizedDevices.length >= 3
    ) {
      return res.status(403).json({
        success: false,
        code: 'DEVICE_LIMIT_REACHED',
        message:
          'This shop already has three authorized devices. Ask the Super Admin to clear the device list before signing in here.',
      });
    }

    // ====================================================
    // REGISTER / UPDATE DEVICE
    // ====================================================

    const deviceSeenAt =
      new Date();

    if (
      deviceIndex >= 0
    ) {
      shop.authorizedDevices[
        deviceIndex
      ].lastSeenAt =
        deviceSeenAt;
    } else {
      shop.authorizedDevices.push({
        deviceId,
        firstSeenAt:
          deviceSeenAt,
        lastSeenAt:
          deviceSeenAt,
      });
    }

    // ====================================================
    // LOGIN IP
    // ====================================================

    const clientIp =
      String(req.ip || '')
        .replace(
          /^::ffff:/,
          ''
        ) || 'Unknown';

    const loggedInAt =
      new Date();

    shop.lastLoginIp =
      clientIp;

    shop.lastLoginAt =
      loggedInAt;

    shop.loginIpHistory.push({
      ip: clientIp,
      adminEmail:
        admin.email,
      loggedInAt,
    });

    // ====================================================
    // KEEP LAST 50 LOGIN IP RECORDS
    // ====================================================

    if (
      shop.loginIpHistory
        .length > 50
    ) {
      shop.loginIpHistory =
        shop.loginIpHistory.slice(
          -50
        );
    }

    // ====================================================
    // SAVE SHOP
    // ====================================================

    await shop.save();

    // ====================================================
    // GENERATE TOKEN
    // ====================================================

    generateToken(
      res,
      admin._id,
      admin.shopId,
      Number(
        shop.authVersion
      ) || 0,
      Number(admin.sessionVersion) || 0
    );

    // ====================================================
    // SUCCESS RESPONSE
    // ====================================================

    return res.status(200).json({
      success: true,
      message:
        'Logged in successfully',

      data: {
        email:
          admin.email,

        shopId:
          admin.shopId,

        mustChangePassword:
          !!shop.mustChangePassword,
      },
    });

  } catch (error) {
    console.error(
      'Login Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Internal server error',
    });
  }
};


// ========================================================
// CHANGE ADMIN PASSWORD
// ========================================================

const changeAdminPassword = async (
  req,
  res
) => {
  try {
    const {
      newPassword,
      confirmPassword,
    } = req.body;

    // ====================================================
    // VALIDATION
    // ====================================================

    if (
      typeof newPassword !== 'string' ||
      typeof confirmPassword !== 'string' ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please provide new password and confirm password.',
      });
    }

    // ====================================================
    // TRIM PASSWORD
    // ====================================================

    const cleanNewPassword =
      String(newPassword);

    const cleanConfirmPassword =
      String(confirmPassword);

    // ====================================================
    // PASSWORD LENGTH
    // ====================================================

    if (
      cleanNewPassword.length < 12
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 12 characters long.',
      });
    }

    // bcrypt only hashes the first 72 bytes, so cap the input to
    // stop an oversized payload from wasting CPU.
    if (
      Buffer.byteLength(cleanNewPassword, 'utf8') > 72
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at most 72 UTF-8 bytes long.',
      });
    }

    // ====================================================
    // PASSWORD MATCH
    // ====================================================

    if (
      cleanNewPassword !==
      cleanConfirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          'New password and confirm password do not match.',
      });
    }

    // ====================================================
    // ADMIN CHECK
    // ====================================================

    if (!req.admin?._id) {
      return res.status(401).json({
        success: false,
        message:
          'Admin session is invalid.',
      });
    }

    // ====================================================
    // SHOP CHECK
    // ====================================================

    if (!req.shopId) {
      return res.status(403).json({
        success: false,
        message:
          'Shop is not assigned to this account.',
      });
    }

    // ====================================================
    // GET FULL ADMIN DOCUMENT
    // ====================================================

    const admin =
      await Admin.findById(
        req.admin._id
      );

    if (!admin) {
      return res.status(404).json({
        success: false,
        message:
          'Admin account was not found.',
      });
    }

    // ====================================================
    // GET SHOP
    // ====================================================

    const shop =
      await Shop.findById(
        req.shopId
      );

    if (!shop) {
      return res.status(404).json({
        success: false,
        message:
          'Shop account was not found.',
      });
    }

    // ====================================================
    // CHECK WHETHER THIS IS FIRST PASSWORD CHANGE
    // ====================================================

    const hasPreviousAdminPasswordChange =
      Array.isArray(
        shop.passwordChangeHistory
      ) &&
      shop.passwordChangeHistory.some(
        (entry) =>
          entry.changedBy ===
          'Admin'
      );

    const changeType =
      hasPreviousAdminPasswordChange
        ? 'Admin Changed'
        : 'First Login';

    // ====================================================
    // CHANGE PASSWORD
    //
    // Admin model pre-save middleware
    // will bcrypt hash it.
    // ====================================================

    admin.password =
      cleanNewPassword;

    admin.sessionVersion =
      (Number(admin.sessionVersion) || 0) + 1;

    await admin.save();

    // Keep this request signed in with its new version; other cookies
    // issued to this admin are now invalid.
    generateToken(
      res,
      admin._id,
      admin.shopId,
      Number(shop.authVersion) || 0,
      Number(admin.sessionVersion) || 0
    );

    // ====================================================
    // RECORD PASSWORD HISTORY
    // ====================================================

    shop.passwordChangeHistory.push({
      changedBy:
        'Admin',

      changeType:
        changeType,

      adminEmail:
        admin.email,

      changedAt:
        new Date(),
    });

    // ====================================================
    // PASSWORD NO LONGER TEMPORARY
    // ====================================================

    shop.mustChangePassword =
      false;

    await shop.save();

    // ====================================================
    // SUCCESS
    // ====================================================

    return res.status(200).json({
      success: true,

      message:
        'Password changed successfully.',

      data: {
        mustChangePassword:
          false,
      },
    });

  } catch (error) {
    console.error(
      'Change Admin Password Error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Internal server error',
    });
  }
};


// ========================================================
// LOGOUT
// ========================================================

const logoutAdmin = async (
  req,
  res
) => {
  try {
    await Admin.updateOne(
      { _id: req.admin._id },
      { $inc: { sessionVersion: 1 } }
    );
  } catch (error) {
    console.error('Admin session revocation error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not revoke the current session.',
    });
  }

  res.cookie('token', '', {
    httpOnly: true,

    secure:
      process.env.NODE_ENV ===
      'production',

    sameSite:
      process.env.NODE_ENV ===
      'production'
        ? 'none'
        : 'lax',

    expires:
      new Date(0),

    maxAge: 0,
  });

  return res.status(200).json({
    success: true,

    message:
      'Logged out successfully',
  });
};


// ========================================================
// GET ADMIN PROFILE
// ========================================================

const getAdminProfile = async (
  req,
  res
) => {
  try {
    if (!req.admin) {
      return res.status(404).json({
        success: false,

        message:
          'Admin profile not found',
      });
    }

    return res.status(200).json({
      success: true,

      data: {
        email:
          req.admin.email,

        mustChangePassword:
          !!req.shop?.mustChangePassword,
      },
    });
  } catch (error) {
    console.error(
      'Get Admin Profile Error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Internal server error',
    });
  }
};


// ========================================================
// EXPORTS
// ========================================================

module.exports = {
  loginAdmin,
  changeAdminPassword,
  logoutAdmin,
  getAdminProfile,
};
