import axios from 'axios';

const api = axios.create({
  baseURL: process.env.API_BASE_URL || '',
});

api.interceptors.request.use((config) => {
  const jwt = localStorage.getItem('jwt');
  if (jwt) {
    config.headers.Authorization = `Bearer ${jwt}`;
  }
  return config;
});

export default api;
