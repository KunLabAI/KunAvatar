import React from 'react';

// 表单区域组件
export const FormSection = ({ 
  title, 
  children, 
  titleAction 
}: { 
  title: string; 
  children: React.ReactNode;
  titleAction?: React.ReactNode;
}) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h3 className="section-title !text-theme-foreground-muted">{title}</h3>
      {titleAction && <div className="flex items-center gap-2">{titleAction}</div>}
    </div>
    {children}
  </div>
);

// 表单输入组件
export const FormInput = ({ 
  label, 
  required = false, 
  error,
  hint,
  children
}: { 
  label: string; 
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-theme-foreground block">
      {label}
      {required && <span className="text-theme-error ml-1">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-sm text-theme-error">{error}</p>
    )}
    {hint && !error && (
      <p className="text-xs text-theme-foreground-muted">{hint}</p>
    )}
  </div>
);