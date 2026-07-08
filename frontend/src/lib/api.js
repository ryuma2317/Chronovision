import axios from 'axios';

const TOKEN_KEY = 'chronovision_access_token';
const REFRESH_KEY = 'chronovision_refresh_token';

export const tokenStore = {
  getAccess: () => localStorage.getItem(TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (accessToken, refreshToken) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  setAccess: (accessToken) => localStorage.setItem(TOKEN_KEY, accessToken),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue = [];

const resolveQueue = (newToken) => {
  pendingQueue.forEach(({ resolve }) => resolve(newToken));
  pendingQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (!response || response.status !== 401 || config._retried || config.url === '/auth/refresh' || config.url === '/auth/login') {
      return Promise.reject(error);
    }

    const refreshToken = tokenStore.getRefresh();
    if (!refreshToken) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent('auth:logout'));
      return Promise.reject(error);
    }

    config._retried = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((newToken) => {
        config.headers.Authorization = `Bearer ${newToken}`;
        return api(config);
      });
    }

    isRefreshing = true;
    try {
      const { data } = await axios.post('/api/auth/refresh', { refreshToken });
      tokenStore.setAccess(data.accessToken);
      resolveQueue(data.accessToken);
      config.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(config);
    } catch (refreshErr) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent('auth:logout'));
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

// Pulls a friendly message out of our backend's error shape ({ message })
export const apiErrorMessage = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message || fallback;

export default api;
