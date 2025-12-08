import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { backendApi } from '../services/api';
import { CONFIG } from '../config';

interface AuthContextType {
  user: User | null;
  login: () => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if user is authenticated via session
        const apiUrl = `${CONFIG.API_URL}/me`;
        const response = await fetch(apiUrl, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (!data.error) {
            // Map ORCID user to our User type
            const userData: User = {
              username: data.orcid,
              name: data.name || data.orcid,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || data.orcid)}&background=0ea5e9&color=fff`,
              token: data.access_token, // For compatibility with existing code
              isAdmin: data.is_admin || false // Use is_admin from backend session
            };
            setUser(userData);
          }
        }
      } catch (e) {
        console.error("Failed to check auth status", e);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = () => {
    // Redirect to ORCID OAuth flow using full backend URL
    const authUrl = `${CONFIG.API_URL}/auth/orcid`;
    window.location.href = authUrl;
  };

  const logout = async () => {
    try {
      const logoutUrl = `${CONFIG.API_URL}/logout`;
      await fetch(logoutUrl, { 
        method: 'POST', 
        credentials: 'include' 
      });
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};