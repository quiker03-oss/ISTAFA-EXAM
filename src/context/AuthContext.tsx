import React, { createContext, useContext, useState, useEffect } from 'react';
import { School, UserAccount } from '../types';

interface AuthContextType {
  user: UserAccount | null;
  school: School | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginSchoolAdmin: (credentials: { username: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  loginSuperAdmin: (credentials: { username: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateSchoolProfile: (school: School) => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('istafa_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setSchool(data.school || null);
      } else {
        localStorage.removeItem('istafa_auth_token');
        setToken(null);
        setUser(null);
        setSchool(null);
      }
    } catch (err) {
      console.error('Failed to verify token:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const loginSchoolAdmin = async (credentials: { username: string; password: string }) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login gagal.' };
      }

      localStorage.setItem('istafa_auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setSchool(data.school);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Koneksi ke server gagal.' };
    }
  };

  const loginSuperAdmin = async (credentials: { username: string; password: string }) => {
    try {
      const res = await fetch('/api/auth/super-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login Super Admin gagal.' };
      }

      localStorage.setItem('istafa_auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setSchool(null);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Koneksi ke server gagal.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('istafa_auth_token');
    setToken(null);
    setUser(null);
    setSchool(null);
  };

  const updateSchoolProfile = (updatedSchool: School) => {
    setSchool(updatedSchool);
  };

  const refreshUserData = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        school,
        token,
        isAuthenticated: !!user,
        isLoading,
        loginSchoolAdmin,
        loginSuperAdmin,
        logout,
        updateSchoolProfile,
        refreshUserData,
      }}
    >
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
