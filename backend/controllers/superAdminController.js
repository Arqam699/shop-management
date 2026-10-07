const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const SuperAdmin = require('../models/SuperAdmin');
const Shop = require('../models/Shop');
const Admin = require('../models/Admin');

const Customer = require('../models/Customer');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Expense = require('../models/Expense');
const Sale = require('../models/Sale');
const InstallmentPlan = require('../models/InstallmentPlan');
const Installment = require('../models/Installment');
const Payment = require('../models/Payment');
const Return = require('../models/Return');
const YearlyAudit = require('../models/YearlyAudit');
const Settings = require('../models/Settings');
const Announcement = require('../models/Announcement');


// =====================================================
// SUPER ADMIN LOGIN
// =====================================================

const loginSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({
        success: false,
        message: 'A valid email and password are required (maximum 72 UTF-8 bytes).',
      });
    }

    const superAdmin = await SuperAdmin.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!superAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isPasswordCorrect =
      await superAdmin.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      {
        userId: superAdmin._id,
        role: 'SuperAdmin',
        sessionVersion: Number(superAdmin.sessionVersion) || 0,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d',
      }
    );

    res.cookie('superAdminToken', token, {
      httpOnly: true,

      secure:
        process.env.NODE_ENV === 'production',

      sameSite:
        process.env.NODE_ENV === 'production'
          ? 'none'
          : 'lax',

      maxAge:
        7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,

      message:
        'Super Admin login successful',

      superAdmin: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
      },
    });

  } catch (error) {

    console.error(
      'Super Admin Login Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Server error during Super Admin login',
    });
  }
};


// =====================================================
// SUPER ADMIN LOGOUT
// =====================================================

const logoutSuperAdmin = async (req, res) => {
  try {

    // Revoke tokens from every active Super Admin session, not only this cookie.
    await SuperAdmin.updateOne(
      { _id: req.superAdmin._id },
      { $inc: { sessionVersion: 1 } }
    );

    res.cookie('superAdminToken', '', {
      httpOnly: true,

      secure:
        process.env.NODE_ENV === 'production',

      sameSite:
        process.env.NODE_ENV === 'production'
          ? 'none'
          : 'lax',

      expires:
        new Date(0),

      maxAge: 0,
    });

    return res.status(200).json({
      success: true,

      message:
        'Super Admin logged out successfully',
    });

  } catch (error) {

    console.error(
      'Super Admin Logout Error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Server error during logout',
    });
  }
};


// =====================================================
// CREATE SHOP + ADMIN
// =====================================================

