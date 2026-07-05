const Room = require('../models/Room');
const Chat = require('../models/Chat');
const User = require('../models/User');
const generateRoomId = require('../utils/generateRoomId');

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Private
const createRoom = async (req, res, next) => {
  try {
    const { roomName, isPrivate, password, movieUrl, movieTitle } = req.body;

    if (!roomName) {
      return res.status(400).json({ success: false, message: 'Room name is required' });
    }

    const roomId = generateRoomId();

    const room = await Room.create({
      roomId,
      roomName,
      host: req.user._id,
      isPrivate: isPrivate || false,
      password: isPrivate && password ? password : '',
      movieUrl: movieUrl || '',
      movieTitle: movieTitle || 'Untitled',
    });

    await room.populate('host', 'username avatar');

    res.status(201).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all public active rooms
// @route   GET /api/rooms
// @access  Private
const getRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({ isPrivate: false, isActive: true })
      .populate('host', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single room by roomId
// @route   GET /api/rooms/:roomId
// @access  Private
const getRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId, isActive: true }).populate(
      'host',
      'username avatar'
    );

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found or has ended' });
    }

    // If private, require password (unless host)
    if (room.isPrivate && room.host._id.toString() !== req.user._id.toString()) {
      const { password } = req.query;
      if (!password || password !== room.password) {
        return res.status(403).json({ success: false, message: 'Incorrect room password' });
      }
    }

    res.json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

// @desc    Update room (movie URL, title, lock)
// @route   PUT /api/rooms/:roomId
// @access  Private (host only)
const updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId, isActive: true });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the host can update the room' });
    }

    const { movieUrl, movieTitle, isLocked, playbackSpeed, currentTime, isPlaying } = req.body;

    if (movieUrl !== undefined) room.movieUrl = movieUrl;
    if (movieTitle !== undefined) room.movieTitle = movieTitle;
    if (isLocked !== undefined) room.isLocked = isLocked;
    if (playbackSpeed !== undefined) room.playbackSpeed = playbackSpeed;
    if (currentTime !== undefined) room.currentTime = currentTime;
    if (isPlaying !== undefined) room.isPlaying = isPlaying;

    await room.save();

    res.json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

// @desc    End/delete a room
// @route   DELETE /api/rooms/:roomId
// @access  Private (host only)
const endRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the host can end the room' });
    }

    room.isActive = false;
    await room.save();

    res.json({ success: true, message: 'Room ended successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload video for a room
// @route   POST /api/rooms/:roomId/upload
// @access  Private (host only)
const uploadMovie = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file uploaded' });
    }

    const room = await Room.findOne({ roomId: req.params.roomId, isActive: true });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the host can upload movies' });
    }

    const videoUrl = `/uploads/${req.file.filename}`;
    room.movieUrl = videoUrl;
    room.movieTitle = req.body.title || req.file.originalname;
    room.currentTime = 0;
    room.isPlaying = false;
    await room.save();

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      data: { movieUrl: videoUrl, movieTitle: room.movieTitle },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get chat history for a room
// @route   GET /api/rooms/:roomId/chat
// @access  Private
const getChatHistory = async (req, res, next) => {
  try {
    const messages = await Chat.find({ roomId: req.params.roomId })
      .sort({ createdAt: 1 })
      .limit(100);

    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's watch history
// @route   GET /api/rooms/history/me
// @access  Private
const getWatchHistory = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('watchHistory');
    res.json({ success: true, data: user.watchHistory });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRoom,
  getRooms,
  getRoom,
  updateRoom,
  endRoom,
  uploadMovie,
  getChatHistory,
  getWatchHistory,
};
