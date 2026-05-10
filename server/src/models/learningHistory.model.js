const mongoose = require('mongoose');

const { Schema } = mongoose;

const learningHistorySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    minutesStudied: { type: Number, default: 0 },
    xpEarned: { type: Number, default: 0 },
    lessonsCompleted: { type: Number, default: 0 },
    cardsReviewed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

learningHistorySchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('LearningHistory', learningHistorySchema);
