'use client';

import React, { useEffect, useRef } from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import { useTheme } from '@/theme/contexts/ThemeContext';

// 与VditorEditor完全一致的样式配置
const getVditorPreviewStyles = (theme: string) => `
  .vditor-preview-wrapper {
    border-radius: 8px;
    overflow: hidden;
  }
  
  .vditor-preview-wrapper .vditor-reset {
    background-color: transparent !important;
    color: ${theme === 'dark' ? '#e5e5e5' : '#333333'} !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    line-height: 1.6;
    padding: 0;
    margin: 0;
  }
  
  /* 标题样式 - 与编辑器一致 */
  .vditor-preview-wrapper .vditor-reset h1,
  .vditor-preview-wrapper .vditor-reset h2,
  .vditor-preview-wrapper .vditor-reset h3,
  .vditor-preview-wrapper .vditor-reset h4,
  .vditor-preview-wrapper .vditor-reset h5,
  .vditor-preview-wrapper .vditor-reset h6 {
    color: ${theme === 'dark' ? '#ffffff' : '#1a1a1a'} !important;
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    line-height: 1.3;
  }
  
  .vditor-preview-wrapper .vditor-reset h1 {
    font-size: 2em;
    border-bottom: 1px solid ${theme === 'dark' ? '#404040' : '#e1e5e9'};
    padding-bottom: 0.3em;
  }
  
  .vditor-preview-wrapper .vditor-reset h2 {
    font-size: 1.5em;
    border-bottom: 1px solid ${theme === 'dark' ? '#404040' : '#e1e5e9'};
    padding-bottom: 0.3em;
  }
  
  .vditor-preview-wrapper .vditor-reset h3 {
    font-size: 1.25em;
  }
  
  .vditor-preview-wrapper .vditor-reset h4 {
    font-size: 1em;
  }
  
  .vditor-preview-wrapper .vditor-reset h5 {
    font-size: 0.875em;
  }
  
  .vditor-preview-wrapper .vditor-reset h6 {
    font-size: 0.85em;
    color: ${theme === 'dark' ? '#cccccc' : '#6a737d'} !important;
  }
  
  /* 段落和文本样式 */
  .vditor-preview-wrapper .vditor-reset p,
  .vditor-preview-wrapper .vditor-reset div,
  .vditor-preview-wrapper .vditor-reset span,
  .vditor-preview-wrapper .vditor-reset li {
    color: ${theme === 'dark' ? '#e5e5e5' : '#333333'} !important;
  }
  
  .vditor-preview-wrapper .vditor-reset p {
    margin-top: 0;
    margin-bottom: 1em;
  }
  
  /* 引用块样式 - 与编辑器完全一致 */
  .vditor-preview-wrapper .vditor-reset blockquote {
    border-left: 4px solid ${theme === 'dark' ? '#666' : '#dfe2e5'} !important;
    background-color: ${theme === 'dark' ? '#2d2d2d' : '#f6f8fa'} !important;
    color: ${theme === 'dark' ? '#cccccc' : '#6a737d'} !important;
    padding: 0.5em 1em;
    margin: 1em 0;
    border-radius: 0 4px 4px 0;
  }
  
  .vditor-preview-wrapper .vditor-reset blockquote p {
    color: inherit !important;
    margin-bottom: 0.5em;
  }
  
  .vditor-preview-wrapper .vditor-reset blockquote p:last-child {
    margin-bottom: 0;
  }
  
  /* 代码样式 - 与编辑器完全一致 */
  .vditor-preview-wrapper .vditor-reset code {
    background-color: ${theme === 'dark' ? '#2d2d2d' : '#f6f8fa'} !important;
    color: ${theme === 'dark' ? '#f8f8f2' : '#24292e'} !important;
    border: 1px solid ${theme === 'dark' ? '#404040' : '#e1e4e8'} !important;
    border-radius: 3px;
    padding: 0.2em 0.4em;
    font-size: 0.85em;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  }
  
  .vditor-preview-wrapper .vditor-reset pre {
    background-color: ${theme === 'dark' ? '#2d2d2d' : '#f6f8fa'} !important;
    border: 1px solid ${theme === 'dark' ? '#404040' : '#e1e4e8'} !important;
    border-radius: 6px;
    padding: 1em;
    overflow: auto;
    margin: 1em 0;
    line-height: 1.45;
  }
  
  .vditor-preview-wrapper .vditor-reset pre code {
    background-color: transparent !important;
    border: none !important;
    padding: 0;
    font-size: inherit;
    color: ${theme === 'dark' ? '#f8f8f2' : '#24292e'} !important;
  }
  
  /* 表格样式 - 与编辑器完全一致 */
  .vditor-preview-wrapper .vditor-reset table {
    border: 1px solid ${theme === 'dark' ? '#404040' : '#e1e4e8'} !important;
    border-collapse: collapse;
    margin: 1em 0;
    width: 100%;
  }
  
  .vditor-preview-wrapper .vditor-reset th,
  .vditor-preview-wrapper .vditor-reset td {
    border: 1px solid ${theme === 'dark' ? '#404040' : '#e1e4e8'} !important;
    background-color: ${theme === 'dark' ? '#2d2d2d' : '#ffffff'} !important;
    color: ${theme === 'dark' ? '#e5e5e5' : '#333333'} !important;
    padding: 8px 12px;
    text-align: left;
  }
  
  .vditor-preview-wrapper .vditor-reset th {
    background-color: ${theme === 'dark' ? '#404040' : '#f6f8fa'} !important;
    color: ${theme === 'dark' ? '#ffffff' : '#24292e'} !important;
    font-weight: 600;
  }
  
  /* 列表样式 - 与编辑器一致 */
  .vditor-preview-wrapper .vditor-reset ul,
  .vditor-preview-wrapper .vditor-reset ol {
    margin: 1em 0;
    padding-left: 2em;
  }

  .vditor-preview-wrapper .vditor-reset ul {
    list-style-type: disc;
  }

  .vditor-preview-wrapper .vditor-reset ol {
    list-style-type: decimal;
  }

  .vditor-preview-wrapper .vditor-reset li {
    margin: 0.25em 0;
    display: list-item;
  }

  .vditor-preview-wrapper .vditor-reset li p {
    margin: 0.25em 0;
  }

  /* 嵌套列表样式 */
  .vditor-preview-wrapper .vditor-reset ul ul {
    list-style-type: circle;
  }

  .vditor-preview-wrapper .vditor-reset ul ul ul {
    list-style-type: square;
  }

  .vditor-preview-wrapper .vditor-reset ol ol {
    list-style-type: lower-alpha;
  }

  .vditor-preview-wrapper .vditor-reset ol ol ol {
    list-style-type: lower-roman;
  }
  
  /* 任务列表样式 */
  .vditor-preview-wrapper .vditor-reset .vditor-task {
    list-style: none;
    margin-left: -2em;
    padding-left: 2em;
  }
  
  .vditor-preview-wrapper .vditor-reset .vditor-task input {
    margin-right: 0.5em;
  }
  
  /* 链接样式 */
  .vditor-preview-wrapper .vditor-reset a {
    color: ${theme === 'dark' ? '#58a6ff' : '#0366d6'} !important;
    text-decoration: none;
  }
  
  .vditor-preview-wrapper .vditor-reset a:hover {
    text-decoration: underline;
  }
  
  /* 分割线样式 */
  .vditor-preview-wrapper .vditor-reset hr {
    border: none;
    border-top: 1px solid ${theme === 'dark' ? '#404040' : '#e1e4e8'};
    margin: 2em 0;
  }
  
  /* 强调样式 */
  .vditor-preview-wrapper .vditor-reset strong {
    font-weight: 600;
    color: inherit;
  }
  
  .vditor-preview-wrapper .vditor-reset em {
    font-style: italic;
    color: inherit;
  }
  
  /* 删除线样式 */
  .vditor-preview-wrapper .vditor-reset del {
    text-decoration: line-through;
    color: ${theme === 'dark' ? '#8b949e' : '#6a737d'};
  }
  
  /* 图片样式 */
  .vditor-preview-wrapper .vditor-reset img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin: 0.5em 0;
  }
`;

