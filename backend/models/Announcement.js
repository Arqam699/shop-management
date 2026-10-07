const mongoose = require('mongoose');


// =====================================================
// ANNOUNCEMENT SCHEMA
//
// Broadcast notices published by Super Admin.
// Shown inside every shop's panel.
// =====================================================

const announcementSchema =
  new mongoose.Schema(
    {
      title: {
        type: String,
        required: true,
        trim: true,
      },

      message: {
        type: String,
        required: true,
        trim: true,
      },

      active: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );


module.exports =
  mongoose.model(
    'Announcement',
    announcementSchema
  );
