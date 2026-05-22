import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, apiUtils } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours
const WARNING_TIME    =    10 * 60 * 1000;   // warn 10 min before
const CHECK_INTERVAL  =        60 * 1000;    // check every minute

export const AuthProvider = ({ children }) => {
  const [user,               setUser]               = useState(null);
  const [isAuthenticated,    setIsAuthenticated]    = useState(false);
  const [isLoading,          setIsLoading]          = useState(true);
  const [error,              setError]              = useState(null);
  const [lastActivity,       setLastActivity]       = useState(Date.now());
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  useEffect(() => { checkAuthStatus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session activity tracking ──────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    const storedActivity = localStorage.getItem('lastActivity');
    if (storedActivity) setLastActivity(parseInt(storedActivity));

    const updateActivity = () => {
      const now = Date.now();
      setLastActivity(now);
      localStorage.setItem('lastActivity', String(now));
      setShowSessionWarning(false);
    };

    const checkSession = () => {
      const elapsed = Date.now() - lastActivity;
      if (elapsed >= SESSION_TIMEOUT) {
        handleSessionExpired();
      } else if (elapsed >= SESSION_TIMEOUT - WARNING_TIME && !showSessionWarning) {
        setShowSessionWarning(true);
      }
    };

    const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(e => document.addEventListener(e, updateActivity, { passive: true }));
    const interval = setInterval(checkSession, CHECK_INTERVAL);
    checkSession();

    return () => {
      events.forEach(e => document.removeEventListener(e, updateActivity));
      clearInterval(interval);
    };
  }, [isAuthenticated, lastActivity, showSessionWarning]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session expired ────────────────────────────────────────────
  const handleSessionExpired = useCallback(() => {
    setShowSessionWarning(false);
    apiUtils.clearAuthData();
    setUser(null);
    setIsAuthenticated(false);
    setLastActivity(0);
    alert('Your session has expired due to inactivity. Please log in again.');
    window.location.href = '/';
  }, []);

  const extendSession = useCallback(() => {
    const now = Date.now();
    setLastActivity(now);
    localStorage.setItem('lastActivity', String(now));
    setShowSessionWarning(false);
  }, []);

  // ── Check auth on app load ─────────────────────────────────────
  const checkAuthStatus = async () => {
    try {
      const token        = apiUtils.getAuthToken();
      const userData     = apiUtils.getCurrentUser();
      const lastActivity = localStorage.getItem('lastActivity');

      if (token && userData) {
        // Check session timeout
        if (lastActivity) {
          const elapsed = Date.now() - parseInt(lastActivity);
          if (elapsed >= SESSION_TIMEOUT) {
            apiUtils.clearAuthData();
            setUser(null);
            setIsAuthenticated(false);
            return;
          }
        }

        // Optionally refresh token to validate (don't block login if it fails)
        try {
          await refreshToken();
        } catch (refreshErr) {
          if (refreshErr.response?.status === 401) {
            apiUtils.clearAuthData();
            setUser(null);
            setIsAuthenticated(false);
            return;
          }
        }

        setUser(userData);
        setIsAuthenticated(true);
        const now = Date.now();
        setLastActivity(now);
        localStorage.setItem('lastActivity', String(now));
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Login ──────────────────────────────────────────────────────
  const login = async (credentials) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authAPI.login(credentials);

      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        const now = Date.now();
        setLastActivity(now);
        localStorage.setItem('lastActivity', String(now));
        return { success: true, user: response.user };
      }

      throw new Error(response.message || 'Login failed');
    } catch (err) {
      const apiError = apiUtils.handleApiError(err);
      setError(apiError.message);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  };

  // ── Login with OTP ─────────────────────────────────────────────
  const loginWithOtp = async (credentials) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authAPI.verifyLoginOtp(credentials);

      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        const now = Date.now();
        setLastActivity(now);
        localStorage.setItem('lastActivity', String(now));
        return { success: true, user: response.user };
      }
      throw new Error(response.message || 'OTP verification failed');
    } catch (err) {
      const apiError = apiUtils.handleApiError(err);
      setError(apiError.message);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  };

  const requestLoginOtp = async (email) => {
    try {
      setError(null);
      return await authAPI.requestLoginOtp(email);
    } catch (err) {
      const apiError = apiUtils.handleApiError(err);
      setError(apiError.message);
      throw apiError;
    }
  };

  // ── Logout ─────────────────────────────────────────────────────
  const logout = async () => {
    try {
      setIsLoading(true);
      await authAPI.logout();
    } catch {
      // Always clear local state even if API call fails
    } finally {
      apiUtils.clearAuthData();
      localStorage.removeItem('lastActivity');
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      setIsLoading(false);
      setLastActivity(0);
      setShowSessionWarning(false);
      window.location.href = '/';
    }
  };

  // ── Refresh token ──────────────────────────────────────────────
  const refreshToken = async () => {
    try {
      const response = await authAPI.refreshToken();
      return response.success;
    } catch (err) {
      if (err.response?.status === 401) await logout();
      return false;
    }
  };

  // ── Update user data ───────────────────────────────────────────
  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
    const current = apiUtils.getCurrentUser();
    if (current) {
      localStorage.setItem('userData', JSON.stringify({ ...current, ...userData }));
    }
  };

  const clearError   = () => setError(null);
  const hasRole      = (role)  => user?.role === role;
  const hasAnyRole   = (roles) => roles.includes(user?.role);

  const getUserDisplayName = () => {
    if (!user) return '';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.email || 'User';
  };

  const value = {
    user, isAuthenticated, isLoading, error, showSessionWarning, lastActivity,
    login, loginWithOtp, requestLoginOtp, logout, refreshToken,
    updateUser, getUserDisplayName,
    extendSession, handleSessionExpired,
    checkAuthStatus, clearError, hasRole, hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ── HOC for protected routes ───────────────────────────────────
export const withAuth = (WrappedComponent) => {
  const AuthenticatedComponent = (props) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
          <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 16, color: '#64748b', fontSize: 16, fontWeight: 500 }}>Loading…</p>
        </div>
      );
    }

    if (!isAuthenticated) {
      window.location.href = '/';
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  AuthenticatedComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`;
  return AuthenticatedComponent;
};