const createShopAdmin = async (req, res) => {

  const session =
    await mongoose.startSession();

  session.startTransaction();

  try {

    const {
      shopName,
      ownerName,
      email,
      phone,
      password,
      subscriptionPlan,
      durationMonths,
      monthlyCharge,
    } = req.body;


    // -----------------------------
    // VALIDATION
    // -----------------------------

    if (
      !shopName ||
      !ownerName ||
      !email ||
      !password
    ) {

      await session.abortTransaction();

      return res.status(400).json({
        success: false,

        message:
          'Shop name, owner name, email and password are required',
      });
    }


    if (
      typeof password !== 'string' ||
      password.length < 12 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {

      await session.abortTransaction();

      return res.status(400).json({
        success: false,

        message:
          'Password must be at least 12 characters and at most 72 UTF-8 bytes',
      });
    }


    if (
      monthlyCharge === undefined ||
      monthlyCharge === null ||
      monthlyCharge === '' ||
      !Number.isFinite(
        Number(monthlyCharge)
      ) ||
      Number(monthlyCharge) < 0
    ) {

      await session.abortTransaction();

      return res.status(400).json({
        success: false,

        message:
          'Please enter a valid monthly charge (zero or greater)',
      });
    }


    const normalizedEmail =
      email.trim().toLowerCase();


    // -----------------------------
    // PLAN VALIDATION
    // -----------------------------

    if (
      subscriptionPlan !==
        'Free Trial' &&
      subscriptionPlan !==
        'Complete'
    ) {

      await session.abortTransaction();

      return res.status(400).json({
        success: false,

        message:
          'Subscription plan must be Free Trial or Complete',
      });
    }


    // -----------------------------
    // COMPLETE PLAN VALIDATION
    // -----------------------------

    if (
      subscriptionPlan ===
      'Complete'
    ) {

      if (
        !Number.isInteger(
          Number(durationMonths)
        ) ||
        Number(durationMonths) < 1
      ) {

        await session.abortTransaction();

        return res.status(400).json({
          success: false,

          message:
            'Complete plan duration must be at least 1 month',
        });
      }
    }


    // -----------------------------
    // CHECK EMAIL
    // -----------------------------

    const existingAdmin =
      await Admin.findOne({
        email:
          normalizedEmail,
      }).session(session);


    if (existingAdmin) {

      await session.abortTransaction();

      return res.status(409).json({
        success: false,

        message:
          'An admin account with this email already exists',
      });
    }


    // -----------------------------
    // SUBSCRIPTION EXPIRY
    // -----------------------------

    const now =
      new Date();

    let subscriptionExpiresAt;


    if (
      subscriptionPlan ===
      'Free Trial'
    ) {

      subscriptionExpiresAt =
        new Date(
          now.getTime() +
          7 *
            24 *
            60 *
            60 *
            1000
        );

    } else {

      subscriptionExpiresAt =
        new Date(now);

      subscriptionExpiresAt.setMonth(
        subscriptionExpiresAt.getMonth() +
        Number(durationMonths)
      );
    }


    // -----------------------------
    // CREATE SHOP
    // -----------------------------

    const shop =
      new Shop({
        shopName:
          shopName.trim(),

        ownerName:
          ownerName.trim(),

        email:
          normalizedEmail,

        phone:
          phone
            ? phone.trim()
            : '',

        monthlyCharge:
          Number(monthlyCharge),

        subscriptionPlan:
          subscriptionPlan,

        subscriptionStatus:
          'Active',

        subscriptionExpiresAt:
          subscriptionExpiresAt,

        subscriptionHistory:
          [],

        // =================================================
        // IMPORTANT:
        // INITIAL PASSWORD IS TEMPORARY
        //
        // Admin MUST change it on first login.
        // =================================================

        mustChangePassword:
          true,

        // New shop starts with no authorized devices.
        authorizedDevices:
          [],

        authVersion:
          0,
      });


    await shop.save({
      session,
    });


    // -----------------------------
    // CREATE ADMIN
    // -----------------------------

    const admin =
      new Admin({
        email:
          normalizedEmail,

        shopId:
          shop._id,

        // This is the temporary password.
        // Admin.js pre-save hook will hash it.
        password:
          password,

        failedLoginAttempts:
          0,
      });


    await admin.save({
      session,
    });


    // -----------------------------
    // CREATE DEFAULT SETTINGS
    // -----------------------------

    const existingSettings =
      await Settings.findOne({
        shopId:
          shop._id,
      }).session(session);


    if (!existingSettings) {

      const settings =
        new Settings({
          shopId:
            shop._id,
        });

      await settings.save({
        session,
      });
    }


    // -----------------------------
    // COMMIT
    // -----------------------------

    await session.commitTransaction();


    // -----------------------------
    // RESPONSE
    // -----------------------------

    return res.status(201).json({

      success: true,

      message:
        'Shop and admin created successfully. The admin must change the temporary password on first login.',

      shop: {

        id:
          shop._id,

        shopName:
          shop.shopName,

        ownerName:
          shop.ownerName,

        email:
          shop.email,

        phone:
          shop.phone,

        subscriptionPlan:
          shop.subscriptionPlan,

        subscriptionStatus:
          shop.subscriptionStatus,

        subscriptionExpiresAt:
          shop.subscriptionExpiresAt,

        mustChangePassword:
          shop.mustChangePassword,
      },

      admin: {

        id:
          admin._id,

        email:
          admin.email,
      },
    });

  } catch (error) {

    await session.abortTransaction();

    console.error(
      'Create Shop Admin Error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Server error while creating shop',
    });

  } finally {

    session.endSession();
  }
};


// =====================================================
// SUSPEND SHOP
// =====================================================

const suspendShop = async (req, res) => {
  try {

    const { shopId } =
      req.params;


    const shop =
      await Shop.findById(
        shopId
      );


    if (!shop) {
      return res.status(404).json({
        success: false,

        message:
          'Shop not found',
      });
    }


    const suspensionReason =
      'Suspended manually by Super Admin.';


    // ====================================================
    // SUSPEND SHOP
    // ====================================================

    shop.subscriptionStatus =
      'Suspended';

    shop.suspensionReason =
      suspensionReason;

    shop.suspendedAt =
      new Date();


    // ====================================================
    // REVOKE ALL ACTIVE SESSIONS
    // ====================================================

    shop.authVersion =
      (Number(
        shop.authVersion
      ) || 0) + 1;


    await shop.save();


    return res.status(200).json({
      success: true,

      message:
        'Shop suspended successfully. All active sessions have been revoked.',

      suspensionReason,
    });

  } catch (error) {

    console.error(
      'Suspend Shop Error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Internal server error',

      error:
        error.message,
    });
  }
};


// =====================================================
// ACTIVATE SHOP
// =====================================================

