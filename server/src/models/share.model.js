const mongoose = require('mongoose');

const { Schema } = mongoose;

function generateShareCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const shareSchema = new Schema(
  {
    set: { type: Schema.Types.ObjectId, ref: 'FlashcardSet', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shareCode: { type: String, required: true, unique: true, default: generateShareCode },
    isActive: { type: Boolean, default: true },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Index for efficient lookups
shareSchema.index({ set: 1, user: 1 });

module.exports = mongoose.model('Share', shareSchema);
