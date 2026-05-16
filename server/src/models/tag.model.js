const mongoose = require('mongoose');

const { Schema } = mongoose;

const tagSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 64 },
    color: { type: String, default: '#6366f1' },
    folder: { type: Schema.Types.ObjectId, ref: 'Folder', default: null }, // null = global tag
  },
  { timestamps: true }
);

tagSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Tag', tagSchema);
