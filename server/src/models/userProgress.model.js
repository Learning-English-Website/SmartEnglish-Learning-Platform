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
    
    // Duolingo Hearts & Progress
    activeCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    hearts: { type: Number, default: 5 },             // Max 5 hearts
    maxHearts: { type: Number, default: 5 },
    points: { type: Number, default: 0 },            // XP
    streak: { type: Number, default: 0 },
    lastStudyDate: { type: Date, default: null },
    
    // Pro subscription (MoMo + PayOS)
    isPro: { type: Boolean, default: false },
    proActivatedAt: { type: Date, default: null },
    proExpiresAt: { type: Date, default: null },
    proMethod: { type: String, enum: ['momo', 'payos', null], default: null },
    
    // Legacy Stripe (for migration)
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserProgress', userProgressSchema);
