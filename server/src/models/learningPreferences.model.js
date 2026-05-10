const mongoose = require('mongoose');

const { Schema } = mongoose;

const learningPreferencesSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    dailyGoalMinutes: { type: Number, default: 15, min: 5, max: 120 },
    targetLanguage: { type: String, default: 'en' },
    nativeLanguage: { type: String, default: 'vi' },
    reminderEnabled: { type: Boolean, default: false },
    reminderTime: { type: String, default: '09:00' }, // HH:mm
    soundEnabled: { type: Boolean, default: true },
    darkMode: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LearningPreferences', learningPreferencesSchema);
