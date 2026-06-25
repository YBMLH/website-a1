import axios from 'axios';

// Same-origin in production; Vite proxy forwards /api to the backend in dev.
const api = axios.create({ baseURL: '/api', withCredentials: true });

// ---- Access token management (in-memory + localStorage for reloads) -------
let accessToken = localStorage.getItem('accessToken') || null;
export function setAccessToken(token) {
  accessToken = token;
  if (token) localStorage.setItem('accessToken', token);
  else localStorage.removeItem('accessToken');
}
export function getAccessToken() {
  return accessToken;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// ---- Auto-refresh on 401 (single-flight) ----------------------------------
let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes('/auth/');

    if (status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh');
        const { data } = await refreshing;
        refreshing = null;
        setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        setAccessToken(null);
        // Bubble up so the auth context can redirect to login.
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// Helper to extract a friendly error message.
export function errMsg(e, fallback = 'Something went wrong') {
  return e?.response?.data?.error || e?.message || fallback;
}

export default api;
