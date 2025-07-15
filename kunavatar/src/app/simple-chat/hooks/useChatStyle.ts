import { useEffect } from 'react';
import { ChatStyle, DisplaySize } from '../components/input-controls';
import { useUserSettings } from '@/hooks/useUserSettings';

export function useChatStyle() {
  const { settings, loading, updateSetting } = useUserSettings();
  
  // 从用户设置中获取当前值
  const chatStyle = (settings.chatStyle as ChatStyle) || 'assistant';
  const displaySize = (settings.displaySize as DisplaySize) || 'fullscreen';
  const isLoaded = !loading;

  // 监听来自设置页面的样式变更事件（保持兼容性）
  useEffect(() => {
    const handleChatStyleChange = (event: CustomEvent) => {
      const { chatStyle: newStyle } = event.detail;
      if (newStyle && (newStyle === 'conversation' || newStyle === 'assistant')) {
        // 事件已经触发了数据库更新，这里只需要等待useUserSettings自动刷新
      }
    };

    const handleDisplaySizeChange = (event: CustomEvent) => {
      const { displaySize: newSize } = event.detail;
      if (newSize && (newSize === 'fullscreen' || newSize === 'compact')) {
        // 事件已经触发了数据库更新，这里只需要等待useUserSettings自动刷新
      }
    };

    window.addEventListener('chatStyleChanged', handleChatStyleChange as EventListener);
    window.addEventListener('displaySizeChanged', handleDisplaySizeChange as EventListener);

    return () => {
      window.removeEventListener('chatStyleChanged', handleChatStyleChange as EventListener);
      window.removeEventListener('displaySizeChanged', handleDisplaySizeChange as EventListener);
    };
  }, []);

  // 更新聊天样式
  const handleChatStyleChange = async (style: ChatStyle) => {
    try {
      await updateSetting('chatStyle', style);
    } catch (err) {
      console.log('保存聊天样式偏好失败:', err);
    }
  };

  // 更新显示尺寸
  const handleDisplaySizeChange = async (size: DisplaySize) => {
    try {
      await updateSetting('displaySize', size);
    } catch (err) {
      console.log('保存显示尺寸偏好失败:', err);
    }
  };

  return {
    chatStyle,
    displaySize,
    setChatStyle: handleChatStyleChange,
    setDisplaySize: handleDisplaySizeChange,
    isLoaded,
  };
}