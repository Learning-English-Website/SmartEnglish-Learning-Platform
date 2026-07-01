const mongoose = require('mongoose');

const { Schema } = mongoose;

const aiUsageLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    feature: { 
      type: String, 
      enum: ['flashcard', 'lesson_plan', 'mistake_coach', 'chatbot', 'support'],
      required: true 
    },
    provider: { type: String, default: 'gemini' },
    status: { type: String, enum: ['success', 'error'], required: true },
    latencyMs: { type: Number, required: true },
    inputSize: { type: Number, default: 0 },
    outputSize: { type: Number, default: 0 },
    errorCode: { type: String, default: null },
  },
  { 
    timestamps: { createdAt: true, updatedAt: false } // Only track creation timestamp
  }
);

// Compound index for querying user usage logs sorted by recent time
aiUsageLogSchema.index({ user: 1, feature: 1, createdAt: -1 });

// Explicit Time-To-Live (TTL) index of 90 days (90 * 24 * 3600 = 7,776,000 seconds)
aiUsageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('AiUsageLog', aiUsageLogSchema);
