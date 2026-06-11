const mongoose = require('mongoose');
const { Schema } = mongoose;

const supportMessageSchema = new Schema(
  {
    session: { type: Schema.Types.ObjectId, ref: 'SupportSession', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupportMessage', supportMessageSchema);
