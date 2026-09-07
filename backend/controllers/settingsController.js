const Settings = require('../models/Settings');
const Admin = require('../models/Admin');


// ============================================================
// GET CURRENT SHOP SETTINGS
// @route GET /api/settings
// @access Private
// ============================================================
const getSettings = async (req, res) => {
  try {
    // ========================================================
    // SaaS: Current shop only
    // ========================================================
    let settings =
      await Settings.findOne({
        shopId: req.shopId,
      });

    if (!settings) {
      settings = await Settings.create({
        shopId: req.shopId,
      });
    }

    // ========================================================
    // Automatically disable deletion mode if expired
    // ========================================================
    if (
      settings.allowGlobalDeletion &&
      settings.deletionModeExpiresAt &&
      new Date() >
        settings.deletionModeExpiresAt
    ) {
      settings.allowGlobalDeletion =
        false;

      settings.deletionModeExpiresAt =
        null;

      await settings.save();
    }

    return res.status(200).json({
      success: true,
      data: settings,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        'Failed to retrieve settings',
      error: error.message,
    });
  }
};


// ============================================================
// UPDATE NORMAL SHOP SETTINGS
// @route PUT /api/settings
// @access Private
// ============================================================
const updateSettings = async (
  req,
  res
) => {
  try {
    // ========================================================
    // SaaS: Current shop only
    // ========================================================
    let settings =
      await Settings.findOne({
        shopId: req.shopId,
      });

    if (!settings) {
      settings = new Settings({
        shopId: req.shopId,
      });
    }

    /*
      IMPORTANT SECURITY RULES:

      Frontend is NOT allowed to modify:
      - shopId
      - allowGlobalDeletion
      - deletionModeExpiresAt

      These are controlled by backend.
    */
    const {
      shopId,
      allowGlobalDeletion,
      deletionModeExpiresAt,
      ...safeSettings
    } = req.body;

    // Prevent unused-variable warnings while
    // intentionally blocking protected fields.
    void shopId;
    void allowGlobalDeletion;
    void deletionModeExpiresAt;

    Object.assign(
      settings,
      safeSettings
    );

    // ========================================================
    // ALWAYS force correct tenant ownership
    // ========================================================
    settings.shopId =
      req.shopId;

    await settings.save();

    return res.status(200).json({
      success: true,
      message:
        'Settings updated successfully',
      data: settings,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        'Failed to update settings',
      error: error.message,
    });
  }
};


// ============================================================
// ENABLE DELETION MODE
// @route POST /api/settings/deletion-mode/enable
// @access Private
// ============================================================
const enableDeletionMode = async (
  req,
  res
) => {
  try {
    const {
      password,
    } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message:
          'Admin password is required',
      });
    }

    // ========================================================
    // Authenticated Admin
    // ========================================================
    const admin =
      await Admin.findOne({
        _id: req.admin._id,
        shopId: req.shopId,
      });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message:
          'Admin account not found',
      });
    }

    // ========================================================
    // Verify Admin password
    // ========================================================
    const isPasswordCorrect =
      await admin.comparePassword(
        password
      );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message:
          'Incorrect Admin Password. Access Denied.',
      });
    }

    // ========================================================
    // Current shop settings only
    // ========================================================
    let settings =
      await Settings.findOne({
        shopId: req.shopId,
      });

    if (!settings) {
      settings = new Settings({
        shopId: req.shopId,
      });
    }

    // ========================================================
    // Enable deletion mode for 30 minutes
    // ========================================================
    const expiresAt =
      new Date(
        Date.now() +
        30 * 60 * 1000
      );

    settings.allowGlobalDeletion =
      true;

    settings.deletionModeExpiresAt =
      expiresAt;

    // Always enforce ownership
    settings.shopId =
      req.shopId;

    await settings.save();

    return res.status(200).json({
      success: true,
      message:
        'Deletion Mode enabled for 30 minutes.',
      data: settings,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        'Failed to enable deletion mode',
      error: error.message,
    });
  }
};


// ============================================================
// DISABLE DELETION MODE
// @route POST /api/settings/deletion-mode/disable
// @access Private
// ============================================================
const disableDeletionMode = async (
  req,
  res
) => {
  try {
    const {
      password,
    } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message:
          'Admin password is required',
      });
    }

    // ========================================================
    // Authenticated Admin
    // ========================================================
    const admin =
      await Admin.findOne({
        _id: req.admin._id,
        shopId: req.shopId,
      });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message:
          'Admin account not found',
      });
    }

    // ========================================================
    // Verify Admin password
    // ========================================================
    const isPasswordCorrect =
      await admin.comparePassword(
        password
      );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message:
          'Incorrect Admin Password. Access Denied.',
      });
    }

    // ========================================================
    // Current shop settings only
    // ========================================================
    let settings =
      await Settings.findOne({
        shopId: req.shopId,
      });

    if (!settings) {
      settings = new Settings({
        shopId: req.shopId,
      });
    }

    settings.allowGlobalDeletion =
      false;

    settings.deletionModeExpiresAt =
      null;

    // Always enforce ownership
    settings.shopId =
      req.shopId;

    await settings.save();

    return res.status(200).json({
      success: true,
      message:
        'Deletion Mode disabled successfully.',
      data: settings,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        'Failed to disable deletion mode',
      error: error.message,
    });
  }
};


// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  getSettings,
  updateSettings,
  enableDeletionMode,
  disableDeletionMode,
};