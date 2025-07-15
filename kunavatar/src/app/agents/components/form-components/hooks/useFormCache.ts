import { useCallback } from 'react';
import { FormData } from '../types';

// 本地缓存键名
const CACHE_KEY = 'agent_form_cache';

export const useFormCache = () => {
  // 保存到本地缓存
  const saveToCache = useCallback((data: FormData) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('保存到本地缓存失败:', error);
    }
  }, []);
  
  // 从本地缓存加载
  const loadFromCache = useCallback((): FormData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('从本地缓存加载失败:', error);
    }
    return null;
  }, []);
  
  // 清除本地缓存
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('清除本地缓存失败:', error);
    }
  }, []);

  return {
    saveToCache,
    loadFromCache,
    clearCache
  };
};