const activateShop = async (req, res) => {
  try {

    const { shopId } =
      req.params;


    const shop =
      await Shop.findById(
        shopId
      );


    if (!shop) {
      return res.status(404).json({
        success: false,

        message:
          'Shop not found',
      });
    }


    // ====================================================
    // EXPIRED SUBSCRIPTION CANNOT BE ACTIVATED
    // ====================================================

    if (
      shop.subscriptionExpiresAt &&
      new Date() >=
        new Date(
          shop.subscriptionExpiresAt
        )
    ) {

      return res.status(400).json({
        success: false,

        message:
          'This shop subscription has expired. Please renew the subscription first.',
      });
    }


    // ====================================================
    // REVOKE OLD SESSIONS
    // ====================================================

    shop.authVersion =
      (Number(
        shop.authVersion
      ) || 0) + 1;


    // ====================================================
    // ACTIVATE
    // ====================================================

    shop.subscriptionStatus =
      'Active';

    shop.suspensionReason =
      '';

    shop.suspendedAt =
      null;


    // ====================================================
    // RESET AUTHORIZED DEVICES
    //
    // Fresh activation starts with zero devices.
    // ====================================================

    shop.authorizedDevices =
      [];


    await shop.save();


    // ====================================================
    // RESET FAILED LOGIN ATTEMPTS
    // ====================================================

    await Admin.updateMany(
      {
        shopId:
          shop._id,
      },
      {
        $set: {
          failedLoginAttempts:
            0,
        },
      }
    );


    return res.status(200).json({
      success: true,

      message:
        'Shop activated successfully. All previous sessions were revoked. The owner must log in again.',
    });

  } catch (error) {

    console.error(
      'Activate Shop Error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Internal server error',
    });
  }
};

// =====================================================
// CLEAR AUTHORIZED DEVICES
// Keeps shop subscription state unchanged and revokes the
// current shop sessions so devices can sign in again.
// =====================================================

const clearShopDevices = async (req, res) => {
  try {
    const { shopId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shop ID',
      });
    }

    const shop = await Shop.findById(shopId);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }

    const clearedDevices = shop.authorizedDevices?.length || 0;
    shop.authorizedDevices = [];
    shop.authVersion = (Number(shop.authVersion) || 0) + 1;
    await shop.save();

    return res.status(200).json({
      success: true,
      clearedDevices,
      message: 'Authorized devices cleared. All shop sessions were revoked; users must sign in again.',
    });
  } catch (error) {
    console.error('Clear Shop Devices Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not clear authorized devices.',
    });
  }
};


// =====================================================
// UPDATE SHOP MONTHLY CHARGE
// =====================================================

const updateShopMonthlyCharge = async (
  req,
  res
) => {

  try {

    const { shopId } =
      req.params;

    const { monthlyCharge } =
      req.body;


    if (
      !mongoose.Types.ObjectId.isValid(
        shopId
      )
    ) {

      return res.status(400).json({
        success: false,

        message:
          'Invalid shop ID',
      });
    }


    if (
      monthlyCharge ===
        undefined ||
      monthlyCharge ===
        null ||
      monthlyCharge ===
        '' ||
      !Number.isFinite(
        Number(monthlyCharge)
      ) ||
      Number(monthlyCharge) < 0
    ) {

      return res.status(400).json({
        success: false,

        message:
          'Monthly charge must be zero or greater',
      });
    }


    const shop =
      await Shop.findByIdAndUpdate(
        shopId,

        {
          $set: {
            monthlyCharge:
              Number(monthlyCharge),
          },
        },

        {
          returnDocument:
            'after',
        }
      );


    if (!shop) {

      return res.status(404).json({
        success: false,

        message:
          'Shop not found',
      });
    }


    return res.status(200).json({
      success: true,

      message:
        'Monthly charge updated successfully',

      monthlyCharge:
        shop.monthlyCharge,
    });

  } catch (error) {

    console.error(
      'Update Shop Monthly Charge Error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Server error while updating monthly charge',
    });
  }
};


// =====================================================
// RENEW SHOP SUBSCRIPTION
// =====================================================

