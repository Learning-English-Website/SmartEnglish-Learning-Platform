const mongoose = require('mongoose');

const { Schema } = mongoose;

const userAchievementSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    achievement: { type: Schema.Types.ObjectId, ref: 'Achievement', required: true },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    unlockedAt: { type: Date, default: null },
    claimed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userAchievementSchema.index({ user: 1, achievement: 1 }, { unique: true });

module.exports = mongoose.model('UserAchievement', userAchievementSchema);
