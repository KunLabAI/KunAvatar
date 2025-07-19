'use client';

import React, { createContext, useContext } from 'react';
import { useAuthState } from '@/hooks/useAuth';

interface User {
  id: string;
  username: string;
  email: string;
  roles: Array<{
    id: number;
    name: string;
    display_name: string;
  }>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (token: string) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  initialized: boolean; // 新增：标记是否已初始化
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const authState = useAuthState();

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}