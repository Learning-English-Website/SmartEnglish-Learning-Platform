const mongoose = require('mongoose');
const { Schema } = mongoose;

const aiChatMessageSchema = new Schema(
  {
    session: { type: Schema.Types.ObjectId, ref: 'AiChatSession', required: true, index: true },
    sender: { type: String, required: true, enum: ['user', 'ai'] },
    text: { type: String, required: true, maxlength: 1000 },
    translation: { type: String, default: null }, // Only for AI messages
    feedback: { type: String, default: null }      // Only for AI replies correcting user grammar
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Index to query messages in a session ordered by time
aiChatMessageSchema.index({ session: 1, createdAt: 1 });

module.exports = mongoose.model('AiChatMessage', aiChatMessageSchema);
