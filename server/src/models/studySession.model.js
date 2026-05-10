const mongoose = require('mongoose');

const { Schema } = mongoose;

const studySessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: {
      type: String,
      enum: ['flashcard_set', 'lesson', 'review_queue', 'mixed'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, default: null },
    mode: { type: String, enum: ['learn', 'review', 'test'], default: 'learn' },
    accuracy: { type: Number, min: 0, max: 100, default: null },
    retentionScore: { type: Number, min: 0, max: 1, default: null },
    cardsReviewed: { type: Number, default: 0 },
    durationMs: { type: Number, default: null },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

studySessionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('StudySession', studySessionSchema);
