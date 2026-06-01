const mongoose = require('mongoose');

const { Schema } = mongoose;

const dailyChallengeSchema = new Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    xpReward: { type: Number, default: 50 },
    bonusMultiplier: { type: Number, default: 2 },
    participants: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DailyChallenge', dailyChallengeSchema);
