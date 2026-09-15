export const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;
  if (!response.ok) {
    const error = new Error(data?.message || `Request failed (${response.status}).`);
    error.status = response.status;
    error.code = data?.code;
    throw error;
  }
  return data;
}
