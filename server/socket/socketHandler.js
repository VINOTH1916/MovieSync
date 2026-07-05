const jwt = require('jsonwebtoken');
const Room = require('../models/Room');
const Chat = require('../models/Chat');
const User = require('../models/User');

// Map: socketId -> { userId, username, avatar, roomId }
const connectedUsers = new Map();

// Map: roomId -> Set of socketIds
const roomSockets = new Map();

const socketHandler = (io) => {
  // ─── Auth middleware for socket connections ───────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('username avatar');
      if (!user) return next(new Error('User not found'));
      socket.user = { id: user._id.toString(), username: user.username, avatar: user.avatar };
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id} (${socket.user.username})`);

    // ─── CREATE ROOM ────────────────────────────────────────────────────────
    socket.on('create-room', async ({ roomId }, callback) => {
      try {
        const room = await Room.findOne({ roomId, isActive: true }).populate('host', 'username avatar');
        if (!room) return callback?.({ error: 'Room not found' });

        await _joinRoom(socket, room, io);
        callback?.({ success: true, room });
      } catch (err) {
        console.error('[create-room]', err);
        callback?.({ error: 'Failed to create room' });
      }
    });

    // ─── JOIN ROOM ───────────────────────────────────────────────────────────
    socket.on('join-room', async ({ roomId, password }, callback) => {
      try {
        const room = await Room.findOne({ roomId, isActive: true }).populate('host', 'username avatar');
        if (!room) return callback?.({ error: 'Room not found or has ended' });

        if (room.isPrivate && room.host._id.toString() !== socket.user.id) {
          if (!password || password !== room.password) {
            return callback?.({ error: 'Incorrect room password' });
          }
        }

        await _joinRoom(socket, room, io, callback);
      } catch (err) {
        console.error('[join-room]', err);
        callback?.({ error: 'Failed to join room' });
      }
    });

    // ─── LEAVE ROOM ──────────────────────────────────────────────────────────
    socket.on('leave-room', async ({ roomId }) => {
      await _leaveRoom(socket, roomId, io);
    });

    // ─── PLAY ────────────────────────────────────────────────────────────────
    socket.on('play', async ({ roomId, currentTime }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const room = await Room.findOne({ roomId, isActive: true });
      if (!room) return;

      // If room is locked, only host can control
      if (room.isLocked && room.host.toString() !== socket.user.id) return;

      room.isPlaying = true;
      room.currentTime = currentTime ?? room.currentTime;
      await room.save();

      socket.to(roomId).emit('sync-state', {
        isPlaying: true,
        currentTime: room.currentTime,
        triggeredBy: socket.user.username,
      });
    });

    // ─── PAUSE ───────────────────────────────────────────────────────────────
    socket.on('pause', async ({ roomId, currentTime }) => {
      const room = await Room.findOne({ roomId, isActive: true });
      if (!room) return;

      if (room.isLocked && room.host.toString() !== socket.user.id) return;

      room.isPlaying = false;
      room.currentTime = currentTime ?? room.currentTime;
      await room.save();

      socket.to(roomId).emit('sync-state', {
        isPlaying: false,
        currentTime: room.currentTime,
        triggeredBy: socket.user.username,
      });
    });

    // ─── SEEK ────────────────────────────────────────────────────────────────
    socket.on('seek', async ({ roomId, currentTime }) => {
      const room = await Room.findOne({ roomId, isActive: true });
      if (!room) return;

      if (room.isLocked && room.host.toString() !== socket.user.id) return;

      room.currentTime = currentTime;
      await room.save();

      socket.to(roomId).emit('sync-state', {
        isPlaying: room.isPlaying,
        currentTime,
        triggeredBy: socket.user.username,
      });
    });

    // ─── PLAYBACK SPEED ──────────────────────────────────────────────────────
    socket.on('playback-speed', async ({ roomId, speed }) => {
      const room = await Room.findOne({ roomId, isActive: true });
      if (!room) return;

      if (room.isLocked && room.host.toString() !== socket.user.id) return;

      room.playbackSpeed = speed;
      await room.save();

      socket.to(roomId).emit('sync-state', {
        playbackSpeed: speed,
        triggeredBy: socket.user.username,
      });
    });

    // ─── LOCAL FILE MODE ─────────────────────────────────────────────────────
    // Host announces they are using a local file (only filename is shared, not the file itself)
    socket.on('local-file-announce', async ({ roomId, fileName }) => {
      const room = await Room.findOne({ roomId, isActive: true });
      if (!room || room.host.toString() !== socket.user.id) return;

      // Store special marker so late joiners know it's local-file mode
      room.movieUrl = `local-file://${fileName}`;
      room.movieTitle = fileName;
      room.currentTime = 0;
      room.isPlaying = false;
      await room.save();

      // Tell everyone in the room (including host) the filename to load
      io.to(roomId).emit('local-file-announced', {
        fileName,
        hostName: socket.user.username,
      });
    });

    // Member reports they have loaded their local file copy and are ready
    socket.on('local-file-ready', ({ roomId }) => {
      socket.to(roomId).emit('member-file-ready', {
        username: socket.user.username,
        socketId: socket.id,
      });
    });

    // ─── CHANGE MOVIE ────────────────────────────────────────────────────────
    socket.on('change-movie', async ({ roomId, movieUrl, movieTitle }) => {
      const room = await Room.findOne({ roomId, isActive: true });
      if (!room) return;

      // Only host can change the movie
      if (room.host.toString() !== socket.user.id) return;

      room.movieUrl = movieUrl;
      room.movieTitle = movieTitle || 'Untitled';
      room.currentTime = 0;
      room.isPlaying = false;
      await room.save();

      io.to(roomId).emit('movie-updated', {
        movieUrl,
        movieTitle: room.movieTitle,
        currentTime: 0,
        isPlaying: false,
      });
    });

    // ─── SEND MESSAGE ────────────────────────────────────────────────────────
    socket.on('send-message', async ({ roomId, message }) => {
      if (!message?.trim()) return;

      const chat = await Chat.create({
        roomId,
        sender: {
          userId: socket.user.id,
          username: socket.user.username,
          avatar: socket.user.avatar,
        },
        message: message.trim(),
        type: 'text',
      });

      io.to(roomId).emit('receive-message', {
        _id: chat._id,
        sender: chat.sender,
        message: chat.message,
        type: chat.type,
        createdAt: chat.createdAt,
      });
    });

    // ─── TYPING ──────────────────────────────────────────────────────────────
    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('user-typing', {
        username: socket.user.username,
        isTyping,
      });
    });

    // ─── REQUEST SYNC (late joiner / reconnect) ───────────────────────────────
    socket.on('request-sync', async ({ roomId }) => {
      const room = await Room.findOne({ roomId, isActive: true });
      if (!room) return;

      const isLocalFile = room.movieUrl?.startsWith('local-file://');

      socket.emit('sync-state', {
        isPlaying: room.isPlaying,
        currentTime: room.currentTime,
        playbackSpeed: room.playbackSpeed,
        movieUrl: room.movieUrl,
        movieTitle: room.movieTitle,
        isLocalFile,
        // If local file mode, tell the late joiner the filename so they can load it
        localFileName: isLocalFile ? room.movieUrl.replace('local-file://', '') : undefined,
      });
    });

    // ─── HOST: REMOVE USER ───────────────────────────────────────────────────
    socket.on('remove-user', async ({ roomId, targetSocketId }) => {
      const room = await Room.findOne({ roomId, isActive: true });
      if (!room || room.host.toString() !== socket.user.id) return;

      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit('room-ended', { reason: 'You have been removed by the host' });
        targetSocket.leave(roomId);
      }

      room.members = room.members.filter((m) => m.socketId !== targetSocketId);
      await room.save();

      io.to(roomId).emit('user-left', {
        socketId: targetSocketId,
        members: room.members,
      });
    });

    // ─── HOST: TRANSFER HOST ─────────────────────────────────────────────────
    socket.on('transfer-host', async ({ roomId, newHostUserId }) => {
      const room = await Room.findOne({ roomId, isActive: true });
      if (!room || room.host.toString() !== socket.user.id) return;

      room.host = newHostUserId;
      await room.save();

      io.to(roomId).emit('host-changed', { newHostId: newHostUserId });
    });

    // ─── HOST: LOCK / UNLOCK ROOM ─────────────────────────────────────────────
    socket.on('toggle-lock', async ({ roomId, isLocked }) => {
      const room = await Room.findOne({ roomId, isActive: true });
      if (!room || room.host.toString() !== socket.user.id) return;

      room.isLocked = isLocked;
      await room.save();

      io.to(roomId).emit('room-locked', { isLocked });
    });

    // ─── HOST: END SESSION ────────────────────────────────────────────────────
    socket.on('end-session', async ({ roomId }) => {
      const room = await Room.findOne({ roomId, isActive: true });
      if (!room || room.host.toString() !== socket.user.id) return;

      room.isActive = false;
      await room.save();

      io.to(roomId).emit('room-ended', { reason: 'Host ended the session' });

      // Remove all sockets from the room
      const sockets = roomSockets.get(roomId);
      if (sockets) {
        for (const sid of sockets) {
          const s = io.sockets.sockets.get(sid);
          if (s) s.leave(roomId);
          connectedUsers.delete(sid);
        }
        roomSockets.delete(roomId);
      }
    });

    // ─── DISCONNECT ──────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`[Socket] Disconnected: ${socket.id} (${socket.user.username})`);
      const userData = connectedUsers.get(socket.id);
      if (userData?.roomId) {
        await _leaveRoom(socket, userData.roomId, io, true);
      }
      connectedUsers.delete(socket.id);
    });
  });
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function _joinRoom(socket, room, io, callback) {
  const roomId = room.roomId;

  // Leave any existing room first
  const existing = connectedUsers.get(socket.id);
  if (existing?.roomId && existing.roomId !== roomId) {
    await _leaveRoom(socket, existing.roomId, io, false);
  }

  socket.join(roomId);

  // Track in memory
  connectedUsers.set(socket.id, {
    userId: socket.user.id,
    username: socket.user.username,
    avatar: socket.user.avatar,
    roomId,
  });

  if (!roomSockets.has(roomId)) roomSockets.set(roomId, new Set());
  roomSockets.get(roomId).add(socket.id);

  // Update DB members list (upsert)
  await Room.updateOne(
    { roomId, 'members.userId': { $ne: socket.user.id } },
    {
      $push: {
        members: {
          userId: socket.user.id,
          username: socket.user.username,
          avatar: socket.user.avatar,
          socketId: socket.id,
        },
      },
    }
  );
  // Always update socketId in case of reconnect
  await Room.updateOne(
    { roomId, 'members.userId': socket.user.id },
    { $set: { 'members.$.socketId': socket.id } }
  );

  const updatedRoom = await Room.findOne({ roomId }).populate('host', 'username avatar _id');

  // Notify others
  socket.to(roomId).emit('user-joined', {
    userId: socket.user.id,
    username: socket.user.username,
    avatar: socket.user.avatar,
    socketId: socket.id,
    members: updatedRoom.members,
  });

  // Save to watch history
  await User.updateOne(
    { _id: socket.user.id },
    {
      $push: {
        watchHistory: {
          $each: [{ roomId, roomName: room.roomName, movieUrl: room.movieUrl }],
          $slice: -50,
        },
      },
    }
  );

  // Send current room state to the joiner
  socket.emit('sync-state', {
    isPlaying: updatedRoom.isPlaying,
    currentTime: updatedRoom.currentTime,
    playbackSpeed: updatedRoom.playbackSpeed,
    movieUrl: updatedRoom.movieUrl,
    movieTitle: updatedRoom.movieTitle,
    members: updatedRoom.members,
    host: updatedRoom.host,
    isLocked: updatedRoom.isLocked,
  });

  // System message
  const sysMsg = await Chat.create({
    roomId,
    sender: { username: 'System' },
    message: `${socket.user.username} joined the room`,
    type: 'system',
  });
  io.to(roomId).emit('receive-message', sysMsg);

  callback?.({ success: true, room: updatedRoom });
}

async function _leaveRoom(socket, roomId, io, isDisconnect = false) {
  socket.leave(roomId);

  connectedUsers.delete(socket.id);
  if (roomSockets.has(roomId)) {
    roomSockets.get(roomId).delete(socket.id);
    if (roomSockets.get(roomId).size === 0) roomSockets.delete(roomId);
  }

  await Room.updateOne({ roomId }, { $pull: { members: { socketId: socket.id } } });

  const updatedRoom = await Room.findOne({ roomId });

  io.to(roomId).emit('user-left', {
    socketId: socket.id,
    username: socket.user.username,
    members: updatedRoom?.members || [],
  });

  // System message
  if (!isDisconnect || updatedRoom?.isActive) {
    const sysMsg = await Chat.create({
      roomId,
      sender: { username: 'System' },
      message: `${socket.user.username} left the room`,
      type: 'system',
    });
    io.to(roomId).emit('receive-message', sysMsg);
  }
}

module.exports = socketHandler;
