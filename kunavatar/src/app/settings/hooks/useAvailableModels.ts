import { useState, useEffect } from 'react';

export interface AvailableModel {
  value: string;
  label: string;
  name: string;
  size?: number;
  formattedSize?: string;
  parameterSize?: string;
}

// 格式化模型大小的辅助函数
function formatModelSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// 格式化参数数量的辅助函数
function formatParameterCount(count: number): string {
  if (count >= 1000000000) {
    return `${(count / 1000000000).toFixed(1)}B`;
  } else if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export function useAvailableModels() {
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 从数据库获取模型列表
        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/custom-models', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || '获取模型列表失败');
        }
        
        if (data.success && data.models) {
          const formattedModels: AvailableModel[] = data.models.map((model: any) => ({
            value: model.base_model,
            label: model.display_name,
            name: model.base_model,
            size: model.size,
            formattedSize: model.size ? formatModelSize(model.size) : undefined,
            parameterSize: model.parameter_count ? formatParameterCount(model.parameter_count) : undefined,
          }));
          
          setModels(formattedModels);
        } else {
          throw new Error('无效的响应格式');
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
        setError(err instanceof Error ? err.message : '获取模型列表失败');
        
        // 如果获取失败，使用默认模型列表
        setModels([
          { value: 'qwen-14b-chat', label: 'Qwen-14B-Chat', name: 'qwen-14b-chat' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5-Turbo', name: 'gpt-3.5-turbo' },
          { value: 'deepseek-coder', label: 'Deepseek-Coder', name: 'deepseek-coder' },
          { value: 'phi-2', label: 'Phi-2', name: 'phi-2' },
          { value: 'mistral-7b', label: 'Mistral-7B', name: 'mistral-7b' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchModels();
  }, []);

  const refreshModels = () => {
    setIsLoading(true);
    setError(null);
    // 重新触发useEffect
    window.location.reload();
  };

  return {
    models,
    isLoading,
    error,
    refreshModels,
  };
} 