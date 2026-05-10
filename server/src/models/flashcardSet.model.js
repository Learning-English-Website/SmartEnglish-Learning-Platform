const mongoose = require('mongoose');

const { Schema } = mongoose;

const flashcardSetSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '' },
    folder: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    isPublic: { type: Boolean, default: false },
    cardCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FlashcardSet', flashcardSetSchema);
