import { apiRequest } from './api';

export const diaryService = {
  list: () => apiRequest('/diary'),
  get: (id) => apiRequest(`/diary/${id}`),
  create: (entry) => apiRequest('/diary', { method: 'POST', body: JSON.stringify(entry) }),
  update: (id, entry) => apiRequest(`/diary/${id}`, { method: 'PATCH', body: JSON.stringify(entry) }),
  remove: (id) => apiRequest(`/diary/${id}`, { method: 'DELETE' }),
  insights: () => apiRequest('/insights'),
};
