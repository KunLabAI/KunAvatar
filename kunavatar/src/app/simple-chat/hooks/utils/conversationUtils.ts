/**
 * 对话相关的工具函数
 */

/**
 * 创建对话的配置选项
 */
export interface CreateConversationOptions {
  title?: string;
  model?: string | null;
  agentId?: number | null;
  autoSwitch?: boolean;
  updateUrl?: boolean;
}

/**
 * 消息格式化结果接口
 */
export interface FormattedMessagesResult {
  formattedMessages: any[];
  toolCallMessages: any[];
}

/**
 * 格式化数据库消息为前端显示格式
 * 统一处理工具调用消息和普通消息的格式转换
 * @param dbMessages 从数据库获取的原始消息数据
 * @returns 格式化后的消息和工具调用数据
 */
export function formatDatabaseMessages(dbMessages: any[]): FormattedMessagesResult {
  // 按时间戳和ID排序消息
  const allMessages = dbMessages.sort((a: any, b: any) => {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    return a.id - b.id;
  });
  
  const formattedMessages: any[] = [];
  const toolCallMessages: any[] = [];
  
  for (const msg of allMessages) {
    if (msg.role === 'tool_call' && msg.tool_name) {
      // 处理工具调用消息
      let args = {};
      let result = '';
      
      try {
        args = msg.tool_args ? JSON.parse(msg.tool_args) : {};
      } catch (e) {
        args = {};
      }
      
      try {
        result = msg.tool_result ? 
          (typeof msg.tool_result === 'string' ? msg.tool_result : JSON.stringify(msg.tool_result)) 
          : '';
      } catch (e) {
        result = msg.tool_result || '';
      }
      
      const toolCall = {
        id: `tool-${msg.id}`,
        toolName: msg.tool_name,
        args: args,
        status: msg.tool_status || 'completed',
        result: result,
        error: msg.tool_error || undefined,
        startTime: msg.timestamp || new Date(msg.created_at).getTime(),
        executionTime: msg.tool_execution_time || 0,
      };
      
      toolCallMessages.push(toolCall);
      
      formattedMessages.push({
        id: `tool-placeholder-${msg.id}`,
        role: 'tool_call' as any,
        content: '',
        timestamp: msg.timestamp || new Date(msg.created_at).getTime(),
        toolCall: toolCall,
      });
    } else {
      // 处理普通消息
      formattedMessages.push({
        id: `msg-${msg.id}`,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || new Date(msg.created_at).getTime(),
        model: msg.model,
        // 包含统计字段
        total_duration: msg.total_duration,
        load_duration: msg.load_duration,
        prompt_eval_count: msg.prompt_eval_count,
        prompt_eval_duration: msg.prompt_eval_duration,
        eval_count: msg.eval_count,
        eval_duration: msg.eval_duration,
      });
    }
  }
  
  return {
    formattedMessages,
    toolCallMessages,
  };
}

/**
 * 检测是否为智能体模式
 * 优先检查对话记录中的agent_id，因为URL参数在新建对话时可能不准确
 * @param currentConversation 当前对话对象
 * @returns 是否为智能体模式
 */
export function isAgentMode(currentConversation?: any): boolean {
  // 优先检查对话中的智能体ID（最可靠的标识）
  if (currentConversation?.agent_id) {
    return true;
  }
  
  // 其次检查URL参数（用于新建智能体对话）
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const hasAgentParam = urlParams.get('agent');
    return !!hasAgentParam;
  }
  
  return false;
}

/**
 * 生成新对话的标题
 * @returns 格式化的对话标题
 */
export function generateConversationTitle(): string {
  return `新对话 - ${new Date().toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`;
}

/**
 * 验证创建对话的参数
 * @param model 选中的模型
 * @param agentId 可选的智能体ID
 * @returns 验证结果和错误信息
 */// 验证对话是否可以开始聊天
export function validateConversationForChat(
  conversation: { model?: string | null; agent_id?: number | null }
): { isValid: boolean; error?: string } {
  // 检查是否选择了模型或智能体
  if (!conversation.model && !conversation.agent_id) {
    return {
      isValid: false,
      error: '请先选择一个模型或智能体才能开始对话'
    };
  }
  
  // 检查模型名称是否为空
  if (conversation.model && conversation.model.trim() === '') {
    return {
      isValid: false,
      error: '模型名称不能为空'
    };
  }
  
  return { isValid: true };
}

/**
 * 从智能体数据中获取关联的模型
 * @param agents 智能体列表
 * @param agentId 智能体ID
 * @param fallbackModel 备用模型
 * @returns 模型名称
 */
export function getModelFromAgent(
  agents: any[],
  agentId: number,
): string {
  const agent = agents.find(a => a.id === agentId);
  return agent?.model?.base_model || 'undefined';
}

/**
 * 创建对话后的通用处理逻辑
 * @param conversationId 新创建的对话ID
 * @param setMessages 设置消息的函数
 * @param setToolCalls 设置工具调用的函数
 * @param setError 设置错误的函数
 */
export function handleConversationCreated(
  conversationId: string | null,
  setMessages: (messages: any[]) => void,
  setToolCalls: (toolCalls: any[]) => void,
  setError: (error: string | null) => void
): void {
  if (conversationId) {
    setMessages([]);
    setToolCalls([]);
    setError(null);
    
    // 更新URL
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/simple-chat?id=${conversationId}`);
    }
  }
}