const renewShopSubscription = async (
  req,
  res
) => {

  try {

    const { shopId } =
      req.params;


    const {
      subscriptionPlan,
      durationMonths,
    } = req.body;


    // ============================================
    // VALIDATE SHOP ID
    // ============================================

    if (
      !mongoose.Types.ObjectId.isValid(
        shopId
      )
    ) {

      return res.status(400).json({
        success: false,

        message:
          'Invalid shop ID',
      });
    }


    // ============================================
    // VALIDATE PLAN
    // ============================================

    if (
      subscriptionPlan !==
        'Free Trial' &&
      subscriptionPlan !==
        'Complete'
    ) {

      return res.status(400).json({
        success: false,

        message:
          'Subscription plan must be Free Trial or Complete',
      });
    }


    // ============================================
    // VALIDATE COMPLETE DURATION
    // ============================================

    if (
      subscriptionPlan ===
      'Complete'
    ) {

      if (
        !Number.isInteger(
          Number(durationMonths)
        ) ||
        Number(durationMonths) < 1
      ) {

        return res.status(400).json({
          success: false,

          message:
            'Complete plan duration must be at least 1 month',
        });
      }
    }


    // ============================================
    // FIND SHOP
    // ============================================

    const shop =
      await Shop.findById(
        shopId
      );


    if (!shop) {

      return res.status(404).json({
        success: false,

        message:
          'Shop not found',
      });
    }


    // ============================================
    // DATES
    // ============================================

    const now =
      new Date();


    const previousExpiryDate =
      shop.subscriptionExpiresAt
        ? new Date(
            shop.subscriptionExpiresAt
          )
        : null;


    let baseDate =
      now;


    if (
      previousExpiryDate &&
      previousExpiryDate > now
    ) {

      baseDate =
        previousExpiryDate;
    }


    let newExpiryDate;


    // ============================================
    // FREE TRIAL
    // 7 DAYS
    // ============================================

    if (
      subscriptionPlan ===
      'Free Trial'
    ) {

      newExpiryDate =
        new Date(
          baseDate.getTime() +
          7 *
            24 *
            60 *
            60 *
            1000
        );
    }


    // ============================================
    // COMPLETE PLAN
    // ============================================

    else {

      newExpiryDate =
        new Date(
          baseDate
        );

      newExpiryDate.setMonth(
        newExpiryDate.getMonth() +
        Number(durationMonths)
      );
    }


    // ============================================
    // SUBSCRIPTION HISTORY
    // ============================================

    shop.subscriptionHistory.push({
      plan:
        subscriptionPlan,

      durationMonths:
        subscriptionPlan ===
          'Free Trial'
          ? 0
          : Number(durationMonths),

      renewedAt:
        now,

      previousExpiryDate:
        previousExpiryDate,

      newExpiryDate:
        newExpiryDate,
    });


    // ============================================
    // UPDATE SUBSCRIPTION
    // ============================================

    shop.subscriptionPlan =
      subscriptionPlan;

    shop.subscriptionStatus =
      'Active';

    shop.suspensionReason =
      '';

    shop.suspendedAt =
      null;

    shop.subscriptionExpiresAt =
      newExpiryDate;


    // ============================================
    // REVOKE ALL OLD SESSIONS
    // ============================================

    shop.authVersion =
      (Number(
        shop.authVersion
      ) || 0) + 1;


    // ============================================
    // CLEAR AUTHORIZED DEVICES
    // ============================================

    shop.authorizedDevices =
      [];


    await shop.save();


    // ============================================
    // RESPONSE
    // ============================================

    return res.status(200).json({

      success: true,

      message:
        'Subscription renewed successfully. Previous sessions have been revoked. Please log in again.',

      shop: {

        id:
          shop._id,

        shopName:
          shop.shopName,

        subscriptionPlan:
          shop.subscriptionPlan,

        subscriptionStatus:
          shop.subscriptionStatus,

        subscriptionExpiresAt:
          shop.subscriptionExpiresAt,

        subscriptionHistory:
          shop.subscriptionHistory,
      },
    });

  } catch (error) {

    console.error(
      'Renew Subscription Error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Server error while renewing subscription',
    });
  }
};


// =====================================================
// PERMANENTLY DELETE SHOP
// =====================================================

