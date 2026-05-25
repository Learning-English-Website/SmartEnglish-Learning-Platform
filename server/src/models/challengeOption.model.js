const mongoose = require('mongoose');

const challengeOptionSchema = new mongoose.Schema({
  challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  text: { type: String, required: true },          // "el hombre"
  correct: { type: Boolean, default: false },
  imageSrc: { type: String, default: null },       // for SELECT type
  audioSrc: { type: String, default: null },       // for SELECT type
}, { timestamps: true });

module.exports = mongoose.model('ChallengeOption', challengeOptionSchema);
