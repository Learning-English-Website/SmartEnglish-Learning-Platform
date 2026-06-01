const mongoose = require('mongoose');

const { Schema } = mongoose;

const dailyQuestSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    day: { type: Date, required: true }, // UTC date-at-midnight in app logic
    type: {
      type: String,
      enum: ['xp', 'lessons', 'reviews', 'streak', 'flashcards'],
      required: true,
    },
    targetValue: { type: Number, required: true },
    progress: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    xpReward: { type: Number, default: 15 },
    completedAt: { type: Date, default: null },
    rewardClaimed: { type: Boolean, default: false },
    claimedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

dailyQuestSchema.index({ user: 1, day: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('DailyQuest', dailyQuestSchema);
