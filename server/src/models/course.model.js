const mongoose = require('mongoose');

const { Schema } = mongoose;

const courseSchema = new Schema(
  {
    slug: { type: String, required: false, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '' },
    languageFrom: { type: String, default: 'en' },
    languageTo: { type: String, default: 'vi' },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    thumbnailUrl: { type: String, default: null },
    
    // Duolingo support
    imageSrc: { type: String, default: null },
    language: { type: String, default: 'en' },
    difficulty: { 
      type: String, 
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

courseSchema.pre('validate', async function () {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
});

module.exports = mongoose.model('Course', courseSchema);
