const express = require('express');

const router = express.Router();


// =====================================================
// CONTROLLER (inline — shop-facing, read-only)
// =====================================================

const Announcement = require('../models/Announcement');

const {
  protect,
} = require('../middleware/authMiddleware');


// =====================================================
// GET ACTIVE ANNOUNCEMENTS
// Shown as a notice banner inside the shop panel.
// NOTE: If your shop auth middleware has a different
// name/path, update the require above.
// =====================================================

router.get(
  '/active',
  protect,
  async (req, res) => {
    try {

      const announcements =
        await Announcement.find({
          active: true,
        })
          .sort({
            createdAt: -1,
          })
          .select(
            'title message createdAt'
          )
          .lean();

      return res.status(200).json({
        success: true,
        announcements,
      });

    } catch (error) {

      console.error(
        'Get Active Announcements Error:',
        error
      );

      return res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;
