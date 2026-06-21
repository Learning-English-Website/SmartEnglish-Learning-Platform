const mongoose = require('mongoose');
const { Schema } = mongoose;

const supportSessionSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    cskh: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
    unreadCount: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'waiting', 'closed'], default: 'open', index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupportSession', supportSessionSchema);
