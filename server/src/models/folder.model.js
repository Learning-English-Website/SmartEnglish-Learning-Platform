const mongoose = require('mongoose');

const { Schema } = mongoose;

const folderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    parent: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    sets: [{ type: Schema.Types.ObjectId, ref: 'FlashcardSet' }],
  },
  { timestamps: true }
);

folderSchema.index({ user: 1, name: 1, parent: 1 });
folderSchema.index({ user: 1, sets: 1 });

module.exports = mongoose.model('Folder', folderSchema);
