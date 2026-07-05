import axios from 'axios';

// In production use the deployed server URL, in dev use Vite proxy
const BASE_URL = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('moviesync_user') || 'null');
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('moviesync_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
