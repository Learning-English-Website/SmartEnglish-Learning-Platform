const mongoose = require('mongoose');

const { Schema } = mongoose;

const exerciseSchema = new Schema(
  {
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    type: {
      type: String,
      enum: ['multiple_choice', 'fill_blank', 'listen', 'translate', 'speak'],
      required: true,
    },
    prompt: { type: String, required: true },
    mediaUrl: { type: String, default: null },
    options: [{ type: String }],
    correctAnswer: { type: String, required: true },
    explanation: { type: String, default: '' },
    order: { type: Number, default: 0 },
    xpValue: { type: Number, default: 10 },
  },
  { timestamps: true }
);

exerciseSchema.index({ lesson: 1, order: 1 });

module.exports = mongoose.model('Exercise', exerciseSchema);
