import api from './api';

export const createRoom = async (payload) => {
  const { data } = await api.post('/rooms', payload);
  return data.data;
};

export const getRooms = async () => {
  const { data } = await api.get('/rooms');
  return data.data;
};

export const getRoom = async (roomId, password = '') => {
  const { data } = await api.get(`/rooms/${roomId}`, { params: password ? { password } : {} });
  return data.data;
};

export const updateRoom = async (roomId, payload) => {
  const { data } = await api.put(`/rooms/${roomId}`, payload);
  return data.data;
};

export const endRoom = async (roomId) => {
  const { data } = await api.delete(`/rooms/${roomId}`);
  return data;
};

export const uploadMovie = async (roomId, file, title, onProgress) => {
  const formData = new FormData();
  formData.append('video', file);
  if (title) formData.append('title', title);

  const { data } = await api.post(`/rooms/${roomId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      const percent = Math.round((e.loaded * 100) / e.total);
      onProgress?.(percent);
    },
  });
  return data.data;
};

export const getChatHistory = async (roomId) => {
  const { data } = await api.get(`/rooms/${roomId}/chat`);
  return data.data;
};

export const getWatchHistory = async () => {
  const { data } = await api.get('/rooms/history/me');
  return data.data;
};
