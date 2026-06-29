const mongoose = require('mongoose');

const challengeProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  courseKey: { type: String, default: null, index: true },
  lessonKey: { type: String, default: null, index: true },
  challengeKey: { type: String, default: null, index: true },
  attempted: { type: Boolean, default: false },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  wrongAttempts: { type: Number, default: 0 },
  firstAttemptCorrect: { type: Boolean, default: null },
  xpAwarded: { type: Boolean, default: false },
}, { timestamps: true });

// Index for fast lookups
challengeProgressSchema.index({ user: 1, challenge: 1 }, { unique: true });
challengeProgressSchema.index({ user: 1, challengeKey: 1 });

module.exports = mongoose.model('ChallengeProgress', challengeProgressSchema);
