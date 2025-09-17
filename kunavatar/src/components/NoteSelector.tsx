'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FileText } from 'lucide-react';

export interface Note {
  id: number;
  title: string;
  content: string;
}

interface NoteSelectorProps {
  notes: Note[];
  selectedNoteId: string;
  onNoteChange: (noteId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function NoteSelector({
  notes,
  selectedNoteId,
  onNoteChange,
  disabled = false,
  loading = false,
  className = '',
}: NoteSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedNote = notes.find(note => note.id.toString() === selectedNoteId);
  const displayText = loading ? '正在加载笔记...' : (selectedNote?.title || '选择笔记内容作为提示词...');

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => !disabled && !loading && setIsDropdownOpen(!isDropdownOpen)}
        className={`form-input-base flex items-center gap-3 text-left ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        disabled={disabled || loading}
      >
        <div className="w-5 h-5 bg-theme-background-secondary rounded-md border border-theme-border flex-shrink-0 flex items-center justify-center">
          <FileText className="w-4 h-4 text-theme-foreground-muted" />
        </div>
        
        <span className="flex-1 text-left truncate">
          {displayText}
        </span>
        
        <svg
          className={`w-4 h-4 text-theme-foreground-muted transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isDropdownOpen && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-theme-card border border-theme-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto scrollbar-thin">
          {/* 请选择笔记选项 */}
          <button
            onClick={() => {
              onNoteChange('');
              setIsDropdownOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-theme-card-hover transition-colors duration-200 ${
              !selectedNoteId ? 'bg-theme-background-secondary' : ''
            }`}
          >
            <div className="w-5 h-5 bg-theme-background-secondary rounded-md border border-theme-border flex-shrink-0 flex items-center justify-center">
              <FileText className="w-4 h-4 text-theme-foreground-muted" />
            </div>
            
            <span className="flex-1 truncate text-theme-foreground-muted">
              请选择笔记...
            </span>
            
            {!selectedNoteId && (
              <svg className="w-4 h-4 text-theme-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          
          {/* 分隔线 */}
          {notes.length > 0 && (
            <div className="border-t border-theme-border my-1"></div>
          )}
          
          {notes.length > 0 ? notes.map((note) => {
            const isSelected = note.id.toString() === selectedNoteId;
            
            return (
              <button
                key={note.id}
                onClick={() => {
                  onNoteChange(note.id.toString());
                  setIsDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-theme-card-hover transition-colors duration-200 ${
                  isSelected ? 'bg-theme-background-secondary' : ''
                }`}
              >
                <div className="w-5 h-5 bg-theme-background-secondary rounded-md border border-theme-border flex-shrink-0 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-theme-foreground-muted" />
                </div>
                
                <span className="flex-1 truncate text-theme-foreground">
                  {note.title}
                </span>
                
                {isSelected && (
                  <svg className="w-4 h-4 text-theme-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          }) : (
            <div className="px-3 py-2 text-sm text-theme-foreground-muted">没有可用笔记</div>
          )}
        </div>
      )}
    </div>
  );
}