const permanentlyDeleteShop = async (
  req,
  res
) => {

  const session =
    await mongoose.startSession();

  session.startTransaction();

  try {

    const { shopId } =
      req.params;

    const { password } =
      req.body;


    // -----------------------------
    // VALIDATE SHOP ID
    // -----------------------------

    if (
      !mongoose.Types.ObjectId.isValid(
        shopId
      )
    ) {

      await session.abortTransaction();

      return res.status(400).json({
        success: false,

        message:
          'Invalid shop ID',
      });
    }


    // -----------------------------
    // VALIDATE SUPER ADMIN PASSWORD
    // -----------------------------

    if (
      !password ||
      !password.trim()
    ) {

      await session.abortTransaction();

      return res.status(400).json({
        success: false,

        message:
          'Super Admin password is required to permanently delete a shop',
      });
    }


    // -----------------------------
    // GET CURRENT SUPER ADMIN
    // -----------------------------

    const superAdmin =
      await SuperAdmin.findById(
        req.superAdmin._id
      );


    if (!superAdmin) {

      await session.abortTransaction();

      return res.status(401).json({
        success: false,

        message:
          'Super Admin account not found',
      });
    }


    // -----------------------------
    // VERIFY SUPER ADMIN PASSWORD
    // -----------------------------

    const isPasswordCorrect =
      await superAdmin.comparePassword(
        password
      );


    if (!isPasswordCorrect) {

      await session.abortTransaction();

      return res.status(401).json({
        success: false,

        message:
          'Incorrect Super Admin password',
      });
    }


    // -----------------------------
    // FIND SHOP
    // -----------------------------

    const shop =
      await Shop.findById(
        shopId
      ).session(session);


    if (!shop) {

      await session.abortTransaction();

      return res.status(404).json({
        success: false,

        message:
          'Shop not found',
      });
    }


    // -----------------------------
    // DELETE ADMIN
    // -----------------------------

    await Admin.deleteMany(
      {
        shopId:
          shop._id,
      },
      {
        session,
      }
    );


    // -----------------------------
    // DELETE CUSTOMERS
    // -----------------------------

    await Customer.deleteMany(
      {
        shopId:
          shop._id,
      },
      {
        session,
      }
    );


    // -----------------------------
    // DELETE PRODUCTS
    // -----------------------------

    await Product.deleteMany(
      {
        shopId:
          shop._id,
      },
      {
        session,
      }
    );


    // -----------------------------
    // DELETE STOCK MOVEMENTS
    // -----------------------------

    await StockMovement.deleteMany(
      {
        shopId:
          shop._id,
      },
      {
        session,
      }
    );


    // -----------------------------
    // DELETE EXPENSES
    // -----------------------------

    await Expense.deleteMany(
      {
        shopId:
          shop._id,
      },
      {
        session,
      }
    );


    // -----------------------------
    // DELETE SALES
    // -----------------------------

    await Sale.deleteMany(
      {
        shopId:
          shop._id,
      },
      {
        session,
      }
    );


    // -----------------------------
    // DELETE INSTALLMENT PLANS
    // -----------------------------

    await InstallmentPlan.deleteMany(
      {
        shopId:
          shop._id,
      },
      {
        session,
      }
    );


    // -----------------------------
    // DELETE INSTALLMENTS
    // -----------------------------

    await Installment.deleteMany(
      {
        shopId:
          shop._id,
      },
      {
        session,
      }
    );


    // -----------------------------
    // DELETE PAYMENTS
    // -----------------------------

    await Payment.deleteMany(
      {
        shopId:
          shop._id,
      },
      {
        session,
      }
    );


    // -----------------------------
    // DELETE RETURNS
    // -----------------------------

    await Return.deleteMany(
      {
        shopId:
          shop._id,
      },
      {
        session,
      }
    );


    // -----------------------------
    // DELETE YEARLY AUDITS
    // -----------------------------

    await YearlyAudit.deleteMany(
      {
        shopId:
          shop._id,
      },
      {
        session,
      }
    );


    // -----------------------------
    // DELETE SETTINGS
    // -----------------------------

    await Settings.deleteMany(
      {
        shopId:
          shop._id,
      },
      {
        session,
      }
    );


    // -----------------------------
    // DELETE SHOP
    // -----------------------------

    await Shop.deleteOne(
      {
        _id:
          shop._id,
      },
      {
        session,
      }
    );


    // -----------------------------
    // COMMIT
    // -----------------------------

    await session.commitTransaction();


    return res.status(200).json({
      success: true,

      message:
        'Shop and all related data permanently deleted',
    });

  } catch (error) {

    await session.abortTransaction();

    console.error(
      'Permanently Delete Shop Error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Server error while permanently deleting shop',
    });

  } finally {

    session.endSession();
  }
};


// =====================================================
// GET ALL SHOPS
// =====================================================

const getAllShops = async (
  req,
  res
) => {

  try {

    const shops =
      await Shop.find()
        .sort({
          createdAt:
            -1,
        })
        .lean();


    const adminEmails =
      await Admin.find({
        shopId: {
          $in:
            shops.map(
              (shop) =>
                shop._id
            ),
        },
      })
        .select(
          'email shopId'
        )
        .lean();


    const adminEmailMap =
      new Map();


    adminEmails.forEach(
      (admin) => {

        adminEmailMap.set(
          String(
            admin.shopId
          ),

          admin.email
        );
      }
    );


    const formattedShops =
      shops.map(
        (shop) => {
          const { authorizedDevices = [], ...safeShop } = shop;
          return {
          ...safeShop,

          authorizedDeviceCount: Array.isArray(authorizedDevices)
            ? authorizedDevices.length
            : 0,

          adminEmail:
            adminEmailMap.get(
              String(
                shop._id
              )
            ) ||
            shop.email ||
            null,
        };
        }
      );


    return res.status(200).json({

      success: true,

      shops:
        formattedShops,
    });

  } catch (error) {

    console.error(
      'Get All Shops Error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Server error while fetching shops',
    });
  }
};


// =====================================================
// GET DASHBOARD STATS
// =====================================================

const getDashboardStats = async (
  req,
  res
) => {

  try {

    const now =
      new Date();


    // -----------------------------
    // AUTO EXPIRE SHOPS
    // -----------------------------

    await Shop.updateMany(
      {
        subscriptionStatus:
          'Active',

        subscriptionExpiresAt: {
          $ne:
            null,

          $lte:
            now,
        },
      },

      {
        $set: {
          subscriptionStatus:
            'Expired',
        },
      }
    );


    // -----------------------------
    // COUNTS
    // -----------------------------

    const totalShops =
      await Shop.countDocuments();


    const activeShops =
      await Shop.countDocuments({
        subscriptionStatus:
          'Active',
      });


    const expiredShops =
      await Shop.countDocuments({
        subscriptionStatus:
          'Expired',
      });


    const suspendedShops =
      await Shop.countDocuments({
        subscriptionStatus:
          'Suspended',
      });


    return res.status(200).json({

      success: true,

      stats: {

        totalShops:
          totalShops,

        activeShops:
          activeShops,

        expiredShops:
          expiredShops,

        suspendedShops:
          suspendedShops,
      },
    });

  } catch (error) {

    console.error(
      'Get Dashboard Stats Error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Server error while fetching dashboard statistics',
    });
  }
};


