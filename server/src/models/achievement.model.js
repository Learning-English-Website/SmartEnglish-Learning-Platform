const mongoose = require('mongoose');

const { Schema } = mongoose;

const achievementSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    iconUrl: { type: String, default: null },
    requiredXP: { type: Number, default: null },
    requiredStreak: { type: Number, default: null },
    requiredReviews: { type: Number, default: null },
    xpReward: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Achievement', achievementSchema);
