import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({
  searchQuery,
  onSearchChange,
  placeholder = "搜索..."
}: SearchBarProps) {
  const handleClear = () => {
    onSearchChange('');
  };

  return (
    <div className="relative w-full h-full">
      <Search 
        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
        style={{ color: 'var(--color-foreground-muted)' }}
      />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="w-full focus:outline-none transition-all duration-200"
        style={{
          paddingLeft: 'calc(var(--spacing-lg) + var(--spacing-md))',
          paddingRight: 'calc(var(--spacing-lg) + var(--spacing-md))',
          paddingTop: 'var(--spacing-xs)',
          paddingBottom: 'var(--spacing-xs)',
          border: `1px solid var(--color-border)`,
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--color-background)',
          color: 'var(--color-foreground)',
          fontSize: 'var(--font-size-sm)',
          height: 'var(--spacing-2xl)'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--color-primary)';
          e.target.style.boxShadow = `0 0 0 2px rgba(var(--color-primary-rgb), 0.1)`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--color-border)';
          e.target.style.boxShadow = 'none';
        }}
      />
      {searchQuery && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors"
          style={{
            padding: 'var(--spacing-xs)',
            color: 'var(--color-foreground-muted)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-foreground)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-foreground-muted)';
          }}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
} 