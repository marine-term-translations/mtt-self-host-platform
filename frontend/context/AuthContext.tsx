import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '../types';
import { backendApi } from '../services/api';
import { CONFIG } from '../config';

interface AuthContextType {
  user: User | null;
  login: () => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkBanStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const checkBanStatus = async () => {
    try {
      // Force a non-cached check of user status
      const apiUrl = `${CONFIG.API_URL}/me`;
      const response = await fetch(apiUrl, { 
        credentials: 'include',
        cache: 'no-store', // Prevent caching
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Check if user is banned
        if (data.is_banned) {
          // Clear user state
          setUser(null);
          
          // Redirect to banned page with reason
          const params = new URLSearchParams({
            reason: data.ban_reason || 'No reason provided',
            ...(data.banned_at && { banned_at: data.banned_at })
          });
          navigate(`/banned?${params.toString()}`, { replace: true });
        }
      }
    } catch (e) {
      console.error("Failed to check ban status", e);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if user is authenticated via session
        const apiUrl = `${CONFIG.API_URL}/me`;
        const response = await fetch(apiUrl, { 
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (!data.error) {
            // Check if user is banned
            if (data.is_banned) {
              const params = new URLSearchParams({
                reason: data.ban_reason || 'No reason provided',
                ...(data.banned_at && { banned_at: data.banned_at })
              });
              navigate(`/banned?${params.toString()}`, { replace: true });
              setIsLoading(false);
              return;
            }
            
            // Map ORCID user to our User type
            const userData: User = {
              id: data.id || data.user_id, // Use id or user_id from backend
              user_id: data.id || data.user_id, // Alias for consistency
              username: data.username || data.orcid, // Prefer username, fallback to orcid
              name: data.name || data.orcid,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || data.orcid)}&background=0ea5e9&color=fff`,
              token: data.access_token, // For compatibility with existing code
              isAdmin: data.is_admin || false, // Use is_admin from backend session
              isSuperAdmin: data.is_superadmin || false, // Use is_superadmin from backend session
              orcid: data.orcid, // Keep ORCID for reference
              reputation: data.reputation // Include reputation if available
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

  // Check ban status on every route change (page visit)
  useEffect(() => {
    if (user && location.pathname !== '/banned') {
      checkBanStatus();
    }
  }, [location.pathname]);

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
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading, checkBanStatus }}>
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