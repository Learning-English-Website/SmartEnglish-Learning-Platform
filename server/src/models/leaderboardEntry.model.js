const mongoose = require('mongoose');

const { Schema } = mongoose;

const leaderboardEntrySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    period: { type: String, required: true }, // e.g. week-2026-05-10
    league: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'], default: 'bronze' },
    xp: { type: Number, default: 0 },
    rank: { type: Number, default: null },
  },
  { timestamps: true }
);

leaderboardEntrySchema.index({ period: 1, xp: -1 });
leaderboardEntrySchema.index({ user: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('LeaderboardEntry', leaderboardEntrySchema);
