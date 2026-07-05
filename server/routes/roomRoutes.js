const express = require('express');
const router = express.Router();
const {
  createRoom,
  getRooms,
  getRoom,
  updateRoom,
  endRoom,
  uploadMovie,
  getChatHistory,
  getWatchHistory,
} = require('../controllers/roomController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/history/me', protect, getWatchHistory);

router.route('/').get(protect, getRooms).post(protect, createRoom);

router
  .route('/:roomId')
  .get(protect, getRoom)
  .put(protect, updateRoom)
  .delete(protect, endRoom);

router.post('/:roomId/upload', protect, upload.single('video'), uploadMovie);
router.get('/:roomId/chat', protect, getChatHistory);

module.exports = router;
