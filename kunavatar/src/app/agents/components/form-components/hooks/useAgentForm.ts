import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { FormData, agentSchema } from '../types';
import { AgentWithRelations } from '../../../types';
import { useFormCache } from './useFormCache';
import { useModelToolValidation } from './useModelToolValidation';
import { CustomModel } from '@/lib/database/custom-models';

interface UseAgentFormProps {
  agent: AgentWithRelations | null;
  onSave: () => void;
  availableModels: CustomModel[];
}

export const useAgentForm = ({ agent, onSave, availableModels }: UseAgentFormProps) => {
  const { saveToCache, loadFromCache, clearCache } = useFormCache();
   
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    model_id: null,
    avatar: null,
    server_ids: [],
    tool_ids: [],
  });
  
  const [initialFormData, setInitialFormData] = useState<FormData>({
    name: '',
    description: '',
    model_id: null,
    avatar: null,
    server_ids: [],
    tool_ids: [],
  });
  
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [errors, setErrors] = useState<z.ZodError | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const isEditMode = agent !== null;
  
  // 模型工具验证
  const {
    isValidating,
    validationResult,
    performValidation,
    clearValidation,
  } = useModelToolValidation({
    availableModels,
    selectedModelId: formData.model_id,
    hasSelectedTools: formData.tool_ids.length > 0,
  });
  
  // 重置表单到初始状态
  const resetForm = useCallback(() => {
    setFormData({ ...initialFormData });
    setMemoryEnabled(true);
    clearCache();
  }, [initialFormData, clearCache]);
  
  // 监听表单数据变化，自动保存到缓存
  useEffect(() => {
    if (!isEditMode) {
      saveToCache(formData);
    }
  }, [formData, isEditMode, saveToCache]);

  // 初始化表单数据
  useEffect(() => {
    if (isEditMode && agent) {
      const editData: FormData = {
        name: agent.name,
        description: agent.description || '',
        model_id: agent.model_id,
        avatar: agent.avatar || null,
        server_ids: agent.servers.map(s => s.id),
        tool_ids: agent.tools.map(t => t.id),
      };
      setFormData(editData);
      setInitialFormData(editData);
      
      // 加载记忆设置
      loadMemorySettings(agent.id);
    } else {
      const defaultData: FormData = {
        name: '', 
        description: '', 
        model_id: null, 
        avatar: null,
        server_ids: [], 
        tool_ids: [],
      };
      
      // 尝试从缓存加载数据
      const cachedData = loadFromCache();
      if (cachedData) {
        setFormData(cachedData);
      } else {
        setFormData(defaultData);
      }
      setInitialFormData(defaultData);
      
      // 重置记忆设置为默认值
      setMemoryEnabled(true);
    }
  }, [agent, isEditMode, loadFromCache]);

  // 加载记忆设置
  const loadMemorySettings = async (agentId: number) => {
    setMemoryLoading(true);
    try {
      const response = await fetch(`/api/agents/${agentId}/memory`);
      if (response.ok) {
        const { memorySettings: settings } = await response.json();
        setMemoryEnabled(settings.memory_enabled);
      }
    } catch (error) {
      console.error('加载记忆设置失败:', error);
    } finally {
      setMemoryLoading(false);
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    setErrors(null);
    setApiError(null);
    clearValidation();
    
    // 基础表单验证
    const result = agentSchema.safeParse(formData);
    if (!result.success) {
      setErrors(result.error);
      setApiError('请检查表单中的错误信息');
      return;
    }

    // 模型工具兼容性验证
    const validationResult = await performValidation();
    if (!validationResult.isValid) {
      setApiError(validationResult.message || '模型工具配置验证失败');
      return;
    }

    setIsSaving(true);
    
    try {
      // 保存智能体基本信息
      const response = await fetch(isEditMode ? `/api/agents/${agent!.id}` : '/api/agents', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存智能体失败');
      }

      const agentData = await response.json();
      const agentId = isEditMode ? agent!.id : agentData.id;

      // 保存记忆设置
      const memoryResponse = await fetch(`/api/agents/${agentId}/memory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory_enabled: memoryEnabled }),
      });

      if (!memoryResponse.ok) {
        console.warn('记忆设置保存失败，但智能体已创建/更新');
      }

      // 成功保存后清除缓存
      if (!isEditMode) {
        clearCache();
      }
      
      onSave();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : '发生未知错误');
    } finally {
      setIsSaving(false);
    }
  };

  // 获取字段错误
  const getFieldError = (fieldName: string) => {
    return errors?.formErrors.fieldErrors[fieldName]?.[0];
  };

  return {
    formData,
    setFormData,
    memoryEnabled,
    setMemoryEnabled,
    memoryLoading,
    errors,
    isSaving,
    apiError,
    setApiError,
    isEditMode,
    resetForm,
    handleSubmit,
    getFieldError,
    // 模型工具验证相关
    isValidating,
    validationResult,
    performValidation,
    clearValidation,
  };
};