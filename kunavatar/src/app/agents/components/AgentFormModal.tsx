'use client';

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModelSelector } from '@/components/ModelSelector';
import { AlertCircle, Bot, X, Sparkles, RotateCcw, Trash2 } from 'lucide-react';
import {
  FormSection,
  FormInput,
  AvatarUpload,
  ServerToolSelector,
  MemorySettings,
  useAgentForm,
  AgentFormModalProps
} from './form-components';

const AgentFormModal: React.FC<AgentFormModalProps> = ({
  agent,
  onClose,
  onSave,
  availableModels,
  availableServers,
  allAvailableTools,
}) => {
  const {
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
    validationResult,
  } = useAgentForm({ agent, onSave, availableModels });
  
  // 关闭弹窗时的处理
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);
  
  // ESC键关闭弹窗
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose]);
  
  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-start z-50 p-4 pt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // 移除点击外部区域关闭弹窗的功能
      >
        <motion.div 
          className="bg-theme-background rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-theme-border"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -10 }}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-8 pb-6 border-b border-theme-border">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-theme-primary to-theme-accent flex items-center justify-center">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="page-title text-theme-foreground">
                  {isEditMode ? '编辑智能体' : '创建智能体'}
                </h2>
                <p className="text-theme-foreground-muted text-sm">
                  配置智能体的模型、工具和行为特征
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-theme-card hover:bg-theme-card-hover flex items-center justify-center text-theme-foreground-muted hover:text-theme-foreground transition-all duration-200 border border-theme-border"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 表单内容 */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-8 space-y-8">
            {/* 错误提示 */}
            {apiError && (
              <div className="flex items-start gap-3 p-4 bg-theme-error/10 border border-theme-error/20 text-theme-error rounded-lg">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">操作失败</p>
                  <p className="text-sm mt-1">{apiError}</p>
                </div>
              </div>
            )}
            
            {/* 基本信息 */}
            <FormSection title="基本信息">
              <div className="grid grid-cols-1 gap-6">
                <FormInput 
                  label="头像" 
                  error={getFieldError('avatar')}
                >
                  <AvatarUpload
                    currentAvatar={formData.avatar}
                    onAvatarChange={(avatar) => setFormData(prev => ({ ...prev, avatar }))}
                    agentName={formData.name}
                  />
                </FormInput>
                
                <FormInput 
                  label="智能体名称" 
                  required 
                  error={getFieldError('name')}
                >
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="form-input-base"
                    placeholder="such as: Lucy、Tifa Lockhart、2B..."
                  />
                </FormInput>
                
                <FormInput 
                  label="描述" 
                  error={getFieldError('description')}
                >
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="form-input-base h-20 resize-none"
                    placeholder="描述这个智能体的主要功能和使用场景..."
                  />
                </FormInput>
              </div>
            </FormSection>

            {/* 模型配置 */}
            <FormSection title="模型配置">
              <div className="grid grid-cols-1 gap-6">
                <FormInput 
                  label="搭载模型" 
                  required 
                  error={getFieldError('model_id')}
                >
                  <ModelSelector
                    models={availableModels.map(model => ({
                      name: model.base_model,
                      model: model.base_model,
                      modified_at: new Date().toISOString(),
                      size: 0,
                      digest: '',
                      details: {
                        parent_model: '',
                        format: '',
                        family: model.family || model.base_model,
                        families: [],
                        parameter_size: '',
                        quantization_level: '',
                      }
                    }))}
                    selectedModel={formData.model_id ? availableModels.find(m => m.id === formData.model_id)?.base_model || '' : ''}
                    onModelChange={(modelName: string) => {
                      const selectedModel = availableModels.find(m => m.base_model === modelName);
                      setFormData(prev => ({ ...prev, model_id: selectedModel?.id || null }));
                    }}
                    customModels={availableModels.map(m => ({
                      base_model: m.base_model,
                      display_name: m.display_name,
                      family: m.family
                    }))}
                  />
                  
                  {/* 模型工具兼容性验证状态 */}
                  {validationResult && (
                    <div className="mt-3">
                      <div className={`flex items-start gap-2 rounded-lg text-sm ${
                        validationResult.isValid 
                          ? 'bg-theme-success/10 border-theme-success/20 text-theme-success'
                          : 'bg-theme-warning/10 border-theme-warning/20 text-theme-warning'
                      }`}>
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                           {validationResult.isValid ? (
                             <span>{validationResult.message || '✅ 模型支持工具调用功能'}</span>
                           ) : (
                             <span>{validationResult.message}</span>
                           )}
                         </div>
                      </div>
                    </div>
                  )}
                </FormInput>
                

              </div>
            </FormSection>
            
            {/* 工具配置 */}
            <FormSection title="工具配置">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-theme-foreground block">
                      MCP服务器和工具
                    </label>
                    {(formData.server_ids.length > 0 || formData.tool_ids.length > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, server_ids: [], tool_ids: [] }));
                          setApiError(null);
                        }}
                        className="flex items-center gap-2 text-theme-error hover:bg-theme-error/10 "
                        title="清除所有选择"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div>
                  {availableServers.length > 0 ? (
                    <div className="space-y-4">
                      <ServerToolSelector
                        availableServers={availableServers}
                        allAvailableTools={allAvailableTools}
                        selectedServerIds={formData.server_ids}
                        selectedToolIds={formData.tool_ids}
                        onServerChange={(serverIds) => {
                          setFormData(prev => ({ ...prev, server_ids: serverIds }));
                        }}
                        onToolChange={(toolIds) => {
                          if (toolIds.length > 10) {
                            setApiError("最多只能选择10个工具");
                            return;
                          }
                          setApiError(null);
                          setFormData(prev => ({ ...prev, tool_ids: toolIds }));
                        }}
                        maxTools={10}
                        disabled={validationResult?.supportsTools === false}
                      />
                      {formData.tool_ids.length >= 10 && (
                        <p className="text-sm text-theme-warning flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          已达到最大工具数量限制
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-theme-background-tertiary rounded-lg">
                      <div className="flex items-center gap-2 text-theme-foreground-muted">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm">暂无可用的MCP服务器</p>
                      </div>
                    </div>
                  )}
                   </div>
                   {(formData.server_ids.length > 0 || formData.tool_ids.length > 0) && (
                     <p className="text-xs text-theme-foreground-muted">
                       已选择 {formData.server_ids.length} 个服务器，{formData.tool_ids.length}/10 个工具
                     </p>
                   )}
                 </div>
              </div>
            </FormSection>

            {/* 记忆设置 */}
            <MemorySettings
              memoryEnabled={memoryEnabled}
              onMemoryEnabledChange={setMemoryEnabled}
              memoryLoading={memoryLoading}
            />
          </div>

          {/* 底部操作 */}
          <div className="p-4 flex justify-between items-center border-t border-theme-border bg-theme-background-secondary">
            <div className="flex items-center gap-3">
              {!isEditMode && (
                <button
                  onClick={resetForm}
                  className="btn-base text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-background-secondary border border-theme-border px-4 py-2 flex items-center gap-2"
                  title="重置表单"
                >
                  <RotateCcw className="w-4 h-4" />
                  重置
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
               <button
                 onClick={handleClose}
                 className="btn-base btn-secondary px-6 py-3"
               >
                 取消
               </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="btn-base btn-primary px-6 py-3"
              >
                <Sparkles className="w-4 h-4" />
                {isSaving ? '保存中...' : (isEditMode ? '更新' : '创建')}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AgentFormModal;