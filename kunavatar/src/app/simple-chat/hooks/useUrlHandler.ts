'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CustomModel } from '@/lib/database/custom-models';
import { CreateConversationOptions } from './utils/conversationUtils';

interface UseUrlHandlerProps {
  models: CustomModel[];
  selectedModel: string;
  currentConversation: any;
  conversationLoading: boolean;
  createConversation: (options: CreateConversationOptions | string, model?: string, agentId?: number) => Promise<string | null>;
  switchConversation: (id: string) => Promise<void>;
  setSelectedModel: (model: string) => void;
  // 注意：智能体相关的 props 已移除，现在由 useAgentManager 统一管理
}

export function useUrlHandler({
  models,
  selectedModel,
  currentConversation,
  conversationLoading,
  createConversation,
  switchConversation,
  setSelectedModel,
}: UseUrlHandlerProps) {
  const searchParams = useSearchParams();
  const [isProcessingUrl, setIsProcessingUrl] = useState(false);
  
  // 使用ref存储函数引用，避免useEffect依赖问题
  const createConversationRef = useRef(createConversation);
  const switchConversationRef = useRef(switchConversation);
  const setSelectedModelRef = useRef(setSelectedModel);
  
  // 更新ref的值
  useEffect(() => {
    createConversationRef.current = createConversation;
    switchConversationRef.current = switchConversation;
    setSelectedModelRef.current = setSelectedModel;
  }, [createConversation, switchConversation, setSelectedModel]);

  // 添加一个ref来跟踪是否已经处理过当前URL
  const lastProcessedUrlRef = useRef('');
  

  
  // 添加一个ref来跟踪已处理的模型参数，避免重复处理
  const processedModelParamRef = useRef<string | null>(null);
  
  // 模型参数处理 - 当models加载完成时立即处理
  useEffect(() => {
    const modelParam = searchParams.get('model');
    console.log('🔍 模型选择useEffect触发 - modelParam:', modelParam, 'models.length:', models.length, 'URL:', window.location.href);
    
    if (modelParam && models.length > 0 && setSelectedModelRef.current) {
      const decodedModelParam = decodeURIComponent(modelParam);
      console.log('🔍 模型检查 - decodedModelParam:', decodedModelParam, 'processedModelParamRef.current:', processedModelParamRef.current);
      
      // 检查模型是否存在于模型列表中
      const modelExists = models.some(model => model.base_model === decodedModelParam || model.display_name === decodedModelParam);
      console.log('🔍 模型存在检查 - modelExists:', modelExists);
      
      // 使用ref来避免重复处理同一个模型参数
      if (modelExists && processedModelParamRef.current !== decodedModelParam) {
        console.log('🎯 模型列表加载完成，立即处理URL模型参数:', decodedModelParam);
        processedModelParamRef.current = decodedModelParam;
        
        // 立即设置选中的模型
        setSelectedModelRef.current(decodedModelParam);
        

        
        console.log('✅ 模型选择完成:', decodedModelParam);
      }
    }
  }, [models, searchParams]); // 当models加载完成时立即处理
  
  // 注意：智能体参数处理已移至 useAgentManager
  
  // 主要的URL处理逻辑
  useEffect(() => {
    const handleUrlChange = async () => {
      if (isProcessingUrl) return;
      
      const currentUrl = window.location.search;
      // 如果URL没有变化，不重复处理
      if (lastProcessedUrlRef.current === currentUrl) return;
      
      const shouldCreateNew = searchParams.get('new') === 'true';
      const conversationId = searchParams.get('id');
      const modelParam = searchParams.get('model');
      const agentParam = searchParams.get('agent');
      
      // 处理创建新对话的逻辑
      console.log('🔍 创建对话条件检查:', {
        shouldCreateNew,
        modelsLength: models.length,
        conversationLoading,
        hasAgentParam: !!agentParam,
        condition: shouldCreateNew && models.length > 0 && !conversationLoading
      });
      
      if (shouldCreateNew && models.length > 0 && !conversationLoading) {
        console.log('🔄 准备创建新对话，当前URL:', currentUrl, '已处理URL:', lastProcessedUrlRef.current);
        
        // 检查是否有选中的模型
        const hasSelectedModel = selectedModel && selectedModel.trim() !== '';
        const hasAgentParam = agentParam && parseInt(agentParam) > 0;
        const hasModelParam = modelParam && modelParam.trim() !== '';
        
        console.log('🔍 状态检查 - hasSelectedModel:', hasSelectedModel, 'hasAgentParam:', hasAgentParam, 'hasModelParam:', hasModelParam);
        
        if (!hasSelectedModel && !hasAgentParam && !hasModelParam) {
          console.log('⚠️ 无法创建对话：需要先选择模型');
          // 不标记URL已处理，允许用户选择模型后重新尝试
          setIsProcessingUrl(false);
          return;
        }
        
        // 标记当前URL已处理，防止重复处理
        lastProcessedUrlRef.current = currentUrl;
        setIsProcessingUrl(true);
        
        try {
          console.log('📝 开始创建对话 - 选中模型:', selectedModel);
          
          let conversationId: string | null = null;
          
          // 如果有URL中有智能体参数，使用智能体创建对话
          if (hasAgentParam) {
            const agentIdToUse = parseInt(agentParam);
            
            console.log('🤖 使用智能体创建对话 - 智能体ID:', agentIdToUse, '模型:', selectedModel || 'llama3.2');
            
            conversationId = await createConversationRef.current({
              model: selectedModel || 'llama3.2',
              agentId: agentIdToUse,
              updateUrl: false // URL会在下面统一处理
            });
          }
          // 如果有选中的模型或URL中有模型参数，使用模型创建对话
          else if (hasSelectedModel || hasModelParam) {
            const modelToUse = selectedModel || (hasModelParam ? decodeURIComponent(modelParam) : '');
            console.log('🎯 使用模型创建对话:', modelToUse);
            conversationId = await createConversationRef.current({
              model: modelToUse,
              updateUrl: false // URL会在下面统一处理
            });
          }
          
          // 统一处理URL更新
          if (conversationId && typeof window !== 'undefined') {
            window.history.pushState(null, '', `/simple-chat?id=${conversationId}`);
          }
          
          console.log('✅ 对话创建成功，ID:', conversationId);
        } catch (err) {
          console.error('创建对话失败:', err);
          throw new Error('创建对话失败');
        } finally {
          setIsProcessingUrl(false);
        }
      } 
      // 处理切换现有对话的逻辑
      else if (conversationId && !conversationLoading && !isProcessingUrl) {
        // 修复：添加更严格的条件检查，避免无限循环
        if (conversationId && (!currentConversation || currentConversation.id !== conversationId)) {
          // 标记当前URL已处理
          lastProcessedUrlRef.current = currentUrl;
          setIsProcessingUrl(true);
          try {
            await switchConversationRef.current(conversationId);
          } catch (err) {
            console.error('加载指定对话失败:', err);
            throw new Error('加载对话失败');
          } finally {
            setIsProcessingUrl(false);
          }
        }
      }
    };

    handleUrlChange().catch(error => {
      console.error('URL处理失败:', error);
    });
  }, [searchParams, models, conversationLoading, selectedModel, currentConversation]); // 添加必要的依赖项

  return {
    isProcessingUrl,
    setIsProcessingUrl,
  };
}