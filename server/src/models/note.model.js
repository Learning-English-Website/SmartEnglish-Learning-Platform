const mongoose = require('mongoose');

const { Schema } = mongoose;

const noteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: '', trim: true, maxlength: 200 },
    content: { type: String, default: '' },
    relatedSet: { type: Schema.Types.ObjectId, ref: 'FlashcardSet', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Note', noteSchema);
