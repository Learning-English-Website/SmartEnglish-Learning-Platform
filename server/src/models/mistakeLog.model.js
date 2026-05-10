const mongoose = require('mongoose');

const { Schema } = mongoose;

const mistakeLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    flashcard: { type: Schema.Types.ObjectId, ref: 'Flashcard', required: true },
    session: { type: Schema.Types.ObjectId, ref: 'StudySession', default: null },
    userAnswer: { type: String, default: '' },
    correctAnswer: { type: String, required: true },
    isResolved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

mistakeLogSchema.index({ user: 1, isResolved: 1 });

module.exports = mongoose.model('MistakeLog', mistakeLogSchema);
