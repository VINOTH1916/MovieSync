const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    roomName: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      maxlength: [60, 'Room name cannot exceed 60 characters'],
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: String,
        avatar: String,
        socketId: String,
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    movieUrl: {
      type: String,
      default: '',
    },
    movieTitle: {
      type: String,
      default: 'Untitled',
    },
    currentTime: {
      type: Number,
      default: 0,
    },
    isPlaying: {
      type: Boolean,
      default: false,
    },
    playbackSpeed: {
      type: Number,
      default: 1,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
