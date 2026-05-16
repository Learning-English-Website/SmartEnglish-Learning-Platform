const mongoose = require('mongoose');

const { Schema } = mongoose;

const bookmarkSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    set: { type: Schema.Types.ObjectId, ref: 'FlashcardSet', required: true, index: true },
  },
  { timestamps: true }
);

// Ensure unique bookmark per user per set
bookmarkSchema.index({ user: 1, set: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
