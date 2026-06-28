const mongoose = require('mongoose');

const { Schema } = mongoose;

const unitSchema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    summary: { type: String, default: '' },
    description: { type: String, default: '' }, // Duolingo support
    order: { type: Number, default: 0 },
    xpReward: { type: Number, default: 10 },
    isLockedDefault: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false }, // Duolingo support
  },
  { timestamps: true }
);

unitSchema.index({ course: 1, order: 1 });

module.exports = mongoose.model('Unit', unitSchema);
