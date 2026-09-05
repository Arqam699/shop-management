const Settings = require('../models/Settings');

// @desc    Get current shop settings
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve settings', error: error.message });
  }
};

// @desc    Update shop settings
// @route   PUT /api/settings
// @access  Private
const updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();
    return res.status(200).json({ success: true, message: 'Settings updated successfully', data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update settings', error: error.message });
  }
};

module.exports = { getSettings, updateSettings };