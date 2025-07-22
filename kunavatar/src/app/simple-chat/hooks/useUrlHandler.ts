'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CustomModel } from '@/lib/database/custom-models';
import { CreateConversationOptions, getModelFromAgent } from './utils/conversationUtils';

interface UseUrlHandlerProps {
  models: CustomModel[];
  selectedModel: string;
  currentConversation: any;
  conversationLoading: boolean;
  createConversation: (options: CreateConversationOptions | string, model?: string, agentId?: number) => Promise<string | null>;
  switchConversation: (id: string) => Promise<void>;
  setSelectedModel: (model: string) => void;
  agents: any[];
  selectedAgentId: number | null; // 🔥 添加智能体ID参数
}

export function useUrlHandler({
  models,
  selectedModel,
  currentConversation,
  conversationLoading,
  createConversation,
  switchConversation,
  setSelectedModel,
  agents,
  selectedAgentId,
}: UseUrlHandlerProps) {
  const searchParams = useSearchParams();
  const [isProcessingUrl, setIsProcessingUrl] = useState(false);
  const [currentUrlSearch, setCurrentUrlSearch] = useState('');
  
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
  
  // 监听URL变化
  useEffect(() => {
    const updateUrl = () => {
      setCurrentUrlSearch(window.location.search);
    };
    
    // 初始设置
    updateUrl();
    
    // 监听popstate事件（浏览器前进后退）
    window.addEventListener('popstate', updateUrl);
    
    return () => {
      window.removeEventListener('popstate', updateUrl);
    };
  }, []);
  
  // 模型参数处理 - 当models加载完成时立即处理
  useEffect(() => {
    // 直接从当前URL解析参数，确保获取最新状态
    const urlParams = new URLSearchParams(window.location.search);
    const modelParam = urlParams.get('model');
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
  }, [models]); // 当models加载完成时立即处理，URL变化会在主要处理逻辑中处理
  
  // 注意：智能体参数处理已移至 useAgentManager
  
  // 主要的URL处理逻辑
  useEffect(() => {
    const handleUrlChange = async () => {
      if (isProcessingUrl) return;
      
      const currentUrl = window.location.search;
      // 如果URL没有变化，不重复处理
      if (lastProcessedUrlRef.current === currentUrl) return;
      
      // 使用当前URL直接解析参数，避免searchParams的延迟更新问题
      const urlParams = new URLSearchParams(currentUrl);
      const shouldCreateNew = urlParams.get('new') === 'true';
      const conversationId = urlParams.get('id');
      const modelParam = urlParams.get('model');
      const agentParam = urlParams.get('agent');
      
      console.log('🔄 URL 变化检测:', {
        currentUrl,
        shouldCreateNew,
        conversationId,
        modelParam,
        agentParam,
        selectedAgentId,
        conversationLoading
      });
      
      // 如果正在加载对话，等待加载完成
      if (conversationLoading) {
        console.log('⏳ 对话正在加载中，等待加载完成...');
        return;
      }
      
      // 处理创建新对话的逻辑
      console.log('🔍 创建对话条件检查:', {
        shouldCreateNew,
        modelsLength: models.length,
        conversationLoading,
        hasAgentParam: !!agentParam,
        agentsLength: agents?.length || 0,
        condition: shouldCreateNew && models.length > 0 && !conversationLoading
      });
      
      if (shouldCreateNew && models.length > 0 && !conversationLoading) {
        console.log('🔄 准备创建新对话，当前URL:', currentUrl, '已处理URL:', lastProcessedUrlRef.current);
        
        // 检查是否有选中的模型或智能体
        const hasSelectedModel = selectedModel && selectedModel.trim() !== '';
        const hasSelectedAgent = selectedAgentId !== null;
        const hasAgentParam = agentParam && parseInt(agentParam) > 0;
        const hasModelParam = modelParam && modelParam.trim() !== '';
        
        console.log('🔍 状态检查 - hasSelectedModel:', hasSelectedModel, 'hasSelectedAgent:', hasSelectedAgent, 'hasAgentParam:', hasAgentParam, 'hasModelParam:', hasModelParam);
        
        // 如果有智能体参数，确保智能体数据已加载且智能体存在
        if (hasAgentParam) {
          if (!agents || agents.length === 0) {
            console.log('⚠️ 智能体数据尚未加载，等待智能体数据...');
            setIsProcessingUrl(false);
            return;
          }
          
          const agentIdToCheck = parseInt(agentParam);
          const agentExists = agents.some(agent => agent.id === agentIdToCheck);
          if (!agentExists) {
            console.log('❌ 指定的智能体不存在，ID:', agentIdToCheck);
            setIsProcessingUrl(false);
            return;
          }
        }
        
        // 🔥 修复：需要选择模型或智能体才能创建对话
        if (!hasSelectedModel && !hasSelectedAgent && !hasAgentParam && !hasModelParam) {
          console.log('⚠️ 无法创建对话：需要先选择模型或智能体');
          // 不标记URL已处理，允许用户选择模型后重新尝试
          setIsProcessingUrl(false);
          return;
        }
        
        // 标记当前URL已处理，防止重复处理
        lastProcessedUrlRef.current = currentUrl;
        setIsProcessingUrl(true);
        
        try {
          console.log('📝 开始创建对话 - 选中模型:', selectedModel, '选中智能体ID:', selectedAgentId);
          
          let conversationId: string | null = null;
          
          // 🔥 修复：优先处理当前选择的智能体
          if (hasSelectedAgent) {
            const agentIdToUse = selectedAgentId!;
            const agentModel = getModelFromAgent(agents || [], agentIdToUse);
            const modelToUse = selectedModel || agentModel;
            
            console.log('🤖 使用当前选择的智能体创建对话 - 智能体ID:', agentIdToUse, '智能体模型:', agentModel, '使用模型:', modelToUse);
            
            conversationId = await createConversationRef.current({
              model: modelToUse,
              agentId: agentIdToUse,
              updateUrl: false // URL会在下面统一处理
            });
          }
          // 如果URL中有智能体参数，使用URL智能体创建对话
          else if (hasAgentParam) {
            const agentIdToUse = parseInt(agentParam);
            const agentModel = getModelFromAgent(agents || [], agentIdToUse);
            const modelToUse = selectedModel || agentModel;
            
            console.log('🤖 使用URL智能体创建对话 - 智能体ID:', agentIdToUse, '智能体模型:', agentModel, '使用模型:', modelToUse);
            
            conversationId = await createConversationRef.current({
              model: modelToUse,
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
            const newUrl = `/simple-chat?id=${conversationId}`;
            window.history.pushState(null, '', newUrl);
            // 立即更新URL状态，触发重新处理
            setCurrentUrlSearch(`?id=${conversationId}`);
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
  }, [currentUrlSearch, models, conversationLoading, selectedModel, currentConversation, agents, isProcessingUrl, selectedAgentId]); // 使用currentUrlSearch监听URL变化

  return {
    isProcessingUrl,
    setIsProcessingUrl,
  };
}