import { apiRequest } from './api';

export const discoveryService = {
  counselors: () => apiRequest('/counselors'),
  notifications: () => apiRequest('/notifications'),
  markNotificationsRead: () => apiRequest('/notifications/read', { method: 'POST' }),
  userPosts: () => apiRequest('/users/me/posts'),
  exportData: () => apiRequest('/users/me/export'),
  getPreferences: () => apiRequest('/users/me/preferences'),
  updatePreferences: (prefs) => apiRequest('/users/me/preferences', { method: 'PATCH', body: JSON.stringify(prefs) }),
};
