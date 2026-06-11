const mongoose = require('mongoose');
const { Schema } = mongoose;

const feedbackSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, enum: ['bug', 'feature', 'other'], default: 'other' },
    attachments: [{ type: String }], // Array of image URLs
    status: { type: String, enum: ['pending', 'in_progress', 'resolved'], default: 'pending' },
    cskhReply: { type: String, default: '' },
    repliedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
