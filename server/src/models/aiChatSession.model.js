const mongoose = require('mongoose');
const { Schema } = mongoose;

const aiChatSessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    persona: { 
      type: String, 
      required: true, 
      enum: ['barista', 'receptionist', 'interviewer', 'friend', 'professor', 'doctor', 'customs_officer', 'server', 'ielts_examiner', 'support_agent', 'recruiter', 'custom'] 
    },
    topic: { type: String, required: true },
    level: { type: String, required: true, enum: ['A1-A2', 'B1-B2', 'C1-C2'] },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    summary: { type: Schema.Types.Mixed, default: null },
    customScenario: { type: String, default: "" }
  },
  { 
    timestamps: true 
  }
);

// Index for query session list by user
aiChatSessionSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model('AiChatSession', aiChatSessionSchema);
