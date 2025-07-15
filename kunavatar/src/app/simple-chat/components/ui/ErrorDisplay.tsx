'use client';

import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
  onDismiss?: () => void;
  type?: 'error' | 'warning' | 'info';
}

export function ErrorDisplay({ 
  message, 
  onDismiss, 
  type = 'error' 
}: ErrorDisplayProps) {
  const bgColor = {
    error: 'bg-red-50 dark:bg-red-900/10',
    warning: 'bg-yellow-50 dark:bg-yellow-900/10',
    info: 'bg-blue-50 dark:bg-blue-900/10'
  }[type];

  const borderColor = {
    error: 'border-red-200 dark:border-red-800',
    warning: 'border-yellow-200 dark:border-yellow-800',
    info: 'border-blue-200 dark:border-blue-800'
  }[type];

  const textColor = {
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400'
  }[type];

  const iconColor = {
    error: 'text-red-500 dark:text-red-400',
    warning: 'text-yellow-500 dark:text-yellow-400',
    info: 'text-blue-500 dark:text-blue-400'
  }[type];

  return (
    <div className={`flex items-start gap-3 p-4 ${bgColor} border ${borderColor} rounded-lg`}>
      <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${textColor}`}>
          {message}
        </p>
      </div>
      
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors ${textColor}`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
} 