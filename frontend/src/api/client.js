import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const client = axios.create({ baseURL });

// Attach the stored JWT (if any) to every outgoing request.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('cs_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On a 401, the token is invalid/expired - clear it so the app returns to login.
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('cs_token');
      localStorage.removeItem('cs_user');
    }
    return Promise.reject(err);
  }
);

export default client;
