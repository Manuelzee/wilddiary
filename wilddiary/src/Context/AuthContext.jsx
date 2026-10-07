import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../Services/api';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const saveSession = useCallback((data) => {
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadUser() {
      if (!token) {
        if (active) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await apiRequest('/auth/me');
        if (active) setUser(data.user);
      } catch (error) {
        if (active && error.status === 401) clearSession();
      } finally {
        if (active) setLoading(false);
      }
    }
    loadUser();
    return () => { active = false; };
  }, [token, clearSession]);

  const login = async (email, password) => {
    try {
      const data = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      saveSession(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message, status: error.status, code: error.code };
    }
  };

  const register = async (username, email, password) => {
    try {
      const data = await apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) });
      saveSession(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message, status: error.status, code: error.code };
    }
  };

  const updateProfile = async (values) => {
    try {
      const data = await apiRequest('/users/me', { method: 'PATCH', body: JSON.stringify(values) });
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (error) { return { success: false, error: error.message }; }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await apiRequest('/users/me/password', { method: 'POST', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) });
      clearSession();
      return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
  };

  const deactivateAccount = async () => {
    try {
      await apiRequest('/users/me', { method: 'DELETE' });
      clearSession();
      return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
  };

  const forgotPassword = async (email) => {
    try {
      const data = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      return { success: true, message: data.message, dev_otp: data.dev_otp };
    } catch (error) {
      return { success: false, error: error.message, status: error.status, code: error.code };
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      const data = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      });
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, error: error.message, status: error.status, code: error.code };
    }
  };

  const value = {
    user, token, loading, login, register, logout: clearSession,
    updateProfile, changePassword, deactivateAccount,
    forgotPassword, resetPassword,
    isAuthenticated: Boolean(user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
