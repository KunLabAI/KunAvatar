'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CleanModeContextType {
  isCleanMode: boolean;
  toggleCleanMode: () => void;
  setCleanMode: (enabled: boolean) => void;
}

const CleanModeContext = createContext<CleanModeContextType | undefined>(undefined);

interface CleanModeProviderProps {
  children: ReactNode;
}

export function CleanModeProvider({ children }: CleanModeProviderProps) {
  const [isCleanMode, setIsCleanMode] = useState(false);

  // 从localStorage加载无边框模式状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('clean-mode-enabled');
      if (saved !== null) {
        const enabled = saved === 'true';
        setIsCleanMode(enabled);
        updateDocumentCleanMode(enabled);
      }
    }
  }, []);

  // 更新文档的data属性来控制CSS样式
  const updateDocumentCleanMode = (enabled: boolean) => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute(
        'data-clean-mode', 
        enabled ? 'enabled' : 'disabled'
      );
    }
  };

  const setCleanMode = (enabled: boolean) => {
    setIsCleanMode(enabled);
    updateDocumentCleanMode(enabled);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('clean-mode-enabled', enabled.toString());
    }
  };

  const toggleCleanMode = () => {
    setCleanMode(!isCleanMode);
  };

  const value: CleanModeContextType = {
    isCleanMode,
    toggleCleanMode,
    setCleanMode,
  };

  return (
    <CleanModeContext.Provider value={value}>
      {children}
    </CleanModeContext.Provider>
  );
}

export function useCleanMode() {
  const context = useContext(CleanModeContext);
  if (context === undefined) {
    throw new Error('useCleanMode must be used within a CleanModeProvider');
  }
  return context;
}