// =====================================================
// RESET SHOP ADMIN PASSWORD
//
// Super Admin sets a TEMPORARY password.
//
// The admin MUST change this password on the next
// successful login.
//
// All previous admin sessions are revoked.
// =====================================================

// =====================================================
// RESET SHOP ADMIN PASSWORD
//
// Super Admin sets a TEMPORARY password.
//
// The admin MUST change this password on the next
// successful login.
//
// All previous admin sessions are revoked.
// =====================================================

const resetShopAdminPassword = async (
  req,
  res
) => {
  try {
    const { shopId } =
      req.params;

    const { newPassword } =
      req.body;

    // -----------------------------
    // VALIDATE SHOP ID
    // -----------------------------

    if (
      !mongoose.Types.ObjectId.isValid(
        shopId
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          'Invalid shop ID',
      });
    }

    // -----------------------------
    // VALIDATE PASSWORD
    // -----------------------------

    if (
      !newPassword ||
      !String(newPassword).trim()
    ) {
      return res.status(400).json({
        success: false,

        message:
          'New password is required',
      });
    }

    if (
      typeof newPassword !== 'string' ||
      newPassword.length < 12 ||
      Buffer.byteLength(newPassword, 'utf8') > 72
    ) {
      return res.status(400).json({
        success: false,

        message:
          'Password must be at least 12 characters and at most 72 UTF-8 bytes',
      });
    }

    // -----------------------------
    // CHECK SHOP
    // -----------------------------

    const shop =
      await Shop.findById(
        shopId
      );

    if (!shop) {
      return res.status(404).json({
        success: false,

        message:
          'Shop not found',
      });
    }

    // -----------------------------
    // FIND ADMIN
    // -----------------------------

    const admin =
      await Admin.findOne({
        shopId:
          shop._id,
      });

    if (!admin) {
      return res.status(404).json({
        success: false,

        message:
          'Admin account for this shop was not found',
      });
    }

    // =================================================
    // SET TEMPORARY PASSWORD
    //
    // Admin.js pre-save middleware hashes the password.
    // =================================================

    admin.password =
      String(newPassword);

    admin.failedLoginAttempts =
      0;

    await admin.save();

    // =================================================
    // RECORD PASSWORD RESET HISTORY
    // =================================================

    shop.passwordChangeHistory.push({
      changedBy:
        'Super Admin',

      changeType:
        'Super Admin Reset',

      adminEmail:
        admin.email,

      changedAt:
        new Date(),
    });

    // =================================================
    // FORCE PASSWORD CHANGE
    // =================================================

    shop.mustChangePassword =
      true;

    // =================================================
    // REVOKE ALL EXISTING ADMIN SESSIONS
    // =================================================

    shop.authVersion =
      (Number(
        shop.authVersion
      ) || 0) + 1;

    await shop.save();

    // -----------------------------
    // RESPONSE
    // -----------------------------

    return res.status(200).json({
      success: true,

      message:
        'Temporary admin password set successfully. The admin must change this password on the next login.',

      passwordChangeRequired:
        true,

      shop: {
        shopId:
          shop._id,

        shopName:
          shop.shopName,
      },

      admin: {
        id:
          admin._id,

        email:
          admin.email,
      },
    });

  } catch (error) {
    console.error(
      'Reset Shop Admin Password Error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Server error while resetting admin password',
    });
  }
};
// =====================================================
// GET SHOP PASSWORD HISTORY
// =====================================================

const getShopPasswordHistory = async (
  req,
  res
) => {
  try {
    const { shopId } =
      req.params;

    // -----------------------------
    // VALIDATE SHOP ID
    // -----------------------------

    if (
      !mongoose.Types.ObjectId.isValid(
        shopId
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          'Invalid shop ID',
      });
    }

    // -----------------------------
    // FIND SHOP
    // -----------------------------

    const shop =
      await Shop.findById(
        shopId
      )
        .select(
          'shopName ownerName email passwordChangeHistory'
        )
        .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,

        message:
          'Shop not found',
      });
    }

    // -----------------------------
    // SORT NEWEST FIRST
    // -----------------------------

    const history =
      Array.isArray(
        shop.passwordChangeHistory
      )
        ? [
            ...shop.passwordChangeHistory,
          ].sort(
            (a, b) =>
              new Date(
                b.changedAt
              ) -
              new Date(
                a.changedAt
              )
          )
        : [];

    // -----------------------------
    // RESPONSE
    // -----------------------------

    return res.status(200).json({
      success: true,

      shop: {
        id:
          shop._id,

        shopName:
          shop.shopName,

        ownerName:
          shop.ownerName,

        email:
          shop.email,
      },

      totalChanges:
        history.length,

      history,
    });

  } catch (error) {
    console.error(
      'Get Password History Error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Server error while fetching password history',
    });
  }
};


