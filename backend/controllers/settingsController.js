const Settings = require('../models/Settings');
const Admin = require('../models/Admin');

// @desc    Get current shop settings
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({});
    }

    // Automatically disable deletion mode if expired
    if (
      settings.allowGlobalDeletion &&
      settings.deletionModeExpiresAt &&
      new Date() > settings.deletionModeExpiresAt
    ) {
      settings.allowGlobalDeletion = false;
      settings.deletionModeExpiresAt = null;

      await settings.save();
    }

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve settings',
      error: error.message,
    });
  }
};


// @desc    Update normal shop settings
// @route   PUT /api/settings
// @access  Private
const updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings();
    }

    /*
      IMPORTANT:
      Normal settings update is NOT allowed to change
      deletion mode or deletion expiry.
    */
    const {
      allowGlobalDeletion,
      deletionModeExpiresAt,
      ...safeSettings
    } = req.body;

    Object.assign(settings, safeSettings);

    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message,
    });
  }
};


// @desc    Enable deletion mode after admin password verification
// @route   POST /api/settings/deletion-mode/enable
// @access  Private
const enableDeletionMode = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Admin password is required',
      });
    }

    const admin = await Admin.findById(req.admin._id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found',
      });
    }

    // Verify existing admin password
    const isPasswordCorrect = await admin.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect Admin Password. Access Denied.',
      });
    }

    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings();
    }

    // Enable deletion mode for 30 minutes
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    settings.allowGlobalDeletion = true;
    settings.deletionModeExpiresAt = expiresAt;

    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Deletion Mode enabled for 30 minutes.',
      data: settings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to enable deletion mode',
      error: error.message,
    });
  }
};


// @desc    Disable deletion mode after admin password verification
// @route   POST /api/settings/deletion-mode/disable
// @access  Private
const disableDeletionMode = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Admin password is required',
      });
    }

    const admin = await Admin.findById(req.admin._id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found',
      });
    }

    // Verify existing admin password
    const isPasswordCorrect = await admin.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect Admin Password. Access Denied.',
      });
    }

    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings();
    }

    settings.allowGlobalDeletion = false;
    settings.deletionModeExpiresAt = null;

    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Deletion Mode disabled successfully.',
      data: settings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to disable deletion mode',
      error: error.message,
    });
  }
};


module.exports = {
  getSettings,
  updateSettings,
  enableDeletionMode,
  disableDeletionMode,
};