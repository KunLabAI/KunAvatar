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
  const programmaticScrolling = useRef(false);
  const lastScrollTop = useRef(0);
  const userScrollDirection = useRef<'up' | 'down' | null>(null);

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

  // 检查滚动位置的通用函数 - 重构为响应式设计
  const updateScrollPosition = useCallback(() => {
    const container = findScrollContainer();
    if (!container) return { nearBottom: true, nearTop: true };

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const distanceFromTop = scrollTop;

    // 记录方向（仅在非程序滚动时）
    if (!programmaticScrolling.current) {
      if (scrollTop > lastScrollTop.current) {
        userScrollDirection.current = 'down';
      } else if (scrollTop < lastScrollTop.current) {
        userScrollDirection.current = 'up';
      }
      lastScrollTop.current = scrollTop;
    }
    
    // 🎯 响应式阈值计算 - 基于容器高度的百分比
    const containerHeight = clientHeight;
    const bottomThreshold = Math.max(Math.min(containerHeight * 0.15, 150), 30); // 15%容器高度，最大150px，最小30px
    const topThreshold = Math.max(Math.min(containerHeight * 0.1, 100), 20);   // 10%容器高度，最大100px，最小20px
    const resetThreshold = Math.max(Math.min(containerHeight * 0.05, 50), 10);  // 5%容器高度，用于重置标志
    
    // 检测是否接近顶部和底部
    const nearBottom = distanceFromBottom <= bottomThreshold;
    const nearTop = distanceFromTop <= topThreshold;
    
    // 智能显示按钮：当有足够内容可以滚动时就显示
    const minScrollableHeight = containerHeight * 0.2; // 至少20%的容器高度才显示按钮
    const hasEnoughContentToScroll = scrollHeight > clientHeight + minScrollableHeight;
    const showButtons = messages.length > 0 && hasEnoughContentToScroll;
    
    setIsNearBottom(nearBottom);
    setIsNearTop(nearTop);
    setShowScrollButtons(showButtons);

    // 如果用户滚动回底部附近并且方向为向下，重置滚动标志，以便恢复自动滚动
    if (nearBottom && distanceFromBottom <= resetThreshold && userScrollDirection.current === 'down') {
      userHasScrolledUp.current = false;
    }
    
    return { nearBottom, nearTop };
  }, [findScrollContainer, messages.length]);

  // 滚动到底部 - 简化版本
  const scrollToBottom = useCallback((behavior: 'auto' | 'smooth' = 'smooth') => {
    // 如果已经在程序滚动中，避免重复设置
    if (!programmaticScrolling.current) {
      programmaticScrolling.current = true;
    }
    
    const resetFlag = () => {
      // 稍微延迟，确保滚动完成并且scroll事件处理过
      setTimeout(() => {
        programmaticScrolling.current = false;
      }, behavior === 'smooth' ? 600 : 120);
    };
    
    // 使用 scrollIntoView
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior, 
        block: 'end',
        inline: 'nearest' 
      });
      resetFlag();
      return;
    }
    
    // 备用方案
    const container = findScrollContainer();
    if (container && container.scrollHeight > container.clientHeight) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior
      });
      resetFlag();
    }
  }, [findScrollContainer]);

  // 滚动到顶部
  const scrollToTop = useCallback((behavior: 'auto' | 'smooth' = 'smooth') => {
    // 标记程序正在执行滚动
    programmaticScrolling.current = true;
    userHasScrolledUp.current = true; // 标记用户向上滚动
    
    const container = findScrollContainer();
    if (container) {
      container.scrollTo({
        top: 0,
        behavior
      });
      // 延迟重置程序滚动标志
      setTimeout(() => {
        programmaticScrolling.current = false;
      }, behavior === 'smooth' ? 500 : 100);
    }
  }, [findScrollContainer]);

  // 监听滚动事件 - 简化版本
  useEffect(() => {
    let ticking = false;
    
    const scrollHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const container = findScrollContainer();
          if (!container) {
            ticking = false;
            return;
          }
          
          const { scrollTop, scrollHeight, clientHeight } = container;
          const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

          // 如果是程序触发的滚动，不进行用户滚动判断
          if (!programmaticScrolling.current) {
            // 简化：一旦检测到用户向上滚动，立即停止自动滚动
            if (userScrollDirection.current === 'up') {
              userHasScrolledUp.current = true;
            }
            // 恢复：当用户向下且接近底部时，恢复自动滚动
            const containerHeight = clientHeight;
            const resumeThreshold = Math.max(Math.min(containerHeight * 0.05, 60), 20);
            if (userScrollDirection.current === 'down' && distanceFromBottom <= resumeThreshold) {
              userHasScrolledUp.current = false;
            }
          }
          
          // 更新滚动位置状态
          updateScrollPosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    const scrollContainer = findScrollContainer();
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', scrollHandler, { passive: true });
      return () => {
        scrollContainer.removeEventListener('scroll', scrollHandler);
      };
    }
  }, [findScrollContainer, updateScrollPosition]);

  // 实时滚动处理 - 使用MutationObserver，仅在流式传输时启用
  // 采用极其保守的策略，避免强制滚动
  useEffect(() => {
    if (!isStreaming) return;
    
    const container = findScrollContainer();
    if (!container) return;

    let isScrolling = false;
    
    const observer = new MutationObserver(() => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

      // 仅在用户未明显上滚时才滚动；并且需要接近底部或变化幅度较小
      // 简化：只要用户已手动上滚，就完全不自动滚动；否则自动滚动
      if (!userHasScrolledUp.current && !isScrolling) {
        isScrolling = true;
        programmaticScrolling.current = true;
        requestAnimationFrame(() => {
          scrollToBottom('auto');
          isScrolling = false;
          setTimeout(() => {
            programmaticScrolling.current = false;
          }, 100);
        });
      }
    });

    observer.observe(container, { 
      childList: true, 
      subtree: true,
      characterData: true
    });

    return () => {
      observer.disconnect();
    };
  }, [isStreaming, findScrollContainer, scrollToBottom]);

  // 当消息列表长度变化时（例如，新消息发送或接收），触发滚动
  useEffect(() => {
    const container = findScrollContainer();
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const nearBottomThreshold = Math.max(Math.min(clientHeight * 0.2, 180), 40);

    // 简化：只要用户已手动上滚，就完全不自动滚动；否则自动滚动
    if (!userHasScrolledUp.current) {
      scrollToBottom('smooth');
    }
  }, [messages.length, scrollToBottom, findScrollContainer]);

  // 初始化及挂载后操作
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom('auto'); // 初始化滚动
      updateScrollPosition();
    }, 100);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
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