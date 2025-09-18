import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Copy, Check, NotebookPen } from 'lucide-react';

interface SelectableCopyWrapperProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onQuickNote?: (selectedText: string) => void;
}

interface CopyButtonPosition {
  x: number;
  y: number;
  visible: boolean;
  selectedText: string;
}

export const SelectableCopyWrapper: React.FC<SelectableCopyWrapperProps> = ({
  children,
  className,
  style,
  onQuickNote,
}) => {
  const [copyButton, setCopyButton] = useState<CopyButtonPosition>({
    x: 0,
    y: 0,
    visible: false,
    selectedText: '',
  });
  const [isCopied, setIsCopied] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const copyButtonRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 处理文字选中
  const handleTextSelection = useCallback(() => {
    // 添加小延迟确保选择操作完成
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setCopyButton(prev => ({ ...prev, visible: false }));
        return;
      }

      const selectedText = selection.toString().trim();
      if (!selectedText) {
        setCopyButton(prev => ({ ...prev, visible: false }));
        return;
      }

      // 检查选中的文字是否在当前组件内
      const range = selection.getRangeAt(0);
      const container = wrapperRef.current;
      if (!container) {
        setCopyButton(prev => ({ ...prev, visible: false }));
        return;
      }

      // 更准确的范围检测：检查起始和结束节点是否都在容器内
      const startContainer = range.startContainer;
      const endContainer = range.endContainer;
      const isStartInContainer = container.contains(startContainer);
      const isEndInContainer = container.contains(endContainer);
      
      if (!isStartInContainer || !isEndInContainer) {
        setCopyButton(prev => ({ ...prev, visible: false }));
        return;
      }

      // 获取选中区域的位置
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // 确保选中区域有有效的尺寸
      if (rect.width === 0 || rect.height === 0) {
        setCopyButton(prev => ({ ...prev, visible: false }));
        return;
      }
      
      // 计算复制按钮的位置（相对于容器）
      const x = rect.left - containerRect.left + rect.width / 2;
      const y = rect.top - containerRect.top - 50; // 在选中文字上方50px，增加间距

      setCopyButton({
        x,
        y,
        visible: true,
        selectedText,
      });

      // 只有在选择了不同文字时才重置复制状态
      if (copyButton.selectedText !== selectedText) {
        setIsCopied(false);
        // 清除之前的隐藏定时器
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
      }
    }, 10); // 10ms延迟
  }, [copyButton.selectedText, isHovering]);

  // 处理复制操作
  const handleCopy = useCallback(async () => {
    if (!copyButton.selectedText) return;

    try {
      await navigator.clipboard.writeText(copyButton.selectedText);
      setIsCopied(true);
      
      // 2秒后隐藏按钮（如果没有悬停）
      hideTimeoutRef.current = setTimeout(() => {
        if (!isHovering) {
          setCopyButton(prev => ({ ...prev, visible: false }));
          setIsCopied(false);
        }
      }, 2000);
    } catch (error) {
      // 降级方案：使用传统的复制方法
      try {
        const textArea = document.createElement('textarea');
        textArea.value = copyButton.selectedText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setIsCopied(true);
        
        hideTimeoutRef.current = setTimeout(() => {
          if (!isHovering) {
            setCopyButton(prev => ({ ...prev, visible: false }));
            setIsCopied(false);
          }
        }, 2000);
      } catch (fallbackError) {
        // 复制失败，静默处理
      }
    }
  }, [copyButton.selectedText]);

  // 处理快速笔记操作
  const handleQuickNote = useCallback(() => {
    if (!copyButton.selectedText || !onQuickNote) return;
    
    onQuickNote(copyButton.selectedText);
    // 隐藏工具条
    setCopyButton(prev => ({ ...prev, visible: false }));
  }, [copyButton.selectedText, onQuickNote]);

  // 处理工具条悬停
  const handleToolbarMouseEnter = useCallback(() => {
    setIsHovering(true);
    // 清除隐藏定时器
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleToolbarMouseLeave = useCallback(() => {
    setIsHovering(false);
    // 延迟隐藏工具条
    hideTimeoutRef.current = setTimeout(() => {
      setCopyButton(prev => ({ ...prev, visible: false }));
      setIsCopied(false);
    }, 1000); // 1秒后隐藏
  }, []);

  // 处理点击外部区域隐藏按钮
  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Node;
    const copyButtonElement = copyButtonRef.current;
    const wrapperElement = wrapperRef.current;
    
    // 如果点击的是复制按钮，不隐藏
    if (copyButtonElement && copyButtonElement.contains(target)) {
      return;
    }
    
    // 如果点击的不是包装器内部，隐藏按钮
    if (wrapperElement && !wrapperElement.contains(target)) {
      setCopyButton(prev => ({ ...prev, visible: false }));
    }
  }, []);

  // 监听选中事件
  useEffect(() => {
    document.addEventListener('selectionchange', handleTextSelection);
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('selectionchange', handleTextSelection);
      document.removeEventListener('mouseup', handleTextSelection);
      document.removeEventListener('click', handleClickOutside);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [handleTextSelection, handleClickOutside]);

  return (
    <div
      ref={wrapperRef}
      className={`relative ${className || ''}`}
      style={style}
    >
      {children}
      
      {/* 复制按钮弹窗 */}
      {copyButton.visible && (
        <div
          ref={copyButtonRef}
          className="absolute z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300"
          style={{
            left: `${copyButton.x}px`,
            top: `${copyButton.y}px`,
            transform: 'translateX(-50%)',
          }}
          onMouseEnter={handleToolbarMouseEnter}
          onMouseLeave={handleToolbarMouseLeave}
        >
          <div className="bg-theme-background/95 backdrop-blur border border-theme-border rounded-lg p-1 flex items-center hover:shadow-sm transition-all duration-200">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 p-2.5 text-sm text-theme-foreground hover:bg-theme-primary/10 hover:text-theme-primary rounded-md transition-all duration-200 hover:scale-105 active:scale-95"
              title={isCopied ? "已复制" : "复制选中文字"}
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                </>
              )}
            </button>
            {onQuickNote && (
              <button
                onClick={handleQuickNote}
                className="flex items-center gap-2 p-2.5 text-sm text-theme-foreground hover:bg-theme-primary/10 hover:text-theme-primary rounded-md transition-all duration-200 hover:scale-105 active:scale-95"
                title="快速笔记"
              >
                <NotebookPen className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectableCopyWrapper;