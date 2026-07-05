import { io } from 'socket.io-client';

let socket = null;

// In production, connect to the deployed server URL
// In development, connect to localhost:5000
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

export const initSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io(SERVER_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
