const mongoose = require('mongoose');

const { Schema } = mongoose;

const userProgressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    totalXP: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActivityDate: { type: Date, default: null },
    skillLevels: { type: Map, of: Number, default: () => new Map() },
    crownsByLesson: { type: Map, of: Number, default: () => new Map() },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserProgress', userProgressSchema);