interface VditorPreviewProps {
  value: string;
  className?: string;
}

const VditorPreview: React.FC<VditorPreviewProps> = ({
  value,
  className = ''
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // 注入与编辑器一致的自定义样式
  useEffect(() => {
    const styleId = 'vditor-preview-custom-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    // 更新样式内容以匹配当前主题
    styleElement.textContent = getVditorPreviewStyles(theme);
    
    return () => {
      // 组件卸载时不移除样式，因为可能有多个实例
    };
  }, [theme]);

  useEffect(() => {
    if (!previewRef.current || !value) return;

    // 使用 Vditor 的预览功能渲染 markdown，配置与编辑器保持一致
    Vditor.preview(previewRef.current, value, {
      mode: theme === 'dark' ? 'dark' : 'light',
      theme: {
        current: theme === 'dark' ? 'dark' : 'classic'
      },
      hljs: {
        style: theme === 'dark' ? 'github-dark' : 'github',
        lineNumber: false
      },
      speech: {
        enable: false
      },
      anchor: 1, // 1: render left, 2: render right, 0: no render
      math: {
        inlineDigit: true,
        engine: 'KaTeX'
      },
      markdown: {
        toc: true,
        footnotes: true,
        autoSpace: true
      }
    });

    // 设置代码主题，确保与编辑器一致
    const codeTheme = theme === 'dark' ? 'github-dark' : 'github';
    Vditor.setCodeTheme(codeTheme);
  }, [value, theme]);

  if (!value) {
    return (
      <div className={`text-theme-muted-foreground text-center py-8 ${className}`}>
        暂无内容
      </div>
    );
  }

  return (
    <div className={`vditor-preview-wrapper ${className}`}>
      <div 
        ref={previewRef} 
        className="vditor-reset"
        style={{
          backgroundColor: 'transparent',
          color: 'inherit',
          minHeight: '2em'
        }}
        data-theme={theme}
      />
    </div>
  );
};

export default VditorPreview;