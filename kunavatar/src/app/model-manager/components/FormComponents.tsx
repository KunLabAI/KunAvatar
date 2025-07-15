'use client';

import { AlertCircle } from 'lucide-react';

// 统一的表单输入组件
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
      <div className="flex items-center gap-2 text-sm text-theme-error">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    )}
    {hint && !error && (
      <p className="text-xs text-theme-foreground-muted">{hint}</p>
    )}
  </div>
);

// 统一的表单区域组件
export const FormSection = ({ 
  title, 
  children 
}: { 
  title: string; 
  children: React.ReactNode;
}) => (
  <div className="space-y-6">
    <h3 className="section-title !text-theme-foreground-muted">{title}</h3>
    {children}
  </div>
);

// 统一的输入框样式
export const TextInput = ({ 
  value, 
  onChange, 
  placeholder, 
  error,
  className = '',
  ...props 
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: boolean;
  className?: string;
  [key: string]: any;
}) => (
  <input
    type="text"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`form-input-base ${
      error ? 'error' : ''
    } ${className}`}
    {...props}
  />
);

// 统一的文本域样式
export const TextArea = ({ 
  value, 
  onChange, 
  placeholder, 
  rows = 4,
  error,
  className = '',
  ...props 
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  error?: boolean;
  className?: string;
  [key: string]: any;
}) => (
  <textarea
    value={value}
    onChange={onChange}
    rows={rows}
    placeholder={placeholder}
    className={`form-input-base resize-none ${
      error ? 'error' : ''
    } ${className}`}
    {...props}
  />
);

// 统一的选择框样式
export const Select = ({ 
  value, 
  onChange, 
  children,
  error,
  className = '',
  ...props 
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  error?: boolean;
  className?: string;
  [key: string]: any;
}) => (
  <select
    value={value}
    onChange={onChange}
    className={`form-input-base ${
      error ? 'error' : ''
    } ${className}`}
    {...props}
  >
    {children}
  </select>
);

// 统一的按钮样式
export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  ...props 
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  [key: string]: any;
}) => {
  const variantClasses = {
    primary: "btn-base btn-primary",
    secondary: "btn-base btn-secondary",
    outline: "btn-base text-theme-primary bg-transparent border border-theme-primary hover:bg-theme-primary hover:text-white",
    ghost: "btn-base text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-background-secondary border-0"
  };
  
  const sizeClasses = {
    sm: "px-3 py-2",
    md: "px-6 py-3", 
    lg: "px-8 py-4"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// 统一的表单底部操作栏
export const FormActions = ({ 
  children,
  showRequiredNote = true 
}: { 
  children: React.ReactNode;
  showRequiredNote?: boolean;
}) => (
  <div className="p-8 pt-6 border-t border-theme-border">
    <div className="flex items-center justify-between">
      {showRequiredNote && (
        <div className="text-sm text-theme-foreground-muted">
          <span className="text-theme-error">*</span> 必填字段
        </div>
      )}
      <div className="flex gap-3 ml-auto">
        {children}
      </div>
    </div>
  </div>
);

// New MultiSelectCheckbox Component
interface MultiSelectCheckboxProps {
  options: { id: number; name: string }[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
  disabled?: boolean;
  keyPrefix?: string;
}

export function MultiSelectCheckbox({ options, selectedIds, onChange, disabled = false, keyPrefix = 'item' }: MultiSelectCheckboxProps) {
  const handleCheckboxChange = (id: number) => {
    const newSelectedIds = selectedIds.includes(id)
      ? selectedIds.filter(selectedId => selectedId !== id)
      : [...selectedIds, id];
    onChange(newSelectedIds);
  };

  return (
    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
      {options.map(option => (
        <label
          key={`${keyPrefix}-${option.id}`}
          className={`flex items-center gap-2 p-2 rounded-md border border-theme-border cursor-pointer transition-colors
            ${selectedIds.includes(option.id) ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-theme-card-hover'}
            ${disabled && !selectedIds.includes(option.id) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(option.id)}
            onChange={() => handleCheckboxChange(option.id)}
            disabled={disabled && !selectedIds.includes(option.id)}
            className="form-checkbox h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
          />
                          <span className="text-sm text-theme-foreground truncate" title={option.name}>
                  {option.name}
                </span>
        </label>
      ))}
    </div>
  );
} 