// =====================================================
// RECORD SHOP PAYMENT (Monthly Collection)
// =====================================================

const recordShopPayment = async (
  req,
  res
) => {
  try {

    const { shopId } =
      req.params;

    const {
      month,
      amount,
      paidVia,
      note,
    } = req.body;


    if (
      !mongoose.Types.ObjectId.isValid(
        shopId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shop ID',
      });
    }


    // month format: YYYY-MM

    const normalizedMonth =
      String(month || '').trim();

    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(
        normalizedMonth
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Month must be in YYYY-MM format',
      });
    }


    if (
      amount === undefined ||
      amount === null ||
      amount === '' ||
      !Number.isFinite(
        Number(amount)
      ) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please enter a valid payment amount',
      });
    }


    const shop =
      await Shop.findById(
        shopId
      );

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }


    const alreadyPaid = (
      shop.paymentHistory || []
    ).some(
      (p) =>
        p.month ===
        normalizedMonth
    );

    if (alreadyPaid) {
      return res.status(409).json({
        success: false,
        message: `Payment for ${normalizedMonth} is already recorded`,
      });
    }


    shop.paymentHistory.push({
      month: normalizedMonth,
      amount: Number(amount),
      paidVia: paidVia
        ? String(paidVia).trim()
        : '',
      note: note
        ? String(note).trim()
        : '',
      paidAt: new Date(),
      recordedBy: 'Super Admin',
    });

    await shop.save();


    return res.status(201).json({
      success: true,
      message:
        'Payment recorded successfully',
      paymentHistory:
        shop.paymentHistory,
    });

  } catch (error) {

    console.error(
      'Record Shop Payment Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Server error while recording payment',
    });
  }
};


// =====================================================
// DELETE SHOP PAYMENT
// =====================================================

const deleteShopPayment = async (
  req,
  res
) => {
  try {

    const {
      shopId,
      paymentId,
    } = req.params;


    if (
      !mongoose.Types.ObjectId.isValid(
        shopId
      ) ||
      !mongoose.Types.ObjectId.isValid(
        paymentId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID',
      });
    }


    const shop =
      await Shop.findById(
        shopId
      );

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }


    shop.paymentHistory = (
      shop.paymentHistory || []
    ).filter(
      (p) =>
        String(p._id) !==
        String(paymentId)
    );

    await shop.save();


    return res.status(200).json({
      success: true,
      message:
        'Payment entry deleted',
      paymentHistory:
        shop.paymentHistory,
    });

  } catch (error) {

    console.error(
      'Delete Shop Payment Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Server error while deleting payment',
    });
  }
};


// =====================================================
// UPDATE SHOP NOTES (Super Admin private notes)
// =====================================================

const updateShopNotes = async (
  req,
  res
) => {
  try {

    const { shopId } =
      req.params;

    const { notes } =
      req.body;


    if (
      !mongoose.Types.ObjectId.isValid(
        shopId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shop ID',
      });
    }


    const shop =
      await Shop.findByIdAndUpdate(
        shopId,
        {
          $set: {
            superAdminNotes: notes
              ? String(notes).trim()
              : '',
            notesUpdatedAt:
              new Date(),
          },
        },
        {
          returnDocument:
            'after',
        }
      );

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }


    return res.status(200).json({
      success: true,
      message:
        'Notes saved successfully',
    });

  } catch (error) {

    console.error(
      'Update Shop Notes Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Server error while saving notes',
    });
  }
};


// =====================================================
// GET ALL ANNOUNCEMENTS (Super Admin)
// =====================================================

const getAnnouncements = async (
  req,
  res
) => {
  try {

    const announcements =
      await Announcement.find()
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      announcements,
    });

  } catch (error) {

    console.error(
      'Get Announcements Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Server error while fetching announcements',
    });
  }
};


// =====================================================
// CREATE ANNOUNCEMENT
// =====================================================

const createAnnouncement = async (
  req,
  res
) => {
  try {

    const {
      title,
      message,
    } = req.body;


    if (
      !title ||
      !String(title).trim() ||
      !message ||
      !String(message).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Title and message are required',
      });
    }


    const announcement =
      await Announcement.create({
        title:
          String(title).trim(),
        message:
          String(message).trim(),
        active: true,
      });


    return res.status(201).json({
      success: true,
      message:
        'Notice published successfully',
      announcement,
    });

  } catch (error) {

    console.error(
      'Create Announcement Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Server error while creating announcement',
    });
  }
};


