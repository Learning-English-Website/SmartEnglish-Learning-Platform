const mongoose = require('mongoose');

const { Schema } = mongoose;

const noteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    card: { type: Schema.Types.ObjectId, ref: 'Flashcard', required: true, index: true },
    title: { type: String, default: '', trim: true, maxlength: 200 },
    content: { type: String, default: '' },
    relatedSet: { type: Schema.Types.ObjectId, ref: 'FlashcardSet', default: null },
  },
  { timestamps: true }
);

// Index for efficient lookups
noteSchema.index({ user: 1, card: 1 });

module.exports = mongoose.model('Note', noteSchema);
