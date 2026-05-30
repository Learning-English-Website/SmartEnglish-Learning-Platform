const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  type: {
    type: String,
    enum: ['SELECT', 'ASSIST', 'TYPE', 'TRANSLATE', 'COMPLETE', 'ORDER', 'MATCH', 'FILL', 'LISTEN'],
    required: true
  },
  question: { type: String, required: true },
  // For TYPE / TRANSLATE / COMPLETE / FILL / ORDER / LISTEN challenges
  correctAnswer: { type: String, default: null },
  // For TRANSLATE challenges (VN->EN or EN->VN)
  sourceLang: { type: String, default: 'vi' }, // 'vi' or 'en'
  targetLang: { type: String, default: 'en' },
  // For SELECT challenges (image-based)
  imageSrc: { type: String, default: null },
  audioSrc: { type: String, default: null },
  // For ORDER challenges (sắp xếp từ thành câu)
  wordBank: { type: [String], default: null }, // ['I', 'go', 'to', 'school']
  correctOrder: { type: [Number], default: null }, // [0, 2, 1, 3] (chỉ số ghép với wordBank)
  // For MATCH challenges (nối cặp)
  pairs: { type: [{ left: String, right: String }], default: null },
  // For SELECT / ASSIST / FILL challenges (multi-choice options with correct flag)
  options: { type: [{ text: String, correct: Boolean }], default: null },
  // For COMPLETE challenges (điền từ vào chỗ trống)
  sentence: { type: String, default: null }, // "She is a ___ teacher"
  blankIndex: { type: Number, default: null }, // vị trí từ bị ẩn trong wordBank
  // For LISTEN challenges (nghe rồi viết)
  hint: { type: String, default: null }, // gợi ý (ví dụ: "_ _ _ _ _")
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Challenge', challengeSchema);
