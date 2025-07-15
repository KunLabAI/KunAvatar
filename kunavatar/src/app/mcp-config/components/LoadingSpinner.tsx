import React from 'react';

export function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-theme-background-secondary flex items-center justify-center transition-colors duration-300">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-primary mx-auto mb-4"></div>
        <p className="text-theme-foreground-muted">加载中...</p>
      </div>
    </div>
  );
}