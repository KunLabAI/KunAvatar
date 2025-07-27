import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch, useAuthErrorHandler } from '../../../lib/utils/auth-utils';

// 暂时定义CustomModel类型，避免导入问题
interface CustomModel {
  id: number;
  base_model: string;
  display_name: string;
  model_hash: string;
  description?: string | null;
  family: string;
  system_prompt?: string | null;
  parameters: Record<string, any>;
  template?: string | null;
  license?: string | null;
  tags?: string[];
  created_at: string;
  updated_at?: string | null;
  size?: number | null;
  digest?: string | null;
  ollama_modified_at?: string | null;
  architecture?: string | null;
  parameter_count?: number | null;
  context_length?: number | null;
  embedding_length?: number | null;
  quantization_level?: string | null;
  format?: string | null;
  capabilities?: string[];
}

interface UseModelDataReturn {
  models: CustomModel[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useModelData(): UseModelDataReturn {
  const [models, setModels] = useState<CustomModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 认证错误处理
  const { handleAuthError } = useAuthErrorHandler();

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch('/api/custom-models');

      if (!response.ok) {
        // 检查是否是认证错误
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        
        const errorText = await response.text();
        if (errorText.includes('访问令牌')) {
          handleAuthError();
          return;
        }
        
        throw new Error(`获取模型列表失败: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setModels(data.models || []);
      } else {
        throw new Error(data.error || '获取模型列表失败');
      }
    } catch (err) {
      console.error('获取模型列表错误:', err);
      setError(err instanceof Error ? err.message : '获取模型列表失败');
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return {
    models,
    loading,
    error,
    refetch: fetchModels,
  };
}