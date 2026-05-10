const mongoose = require('mongoose');

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['system', 'streak', 'achievement', 'friend', 'reminder'],
      default: 'system',
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, default: '' },
    data: { type: Schema.Types.Mixed, default: null },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    actionUrl: { type: String, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
