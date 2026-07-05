const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    sender: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      username: String,
      avatar: String,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    type: {
      type: String,
      enum: ['text', 'system', 'emoji'],
      default: 'text',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Chat', chatSchema);
