import axios from 'axios';
import { getToken, clearAuth } from '@/lib/storage';
import { API_BASE_URL } from '@/lib/config';

const API = axios.create({ baseURL: API_BASE_URL });

// Injected by the store layer later to avoid an axios -> store import cycle.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

API.interceptors.request.use(async (req) => {
  const token = await getToken();
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await clearAuth();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export default API;
