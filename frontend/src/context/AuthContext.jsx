import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useLanguage } from './LanguageContext';
import { DEMO_PERSONAS } from '../utils/personas';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { setLanguage } = useLanguage();

  const [user, setUser] = useState(() => {
    try {
      // Prioritize tab-isolated sessionStorage so Doctor tab and Patient tab don't clobber each other
      const sessionSaved = sessionStorage.getItem('sehat_user');
      if (sessionSaved && sessionSaved !== 'undefined' && sessionSaved !== 'null') {
        const parsed = JSON.parse(sessionSaved);
        if (parsed && typeof parsed === 'object' && parsed.role) {
          return parsed;
        }
      }
      const saved = localStorage.getItem('sehat_user');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.role) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Could not parse saved user from storage:", e);
    }
    return null; // Start unauthenticated so user selects their portal
  });

  const [currentPortal, setCurrentPortal] = useState(() => {
    return user ? 'authenticated' : 'portal_gateway';
  });

  const [token, setToken] = useState(() => {
    try {
      return sessionStorage.getItem('sehat_token') || localStorage.getItem('sehat_token') || 'demo-token';
    } catch (e) {
      return 'demo-token';
    }
  });

  // Login with credentials
  const login = async (username, password, role) => {
    try {
      const res = await api.login({ username, password, role });
      setUser(res.user);
      setToken(res.access_token);
      setCurrentPortal('authenticated');
      try {
        sessionStorage.setItem('sehat_user', JSON.stringify(res.user));
        sessionStorage.setItem('sehat_token', res.access_token);
        localStorage.setItem('sehat_user', JSON.stringify(res.user));
        localStorage.setItem('sehat_token', res.access_token);
      } catch (e) {}
      if (res.user.preferred_language) {
        setLanguage(res.user.preferred_language);
      }
      return res.user;
    } catch (err) {
      console.warn("API Login failed, using local profile fallback:", err);
      const match = DEMO_PERSONAS.find(p => p.username === username) || 
                    DEMO_PERSONAS.find(p => p.role === role) || 
                    DEMO_PERSONAS[0];
      return loginProfile(match);
    }
  };

  // Direct login for a selected profile within its category
  const loginProfile = (profile) => {
    if (!profile) return;
    setUser(profile);
    setCurrentPortal('authenticated');
    try {
      sessionStorage.setItem('sehat_user', JSON.stringify(profile));
      localStorage.setItem('sehat_user', JSON.stringify(profile));
    } catch (e) {}
    if (profile.lang) {
      setLanguage(profile.lang);
    }
    return profile;
  };

  // Safe Logout: Clears all session data and redirects to Portal Gateway
  const logout = () => {
    setUser(null);
    setCurrentPortal('portal_gateway');
    try {
      sessionStorage.removeItem('sehat_user');
      sessionStorage.removeItem('sehat_token');
      localStorage.removeItem('sehat_user');
      localStorage.removeItem('sehat_token');
    } catch (e) {}
  };

  const currentRole = user?.role || null;

  return (
    <AuthContext.Provider value={{
      user,
      role: currentRole,
      token,
      currentPortal,
      setCurrentPortal,
      personas: DEMO_PERSONAS,
      login,
      loginProfile,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
