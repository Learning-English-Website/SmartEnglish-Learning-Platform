const mongoose = require('mongoose');

const { Schema } = mongoose;

const flashcardSchema = new Schema(
  {
    set: { type: Schema.Types.ObjectId, ref: 'FlashcardSet', required: true, index: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    pronunciation: { type: String, default: null },
    example: { type: String, default: null },
    note: { type: String, default: null },
    imageUrl: { type: String, default: null },
    difficulty: { type: Number, min: 0, max: 5, default: 0 },
    nextReviewAt: { type: Date, default: null },
  },
  { timestamps: true }
);

flashcardSchema.index({ set: 1, createdAt: -1 });

module.exports = mongoose.model('Flashcard', flashcardSchema);
