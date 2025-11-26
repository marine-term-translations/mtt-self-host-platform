import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { backendApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedUserStr = localStorage.getItem('marineterm_user');
      if (storedUserStr) {
        try {
          const storedUser = JSON.parse(storedUserStr);
          // Optimistically set user
          setUser(storedUser);

          // Verify admin status in background to keep UI snappy but secure
          try {
            const adminRes = await backendApi.post<{ isAdmin: boolean }>('/check-admin', { token: storedUser.token });
            
            // If admin status has changed or wasn't present, update it
            if (storedUser.isAdmin !== adminRes.isAdmin) {
              const updatedUser = { ...storedUser, isAdmin: adminRes.isAdmin };
              setUser(updatedUser);
              localStorage.setItem('marineterm_user', JSON.stringify(updatedUser));
            }
          } catch (err) {
            console.error("Admin check failed on restore", err);
            // Optional: if token is invalid, logout? For now, we keep session until explicit failure
          }
        } catch (e) {
          console.error("Failed to parse user", e);
          localStorage.removeItem('marineterm_user');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      // 1. Call backend API to authenticate with Gitea
      const response = await backendApi.post<{ 
        token: string; 
        user: { id: number; username: string; full_name?: string; avatar_url?: string } 
      }>('/login-gitea', { username, password });

      const { token, user: apiUser } = response;

      // 2. Check if user is an admin
      let isAdmin = false;
      try {
        const adminRes = await backendApi.post<{ isAdmin: boolean }>('/check-admin', { token });
        isAdmin = adminRes.isAdmin;
      } catch (e) {
        console.warn("Failed to verify admin status during login", e);
      }

      // 3. Construct user object
      const userData: User = {
        username: apiUser.username,
        name: apiUser.full_name || apiUser.username,
        avatar: apiUser.avatar_url || `https://ui-avatars.com/api/?name=${apiUser.username}&background=0ea5e9&color=fff`,
        token: token,
        isAdmin: isAdmin
      };

      // 4. Persist user session
      localStorage.setItem('marineterm_user', JSON.stringify(userData));
      setUser(userData);
      
      console.log('Login successful');
    } catch (error) {
      console.error("Login failed:", error);
      throw error; // Re-throw to be handled by the UI
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('marineterm_user');
    setUser(null);
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