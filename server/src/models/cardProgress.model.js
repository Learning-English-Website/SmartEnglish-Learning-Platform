const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * CardProgress - Tracks spaced repetition data for each card per user
 * Based on SM-2 algorithm
 */
const cardProgressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    card: { type: Schema.Types.ObjectId, ref: 'Flashcard', required: true, index: true },

    // SM-2 Algorithm fields
    easeFactor: {
      type: Number,
      min: 1.3,
      max: 2.5,
      default: 2.5,
    },
    interval: {
      type: Number,
      default: 0, // days until next review
    },
    repetitions: {
      type: Number,
      default: 0, // number of successful reviews in a row
    },
    nextReview: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastReview: {
      type: Date,
      default: null,
    },
    lapses: {
      type: Number,
      default: 0, // number of times the card was forgotten
    },

    // Statistics
    totalReviews: {
      type: Number,
      default: 0,
    },
    correctReviews: {
      type: Number,
      default: 0,
    },

    // Mastery level (derived from repetitions and ease factor)
    masteryLevel: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index for efficient lookups
cardProgressSchema.index({ user: 1, card: 1 }, { unique: true });
cardProgressSchema.index({ user: 1, nextReview: 1 });

// Virtual for accuracy percentage
cardProgressSchema.virtual('accuracy').get(function () {
  if (this.totalReviews === 0) return 0;
  return Math.round((this.correctReviews / this.totalReviews) * 100);
});

// Virtual for mastery level calculation
cardProgressSchema.virtual('calculatedMasteryLevel').get(function () {
  if (this.correctReviews > 0) return 4;
  if (this.totalReviews > 0) return 2;
  return 0;
});

// Pre-save middleware to update mastery level
cardProgressSchema.pre('save', function () {
  this.masteryLevel = this.calculatedMasteryLevel;
});

// Static method to get due cards for a user
cardProgressSchema.statics.getDueCards = async function (userId, limit) {
  const now = new Date();
  return this.find({
    user: userId,
    nextReview: { $lte: now },
  })
    .sort({ nextReview: 1 })
    .limit(limit);
};

// Static method to get progress stats for a set
cardProgressSchema.statics.getSetStats = async function (userId, cardIds) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), card: { $in: cardIds } } },
    {
      $group: {
        _id: null,
        totalCards: { $sum: 1 },
        masteredCards: {
          $sum: { $cond: [{ $gt: ['$correctReviews', 0] }, 1, 0] },
        },
        learningCards: {
          $sum: { $cond: [{ $and: [{ $gt: ['$totalReviews', 0] }, { $eq: ['$correctReviews', 0] }] }, 1, 0] },
        },
        newCards: {
          $sum: { $cond: [{ $eq: ['$totalReviews', 0] }, 1, 0] },
        },
        dueCards: {
          $sum: { $cond: [{ $lte: ['$nextReview', new Date()] }, 1, 0] },
        },
        avgAccuracy: { $avg: { $cond: [{ $gt: ['$totalReviews', 0] }, { $multiply: [{ $divide: ['$correctReviews', '$totalReviews'] }, 100] }, 0] } },
      },
    },
  ]);

  return stats[0] || {
    totalCards: 0,
    masteredCards: 0,
    learningCards: 0,
    newCards: 0,
    dueCards: 0,
    avgAccuracy: 0,
  };
};

module.exports = mongoose.model('CardProgress', cardProgressSchema);