// =====================================================
// UPDATE ANNOUNCEMENT
// =====================================================

const updateAnnouncement = async (
  req,
  res
) => {
  try {

    const { id } =
      req.params;

    const {
      title,
      message,
      active,
    } = req.body;


    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid announcement ID',
      });
    }


    const update = {};

    if (title !== undefined) {
      update.title =
        String(title).trim();
    }

    if (message !== undefined) {
      update.message =
        String(message).trim();
    }

    if (active !== undefined) {
      update.active =
        Boolean(active);
    }


    const announcement =
      await Announcement.findByIdAndUpdate(
        id,
        { $set: update },
        {
          returnDocument:
            'after',
        }
      );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message:
          'Announcement not found',
      });
    }


    return res.status(200).json({
      success: true,
      message:
        'Notice updated successfully',
      announcement,
    });

  } catch (error) {

    console.error(
      'Update Announcement Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Server error while updating announcement',
    });
  }
};


// =====================================================
// DELETE ANNOUNCEMENT
// =====================================================

const deleteAnnouncement = async (
  req,
  res
) => {
  try {

    const { id } =
      req.params;


    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid announcement ID',
      });
    }


    await Announcement.deleteOne({
      _id: id,
    });


    return res.status(200).json({
      success: true,
      message:
        'Notice deleted successfully',
    });

  } catch (error) {

    console.error(
      'Delete Announcement Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Server error while deleting announcement',
    });
  }
};


// =====================================================
// UPDATE SHOP DETAILS
// Edits shop name, owner name, email and phone.
// Changing the email also updates the linked Admin
// login email (checked for uniqueness first).
// =====================================================

const updateShopDetails = async (
  req,
  res
) => {

  const session =
    await mongoose.startSession();

  session.startTransaction();

  try {

    const { shopId } =
      req.params;

    const {
      shopName,
      ownerName,
      email,
      phone,
    } = req.body;


    if (
      !mongoose.Types.ObjectId.isValid(
        shopId
      )
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: 'Invalid shop ID',
      });
    }


    const shop =
      await Shop.findById(
        shopId
      ).session(session);

    if (!shop) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }


    const updates = {};


    if (shopName !== undefined) {
      if (!String(shopName).trim()) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message:
            'Shop name cannot be empty',
        });
      }

      updates.shopName =
        String(shopName).trim();
    }


    if (ownerName !== undefined) {
      if (!String(ownerName).trim()) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message:
            'Owner name cannot be empty',
        });
      }

      updates.ownerName =
        String(ownerName).trim();
    }


    if (phone !== undefined) {
      updates.phone =
        String(phone || '').trim();
    }


    let emailChanged = false;
    let newEmail = null;

    if (email !== undefined) {
      newEmail = String(email || '')
        .trim()
        .toLowerCase();

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          newEmail
        )
      ) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message:
            'Please enter a valid email',
        });
      }

      if (newEmail !== shop.email) {
        const clash =
          await Admin.findOne({
            email: newEmail,
          }).session(session);

        if (
          clash &&
          String(clash.shopId) !==
            String(shop._id)
        ) {
          await session.abortTransaction();

          return res.status(409).json({
            success: false,
            message:
              'This email is already used by another shop admin',
          });
        }

        emailChanged = true;
        updates.email = newEmail;
      }
    }


    if (
      Object.keys(updates).length ===
      0
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: 'Nothing to update',
      });
    }


    await Shop.updateOne(
      { _id: shop._id },
      { $set: updates },
      { session }
    );


    // Keep the Admin login email in sync.

    if (emailChanged) {
      await Admin.updateMany(
        { shopId: shop._id },
        {
          $set: {
            email: newEmail,
          },
        },
        { session }
      );
    }


    await session.commitTransaction();


    return res.status(200).json({
      success: true,
      message: emailChanged
        ? 'Shop updated successfully. The admin must now log in with the new email.'
        : 'Shop updated successfully.',
    });

  } catch (error) {

    await session.abortTransaction();

    console.error(
      'Update Shop Details Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Server error while updating shop',
    });

  } finally {

    session.endSession();
  }
};


// =====================================================
// EXPORTS
// =====================================================

// =====================================================
// EXPORTS
// =====================================================

module.exports = {

  loginSuperAdmin,

  logoutSuperAdmin,

  createShopAdmin,

  suspendShop,

  activateShop,
  clearShopDevices,

  renewShopSubscription,

  updateShopMonthlyCharge,

  permanentlyDeleteShop,

  getAllShops,

  getDashboardStats,

  resetShopAdminPassword,

  getShopPasswordHistory,

  recordShopPayment,

  deleteShopPayment,

  updateShopNotes,

  getAnnouncements,

  createAnnouncement,

  updateAnnouncement,

  deleteAnnouncement,

  updateShopDetails,
};
