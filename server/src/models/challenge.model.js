const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  type: { 
    type: String, 
    enum: ['SELECT', 'ASSIST', 'TYPE'],  // SELECT=image match, ASSIST=translate, TYPE=type answer
    required: true 
  },
  question: { type: String, required: true },
  // For TYPE challenges
  correctAnswer: { type: String, default: null },
  // For SELECT challenges (image-based)
  imageSrc: { type: String, default: null },
  audioSrc: { type: String, default: null },
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Challenge', challengeSchema);
