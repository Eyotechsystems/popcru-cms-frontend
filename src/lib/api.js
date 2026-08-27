// Points at the deployed Render API by default; override with
// VITE_API_URL for local development (see .env.example).
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

const TOKEN_KEY = 'popcru_cms_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// Core request helper. Attaches the JWT if present, and throws a
// typed ApiError on any non-2xx response so callers can branch on
// `.status` (e.g. 401 → force logout) without re-parsing JSON.
async function request(path, { method = 'GET', body, isFormData = false } = {}) {
  const token = getToken();
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
  }

  if (!res.ok) {
    // A 401 means the token is missing/expired — the caller (AuthContext)
    // is responsible for clearing it and redirecting to /login.
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

export const api = {
  get:  (path) => request(path),
  post: (path, body, opts = {}) => request(path, { method: 'POST', body, ...opts }),
  put:  (path, body) => request(path, { method: 'PUT', body }),
  del:  (path) => request(path, { method: 'DELETE' }),
};

export { ApiError };
