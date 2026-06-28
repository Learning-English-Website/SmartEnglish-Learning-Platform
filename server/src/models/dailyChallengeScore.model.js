const mongoose = require('mongoose');

const { Schema } = mongoose;

const dailyChallengeScoreSchema = new Schema(
  {
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    challenge: { type: Schema.Types.ObjectId, ref: 'DailyChallenge', required: true, index: true },
    xp: { type: Number, default: 0 },
    answeredChallenges: [{ type: Schema.Types.ObjectId, ref: 'Challenge' }],
    failedChallenges: [{ type: Schema.Types.ObjectId, ref: 'Challenge' }],
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

dailyChallengeScoreSchema.index({ date: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('DailyChallengeScore', dailyChallengeScoreSchema);
