const { v4: uuidv4 } = require('uuid');

/**
 * Generates a short, user-friendly room ID (8 uppercase alphanumeric chars)
 */
const generateRoomId = () => {
  return uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
};

module.exports = generateRoomId;
