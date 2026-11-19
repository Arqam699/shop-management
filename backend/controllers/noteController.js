const Note = require('../models/Note');

const getNote = async (req, res) => {
  try {
    const note = await Note.findOne({ shopId: req.shopId, noteKey: 'primary' }).lean();
    return res.json({ success: true, data: note });
  } catch (error) {
    console.error('Load notepad error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load notepad.' });
  }
};

const saveNote = async (req, res) => {
  try {
    const content = String(req.body?.content ?? '');
    if (content.length > 20000) {
      return res.status(400).json({ success: false, message: 'Notepad is too long.' });
    }
    const note = await Note.findOneAndUpdate(
      { shopId: req.shopId, noteKey: 'primary' },
      { $set: { content }, $setOnInsert: { shopId: req.shopId, noteKey: 'primary' } },
      { new: true, upsert: true, runValidators: true }
    );
    return res.json({ success: true, data: note });
  } catch (error) {
    console.error('Save notepad error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save notepad.' });
  }
};

module.exports = { getNote, saveNote };
