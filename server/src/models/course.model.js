const mongoose = require('mongoose');

const { Schema } = mongoose;

const courseSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '' },
    languageFrom: { type: String, default: 'en' },
    languageTo: { type: String, default: 'vi' },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    thumbnailUrl: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);
