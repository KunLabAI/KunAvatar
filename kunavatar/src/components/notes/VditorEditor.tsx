'use client';

import React, { useEffect, useRef, useState } from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import { useTheme } from '@/theme/contexts/ThemeContext';

interface VditorEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  className?: string;
}

const VditorEditor: React.FC<VditorEditorProps> = ({
  value,
  onChange,
  placeholder = '请输入内容...',
  height = '516px',
  className = ''
}) => {
  const vditorRef = useRef<HTMLDivElement>(null);
  const vditorInstance = useRef<Vditor | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    if (!vditorRef.current) return;

    // 初始化 Vditor
    const initVditor = async () => {
      try {
        vditorInstance.current = new Vditor(vditorRef.current!, {
          height: parseInt(height.replace('px', '')),
          mode: 'wysiwyg',
          placeholder,
          value,
          theme: theme === 'dark' ? 'dark' : 'classic',
          cache: {
            enable: false
          },
          preview: {
            delay: 300,
            mode: 'editor',
            hljs: {
              style: theme === 'dark' ? 'github-dark' : 'github'
            },
            parse: (element) => {
              if (element.style.display === 'none') {
                return;
              }
            }
          },
          toolbar: [
            'emoji',
            'headings',
            'bold',
            'italic',
            'strike',
            'link',
            '|',
            'list',
            'ordered-list',
            'check',
            'outdent',
            'indent',
            '|',
            'quote',
            'line',
            'code',
            'inline-code',
            'insert-before',
            'insert-after',
            '|',
            'upload',
            'table',
            '|',
            'undo',
            'redo',
            '|',
            'fullscreen',
            'edit-mode',
            {
              name: 'more',
              toolbar: [
                'both',
                'code-theme',
                'content-theme',
                'export',
                'outline',
                'preview',
                'devtools'
              ]
            }
          ],
          upload: {
            accept: 'image/*',
            multiple: false,
            fieldName: 'file',
            url: '/api/notes/toolsimage',
            success: (editor: HTMLElement, msg: string) => {
              try {
                console.log('收到上传响应:', msg);
                const response = JSON.parse(msg);
                console.log('解析后的响应:', response);
                
                if (response.code === 0 && response.data?.succMap) {
                  // 获取第一个成功上传的文件URL
                  const urls = Object.values(response.data.succMap);
                  if (urls.length > 0 && vditorInstance.current) {
                    const imageUrl = urls[0] as string;
                    console.log('图片上传成功:', imageUrl);
                    // 使用HTML标签插入图片，支持尺寸控制
                    vditorInstance.current.insertValue(`<img src="${imageUrl}" alt="image" style="max-width: 100%; height: auto;" width="500" />`);
                  }
                } else {
                  console.error('图片上传失败:', response.msg || '未知错误', '完整响应:', response);
                }
              } catch (error) {
                console.error('解析上传响应失败:', error, '原始响应:', msg);
              }
            },
            error: (msg: string) => {
              console.error('图片上传错误:', msg);
            }
          },

          after: () => {
            setIsInitialized(true);
            // 延迟设置初始值，确保 Vditor 完全初始化
            if (vditorInstance.current && value) {
              setTimeout(() => {
                if (vditorInstance.current) {
                  try {
                    vditorInstance.current.setValue(value);
                  } catch (error) {
                    console.warn('设置 Vditor 初始值失败:', error);
                  }
                }
              }, 100);
            }
          },
          input: (value: string) => {
            onChange(value);
          },
          blur: (value: string) => {
            onChange(value);
          },
          // 添加 customWysiwygToolbar 回调函数以解决 "is not a function" 错误
          customWysiwygToolbar: (element: string) => {
            // 这是一个空的实现，用于防止 vditor 内部调用时出错
            // 如果需要自定义 wysiwyg 工具栏行为，可以在这里添加逻辑
            return '';
          }
        });
      } catch (error) {
        console.error('Vditor 初始化失败:', error);
      }
    };

    initVditor();

    // 清理函数
    return () => {
      if (vditorInstance.current) {
        try {
          // 检查 Vditor 实例是否完全初始化
          const instance = vditorInstance.current as any;
          if (instance && instance.element && typeof instance.destroy === 'function') {
            instance.destroy();
          } else {
            // 如果实例未完全初始化，尝试手动清理 DOM
            const container = document.getElementById('vditor-container');
            if (container) {
              container.innerHTML = '';
            }
          }
        } catch (error) {
          console.error('Vditor 销毁失败:', error);
          // 发生错误时也尝试清理 DOM
          try {
            const container = document.getElementById('vditor-container');
            if (container) {
              container.innerHTML = '';
            }
          } catch (cleanupError) {
            console.error('DOM 清理失败:', cleanupError);
          }
        }
      }
      vditorInstance.current = null;
      setIsInitialized(false);
    };
  }, []);

  // 当外部 value 变化时更新编辑器内容
  useEffect(() => {
    if (isInitialized && vditorInstance.current && value !== vditorInstance.current.getValue()) {
      try {
        vditorInstance.current.setValue(value);
      } catch (error) {
        console.warn('更新 Vditor 内容失败:', error);
        // 如果直接设置失败，尝试延迟设置
        setTimeout(() => {
          if (vditorInstance.current) {
            try {
              vditorInstance.current.setValue(value);
            } catch (retryError) {
              console.error('延迟更新 Vditor 内容也失败:', retryError);
            }
          }
        }, 100);
      }
    }
  }, [value, isInitialized]);

  // 当主题变化时更新编辑器主题
  useEffect(() => {
    if (isInitialized && vditorInstance.current) {
      const vditorTheme = theme === 'dark' ? 'dark' : 'classic';
      vditorInstance.current.setTheme(vditorTheme);
      
      // 设置代码主题，确保代码块的可读性
      const codeTheme = theme === 'dark' ? 'github-dark' : 'github';
      Vditor.setCodeTheme(codeTheme);
    }
  }, [theme, isInitialized]);

  return (
    <>
      <div className={`vditor-wrapper ${className}`}>
        <div ref={vditorRef} style={{ minHeight: height }} />
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
          .vditor-wrapper .vditor {
            border: 1px solid var(--theme-border);
            border-radius: 8px;
            overflow: hidden;
          }
          
          .vditor-wrapper .vditor--dark {
            background-color: #1a1a1a;
          }
          
          .vditor-wrapper .vditor--dark .vditor-toolbar {
            background-color: #2d2d2d;
            border-bottom: 1px solid #404040;
          }
          
          .vditor-wrapper .vditor--dark .vditor-content {
            background-color: #1a1a1a;
          }
          
          .vditor-wrapper .vditor--dark .vditor-wysiwyg {
            background-color: #1a1a1a;
            color: #e5e5e5;
          }
          
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset {
            background-color: #1a1a1a;
            color: #e5e5e5;
          }
          
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset p,
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset div,
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset span {
            color: #e5e5e5;
          }
          
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset h1,
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset h2,
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset h3,
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset h4,
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset h5,
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset h6 {
            color: #ffffff;
          }
          
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset blockquote {
            border-left: 4px solid #666;
            background-color: #2d2d2d;
            color: #cccccc;
          }
          
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset code {
            background-color: #2d2d2d;
            color: #f8f8f2;
            border: 1px solid #404040;
          }
          
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset pre {
            background-color: #2d2d2d;
            border: 1px solid #404040;
          }
          
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset pre code {
            background-color: transparent;
            border: none;
          }
          
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset table {
            border: 1px solid #404040;
          }
          
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset th,
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset td {
            border: 1px solid #404040;
            background-color: #2d2d2d;
            color: #e5e5e5;
          }
          
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset th {
            background-color: #404040;
            color: #ffffff;
          }
          
          .vditor-wrapper .vditor--dark .vditor-wysiwyg .vditor-reset::before {
            color: #888888;
          }
          
          .vditor-wrapper .vditor--classic .vditor-content {
            background-color: #ffffff;
          }
          
          .vditor-wrapper .vditor--classic .vditor-wysiwyg {
            background-color: #ffffff;
            color: #333333;
          }
          
          .vditor-wrapper .vditor--classic .vditor-wysiwyg .vditor-reset {
            background-color: #ffffff;
            color: #333333;
          }
        `
      }} />
    </>
  );
};

export default VditorEditor;