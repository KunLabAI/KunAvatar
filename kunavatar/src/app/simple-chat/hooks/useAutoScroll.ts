import { useRef, useEffect, useCallback, useState } from 'react';

interface UseAutoScrollOptions {
  messages: any[];
  isStreaming: boolean;
}

interface UseAutoScrollReturn {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  isNearBottom: boolean;
  isNearTop: boolean;
  showScrollButtons: boolean;
  scrollToBottom: (behavior?: 'auto' | 'smooth') => void;
  scrollToTop: (behavior?: 'auto' | 'smooth') => void;
  updateScrollPosition: () => { nearBottom: boolean; nearTop: boolean };
}

export function useAutoScroll({ messages, isStreaming }: UseAutoScrollOptions): UseAutoScrollReturn {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isNearTop, setIsNearTop] = useState(true);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [messageCount, setMessageCount] = useState(messages.length);
  const userHasScrolledUp = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 查找滚动容器的通用函数
  const findScrollContainer = useCallback(() => {
    let container: HTMLElement | null = scrollContainerRef.current;
    if (!container) return null;
    
    // 从当前元素开始，向上查找真正的滚动容器
    let current: HTMLElement | null = container;
    while (current) {
      const computedStyle = getComputedStyle(current);
      const hasVerticalScroll = current.scrollHeight > current.clientHeight;
      const canScroll = computedStyle.overflowY === 'auto' || 
                       computedStyle.overflowY === 'scroll' || 
                       computedStyle.overflow === 'auto' || 
                       computedStyle.overflow === 'scroll';
      
      // 如果找到了可以滚动的容器，返回它
       if (hasVerticalScroll && (canScroll || computedStyle.overflowY !== 'visible')) {
         return current;
       }
      
      // 继续向上查找
      current = current.parentElement;
      
      // 如果到达了body或html，停止查找
      if (current === document.body || current === document.documentElement) {
        break;
      }
    }
     
     // 如果没有找到合适的滚动容器，返回原始容器
     return container;
  }, []);

  // 检查滚动位置的通用函数
  const updateScrollPosition = useCallback(() => {
    const container = findScrollContainer();
    if (!container) return { nearBottom: true, nearTop: true };

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const distanceFromTop = scrollTop;
    
    // 检测是否接近顶部和底部
    const nearBottom = distanceFromBottom <= 100;
    const nearTop = distanceFromTop <= 50;
    
    // 智能显示按钮：当有足够内容可以滚动时就显示
    const hasEnoughContentToScroll = scrollHeight > clientHeight + 100;
    const showButtons = messages.length > 0 && hasEnoughContentToScroll;
    
    setIsNearBottom(nearBottom);
    setIsNearTop(nearTop);
    setShowScrollButtons(showButtons);

    // 如果用户滚动回底部，重置手动滚动标志，以便恢复自动滚动
    if (nearBottom) {
      userHasScrolledUp.current = false;
    }
    
    return { nearBottom, nearTop };
  }, [findScrollContainer, messages.length]);

  // 滚动到底部
  const scrollToBottom = useCallback((behavior: 'auto' | 'smooth' = 'smooth') => {
    // 程序化滚动时，重置用户手动滚动标志
    userHasScrolledUp.current = false;

    // 方法1：使用 scrollIntoView
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior, 
        block: 'end',
        inline: 'nearest' 
      });
      return;
    }
    
    // 方法2：备用方案，使用findScrollContainer查找正确的滚动容器
    const container = findScrollContainer();
    if (container && container.scrollHeight > container.clientHeight) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior
      });
    }
  }, [findScrollContainer]);

  // 滚动到顶部
  const scrollToTop = useCallback((behavior: 'auto' | 'smooth' = 'smooth') => {
    const container = findScrollContainer();
    if (container) {
      container.scrollTo({ top: 0, behavior });
    }
  }, [findScrollContainer]);

  // 监听滚动事件
  useEffect(() => {
    const scrollHandler = () => {
      const container = findScrollContainer();
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

      // 如果用户向上滚动，则标记，以暂停自动滚动
      if (distanceFromBottom > 100) {
        userHasScrolledUp.current = true;
      }
      
      // 实时更新滚动位置状态
      requestAnimationFrame(() => {
        updateScrollPosition();
      });
    };

    const scrollContainer = findScrollContainer();
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', scrollHandler, { passive: true });
      return () => {
        scrollContainer.removeEventListener('scroll', scrollHandler);
      };
    }
  }, [findScrollContainer, updateScrollPosition]);

  // 实时滚动处理 - 使用MutationObserver
  useEffect(() => {
    const container = findScrollContainer();
    if (!container) return;

    const observer = new MutationObserver((mutations) => {
      // 只有在流式传输且用户未向上滚动时才触发
      if (isStreaming && !userHasScrolledUp.current) {
        // 使用 requestAnimationFrame 以获得更平滑的滚动效果
        requestAnimationFrame(() => {
          scrollToBottom('auto');
        });
      }
    });

    // 观察容器的子节点和子树变化
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [isStreaming, findScrollContainer, scrollToBottom]);

  // 当消息列表长度变化时（例如，新消息发送或接收），触发滚动
  useEffect(() => {
    if (!userHasScrolledUp.current) {
      scrollToBottom('smooth');
    }
  }, [messages.length, scrollToBottom]);

  // 初始化及挂载后操作
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom('auto');
      updateScrollPosition();
    }, 100);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      const currentTimeout = scrollTimeoutRef.current;
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
    };
  }, []);

  return {
    scrollContainerRef: scrollContainerRef as React.RefObject<HTMLDivElement>,
    messagesEndRef: messagesEndRef as React.RefObject<HTMLDivElement>,
    isNearBottom,
    isNearTop,
    showScrollButtons,
    scrollToBottom,
    scrollToTop,
    updateScrollPosition
  };
}