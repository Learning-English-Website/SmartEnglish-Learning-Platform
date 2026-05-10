const mongoose = require('mongoose');

const { Schema } = mongoose;

const lessonSchema = new Schema(
  {
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    subtitle: { type: String, default: '' },
    order: { type: Number, default: 0 },
    xpReward: { type: Number, default: 5 },
    estimatedMinutes: { type: Number, default: 5 },
    grammarFocus: [{ type: String }],
    vocabFocus: [{ type: String }],
  },
  { timestamps: true }
);

lessonSchema.index({ unit: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
