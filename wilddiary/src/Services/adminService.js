import { apiRequest } from './api';

export const adminService = {
  overview: () => apiRequest('/admin/overview'),
  users: (query = '') => apiRequest(`/admin/users${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  reports: () => apiRequest('/admin/reports'),
  auditLog: () => apiRequest('/admin/audit-log'),
  flagUser: (id, flagged, reason = '') => apiRequest(`/admin/users/${id}/flag`, {
    method: 'PATCH', body: JSON.stringify({ flagged, reason }),
  }),
  setUserStatus: (id, isActive) => apiRequest(`/admin/users/${id}/status`, {
    method: 'PATCH', body: JSON.stringify({ is_active: isActive }),
  }),
  resetPassword: (id, newPassword) => apiRequest(`/admin/users/${id}/password`, {
    method: 'POST', body: JSON.stringify({ new_password: newPassword }),
  }),
  deleteUser: (id) => apiRequest(`/admin/users/${id}`, { method: 'DELETE' }),
  clearContent: (confirmation) => apiRequest('/admin/clear-content', {
    method: 'POST', body: JSON.stringify({ confirmation }),
  }),
};
