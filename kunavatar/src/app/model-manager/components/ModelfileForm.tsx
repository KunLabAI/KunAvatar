'use client';

import { useState, useEffect } from 'react';
import { X, Code, Sparkles, DiamondPlus, Download, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OllamaModel } from '@/lib/ollama';
import { ModelSelector } from '@/components/ModelSelector';
import { NoteSelector } from '@/components/NoteSelector';
import { usePromptOptimizeSettings } from '../../settings/hooks/usePromptOptimizeSettings';
import { useNotesForSelection } from '@/hooks/useNotes';


interface ModelfileFormProps {
  onSave: (modelfileData: ModelfileData) => void;
  onCancel: () => void;
  customModels?: Array<{
    base_model: string;
    display_name: string;
    family?: string;
  }>;
}

export interface ModelfileData {
  display_name: string;
  base_model: string;
  system_prompt?: string;
  template?: string;
  license?: string;
  parameters: {
    temperature: number;
    top_p: number;
    top_k: number;
    repeat_penalty: number;
    num_ctx: number;
    num_predict: number;
    seed?: number;
    stop?: string[];
  };
  description?: string;
  tags?: string[];
}

// 参数预设


// 笔记接口定义
interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-6">
    <h3 className="section-title !text-theme-foreground-muted">{title}</h3>
    {children}
  </div>
);

const CollapsibleFormSection = ({ 
  title, 
  children, 
  isCollapsed, 
  onToggle 
}: { 
  title: string; 
  children: React.ReactNode;
  isCollapsed: boolean;
  onToggle: () => void;
}) => (
  <div className="space-y-6">
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full text-left group"
    >
      <h3 className="section-title !text-theme-foreground-muted group-hover:text-theme-foreground transition-colors">{title}</h3>
      <ChevronDown 
        className={`w-5 h-5 text-theme-foreground-muted transition-transform duration-200 ${
          isCollapsed ? '' : 'rotate-180'
        }`} 
      />
    </button>
    <AnimatePresence>
      {!isCollapsed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const FormInput = ({ 
  label, 
  required = false, 
  error,
  hint,
  children
}: { 
  label: string; 
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-theme-foreground block">
      {label}
      {required && <span className="text-theme-error ml-1">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-sm text-theme-error">{error}</p>
    )}
    {hint && !error && (
      <p className="text-xs text-theme-foreground-muted">{hint}</p>
    )}
  </div>
);

export default function ModelfileForm({ onSave, onCancel, customModels = [] }: ModelfileFormProps) {
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  
  // 使用笔记选择hook
  const { notes, loading: isLoadingNotes } = useNotesForSelection();
  const [formData, setFormData] = useState<ModelfileData>({
    display_name: '',
    base_model: '',
    system_prompt: '',
    template: '',
    license: '',
    parameters: {
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
      repeat_penalty: 1.1,
      num_ctx: 4096,
      num_predict: -1,
    },
    description: '',
    tags: [],
  });

  const [showPreview, setShowPreview] = useState(false);
  const [currentTag, setCurrentTag] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isParametersCollapsed, setIsParametersCollapsed] = useState(true);
  const [isAdvancedCollapsed, setIsAdvancedCollapsed] = useState(true);
  const [isSystemPromptExpanded, setIsSystemPromptExpanded] = useState(false);
  const [isTemplateExpanded, setIsTemplateExpanded] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // 提示词优化设置
  const { settings } = usePromptOptimizeSettings();

  // 添加ESC键退出弹窗功能
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  // 加载可用模型列表
  useEffect(() => {
    const loadAvailableModels = async () => {
      try {
        setIsLoadingModels(true);
        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/custom-models', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        
        // 处理认证错误
        if (response.status === 401) {
          console.error('认证失败，请重新登录');
          // 可以在这里添加重定向到登录页面的逻辑
          return;
        }
        
        if (data.success && data.models) {
          // 从custom-models API获取可用的基础模型
          const uniqueModels = data.models
            .filter((model: any) => model.base_model)
            .map((model: any) => ({
              name: model.base_model,
              model: model.base_model,
              size: model.size || 0,
              modified_at: model.ollama_modified_at || new Date().toISOString(),
              digest: model.digest || '',
              details: {
                parent_model: '',
                format: model.format || '',
                family: model.family || model.base_model,
                families: [],
                parameter_size: model.parameter_count ? `${model.parameter_count}` : '',
                quantization_level: model.quantization_level || '',
              }
            }));
          
          // 去重
          const modelMap = new Map();
          uniqueModels.forEach((model: OllamaModel) => {
            modelMap.set(model.name, model);
          });
          
          const models = Array.from(modelMap.values());
          setAvailableModels(models);
          
          // 不自动选择第一个模型，保持空值让用户手动选择
        }
      } catch (error) {
        console.error('加载可用模型失败:', error);
      } finally {
        setIsLoadingModels(false);
      }
    };
    
    loadAvailableModels();
  }, []);

  // 提示词优化处理函数
  const handleOptimizePrompt = async () => {
    const textToOptimize = formData.system_prompt?.trim();
    if (!textToOptimize || isOptimizing) return;
    
    // 检查设置是否启用
    if (!settings.promptEnabled || !settings.promptModel) {
      alert('请先在设置中配置提示词优化功能');
      return;
    }
    
    setIsOptimizing(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/prompt-optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          text: textToOptimize,
          model: settings.promptModel,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '优化失败';
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '优化失败');
      }
      
      // 更新系统提示词内容
      setFormData(prev => ({ ...prev, system_prompt: data.optimizedText }));
    } catch (error) {
      console.error('优化提示词失败:', error);
      
      // 显示具体的错误信息
      const errorMessage = error instanceof Error ? error.message : '优化失败';
      alert(`提示词优化失败：${errorMessage}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  // 生成 Modelfile 内容
  const generateModelfile = () => {
    let modelfile = `# Generated Modelfile for ${formData.display_name}\n\n`;
    
    modelfile += `FROM ${formData.base_model}\n\n`;
    
    if (formData.system_prompt) {
      modelfile += `SYSTEM """${formData.system_prompt}"""\n\n`;
    }
    
    // 只包含有效的 Ollama 参数
    const validParameters = ['temperature', 'top_p', 'top_k', 'repeat_penalty', 'num_ctx', 'num_predict', 'seed'];
    
    Object.entries(formData.parameters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'stop' && validParameters.includes(key)) {
        modelfile += `PARAMETER ${key} ${value}\n`;
      }
    });
    
    if (formData.parameters.stop && formData.parameters.stop.length > 0) {
      formData.parameters.stop.forEach(stopSeq => {
        modelfile += `PARAMETER stop "${stopSeq}"\n`;
      });
    }
    
    if (Object.keys(formData.parameters).length > 0) {
      modelfile += '\n';
    }
    
    if (formData.template) {
      modelfile += `TEMPLATE """${formData.template}"""\n\n`;
    }
    
    if (formData.license) {
      modelfile += `LICENSE """${formData.license}"""\n`;
    }
    
    return modelfile;
  };

  // 验证表单
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.display_name.trim()) {
      newErrors.display_name = '模型别名不能为空';
    }
    
    if (!formData.base_model) {
      newErrors.base_model = '请选择基础模型';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };



  // 处理笔记选择
  const handleNoteChange = (noteId: string) => {
    setSelectedNoteId(noteId);
    if (noteId && noteId !== '') {
      const selectedNote = notes.find(note => note.id.toString() === noteId);
      if (selectedNote) {
        setFormData(prev => ({
          ...prev,
          system_prompt: selectedNote.content
        }));
      }
    }
  };

  // 处理标签
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = currentTag.trim();
      if (newTag && !formData.tags?.includes(newTag) && (formData.tags || []).length < 6) {
        setFormData(prev => ({
          ...prev,
          tags: [...(prev.tags || []), newTag]
        }));
        setCurrentTag('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  // 保存模型
  const handleSave = () => {
    if (!validateForm()) return;
    onSave(formData);
  };

  // 下载 Modelfile
  const downloadModelfile = () => {
    const content = generateModelfile();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.display_name || 'model'}.Modelfile`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="bg-theme-background rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] flex overflow-hidden border border-theme-border"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -10 }}
        >
          {/* 左侧表单区域 */}
          <div className="flex-1 flex flex-col">
            {/* 头部 */}
            <div className="flex items-center justify-between p-8 pb-6 border-b border-theme-border">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-theme-primary to-theme-accent flex items-center justify-center">
                  <Code className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="page-title text-theme-foreground">创建 Modelfile</h2>
                  <p className="text-theme-foreground-muted text-sm">基于 Ollama Modelfile 自定义模型</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onCancel}
                  className="w-10 h-10 rounded-full bg-theme-card hover:bg-theme-card-hover flex items-center justify-center text-theme-foreground-muted hover:text-theme-foreground transition-all duration-200 border border-theme-border"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 表单内容 */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-8 space-y-8">
              {/* 基本信息 */}
              <FormSection title="基本信息">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormInput 
                    label="模型别名" 
                    required 
                    error={errors.display_name}
                  >
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                      className="form-input-base"
                      placeholder="用户友好的显示名称，支持中文"
                    />
                  </FormInput>

                  <FormInput label="基础模型" required error={errors.base_model}>
                    {isLoadingModels ? (
                      <div className="form-input-base flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-theme-primary mr-2"></div>
                        <span className="text-theme-foreground-muted">加载模型列表...</span>
                      </div>
                    ) : (
                      <ModelSelector
                        models={availableModels}
                        selectedModel={formData.base_model}
                        onModelChange={(model: string) => setFormData(prev => ({ ...prev, base_model: model }))}
                        customModels={customModels}
                        disabled={isLoadingModels || availableModels.length === 0}
                        className={availableModels.length === 0 ? 'opacity-50' : ''}
                      />
                    )}
                  </FormInput>
                </div>

                <FormInput label="标签">
                  <div className="relative">
                    <div className="form-input-base min-h-[42px] flex flex-wrap items-center gap-1 p-2">
                      {formData.tags && formData.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-theme-primary text-theme-primary-foreground rounded text-xs">
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="hover:bg-theme-primary-hover rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder={(!formData.tags || formData.tags.length === 0) ? "按回车或逗号添加标签，最多6个" : "添加标签..."}
                        value={currentTag}
                        onChange={(e) => setCurrentTag(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        onBlur={() => {
                          const newTag = currentTag.trim();
                          if (newTag && !formData.tags?.includes(newTag) && (formData.tags?.length || 0) < 6) {
                            setFormData(prev => ({
                              ...prev,
                              tags: [...(prev.tags || []), newTag]
                            }));
                            setCurrentTag('');
                          }
                        }}
                        maxLength={20}
                        className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-theme-foreground placeholder-theme-foreground-muted"
                      />
                    </div>
                  </div>
                </FormInput>
              </FormSection>

              {/* 系统提示词 */}
              <FormSection title="系统提示词">
                <div className="space-y-4">
                  <FormInput label="选择笔记">
                    <NoteSelector
                      notes={notes}
                      selectedNoteId={selectedNoteId}
                      onNoteChange={handleNoteChange}
                      disabled={isLoadingNotes}
                      loading={isLoadingNotes}
                    />
                  </FormInput>

                  <FormInput label="提示词内容" >
                    <div className="relative">
                      <textarea
                        value={formData.system_prompt || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                        className="form-input-base resize-none"
                        style={{ 
                          maxHeight: isSystemPromptExpanded ? '60rem' : '8rem', 
                          minHeight: '8rem' 
                        }}
                        rows={isSystemPromptExpanded ? 60 : 8}
                        placeholder="定义模型的角色和行为..."
                      />
                      {/* 提示词优化按钮 */}
                      <button
                        type="button"
                        onClick={handleOptimizePrompt}
                        disabled={!formData.system_prompt?.trim() || isOptimizing || !settings.promptEnabled || !settings.promptModel}
                        className="absolute top-4 right-14 p-1 rounded bg-theme-card hover:bg-theme-card-hover text-theme-foreground-muted hover:text-theme-foreground transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          isOptimizing 
                            ? "正在优化..." 
                            : !formData.system_prompt?.trim() 
                            ? "请先输入提示词内容" 
                            : !settings.promptEnabled || !settings.promptModel
                            ? "请先在设置中配置提示词优化"
                            : "优化当前提示词"
                        }
                      >
                        {isOptimizing ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </button>
                      {/* 展开/收起按钮 */}
                      <button
                        type="button"
                        onClick={() => setIsSystemPromptExpanded(!isSystemPromptExpanded)}
                        className="absolute top-4 right-4 p-1 rounded bg-theme-card hover:bg-theme-card-hover text-theme-foreground-muted hover:text-theme-foreground transition-colors z-10"
                        title={isSystemPromptExpanded ? '收起' : '展开'}
                      >
                        {isSystemPromptExpanded ? (
                          <Minimize2 className="w-4 h-4" />
                        ) : (
                          <Maximize2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </FormInput>
                </div>
              </FormSection>

              {/* 模型参数 */}
              <CollapsibleFormSection 
                title="模型参数" 
                isCollapsed={isParametersCollapsed}
                onToggle={() => setIsParametersCollapsed(!isParametersCollapsed)}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          <FormInput label="Temperature" hint="创造性程度 (0.0-2.0)">
                        <input
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          value={formData.parameters.temperature}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            parameters: { ...prev.parameters, temperature: parseFloat(e.target.value) }
                          }))}
                          className="form-input-base"
                        />
                    </FormInput>

                    <FormInput label="Top P" hint="核心采样 (0.0-1.0)">
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={formData.parameters.top_p}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          parameters: { ...prev.parameters, top_p: parseFloat(e.target.value) }
                        }))}
                        className="form-input-base"
                      />
                    </FormInput>

                    <FormInput label="Top K" hint="候选词数量 (1-100)">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.parameters.top_k}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          parameters: { ...prev.parameters, top_k: parseInt(e.target.value) }
                        }))}
                        className="form-input-base"
                      />
                    </FormInput>

                    <FormInput label="重复惩罚" hint="防止重复 (0.0-2.0)">
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={formData.parameters.repeat_penalty}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          parameters: { ...prev.parameters, repeat_penalty: parseFloat(e.target.value) }
                        }))}
                        className="form-input-base"
                      />
                    </FormInput>

                    <FormInput label="上下文长度" hint="上下文窗口大小">
                      <input
                        type="number"
                        min="512"
                        max="32768"
                        step="512"
                        value={formData.parameters.num_ctx}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          parameters: { ...prev.parameters, num_ctx: parseInt(e.target.value) }
                        }))}
                        className="form-input-base"
                      />
                    </FormInput>

                    <FormInput label="最大生成数" hint="-1 为无限制">
                      <input
                        type="number"
                        min="-1"
                        value={formData.parameters.num_predict}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          parameters: { ...prev.parameters, num_predict: parseInt(e.target.value) }
                        }))}
                        className="form-input-base"
                      />
                    </FormInput>
                  </div>
              </CollapsibleFormSection>

              {/* 高级设置 */}
              <CollapsibleFormSection 
                title="高级设置" 
                isCollapsed={isAdvancedCollapsed}
                onToggle={() => setIsAdvancedCollapsed(!isAdvancedCollapsed)}
              >
                <FormInput label="对话模板" >
                  <div className="relative">
                    <textarea
                      value={formData.template}
                      onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
                      className="form-input-base resize-none font-mono text-sm"
                      style={{ 
                        height: isTemplateExpanded ? '60rem' : '10rem',
                        minHeight: '10rem'
                      }}
                      rows={isTemplateExpanded ? 60 : 6}
                      placeholder={`{{ if .System }}<|im_start|>system
{{ .System }}<|im_end|>
{{ end }}{{ if .Prompt }}<|im_start|>user
{{ .Prompt }}<|im_end|>
{{ end }}<|im_start|>assistant
{{ .Response }}<|im_end|>
`}
                    />
                    
                    <button
                      type="button"
                      onClick={() => setIsTemplateExpanded(!isTemplateExpanded)}
                      className="absolute top-4 right-4 p-1 rounded bg-theme-card hover:bg-theme-card-hover text-theme-foreground-muted hover:text-theme-foreground transition-colors z-10"
                      title={isTemplateExpanded ? '收起' : '展开'}
                    >
                      {isTemplateExpanded ? (
                        <Minimize2 className="w-4 h-4" />
                      ) : (
                        <Maximize2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </FormInput>

                <FormInput label="许可证">
                  <textarea
                    value={formData.license || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, license: e.target.value }))}
                    className="form-input-base resize-none"
                    rows={4}
                    placeholder="请输入许可证信息..."
                  />
                </FormInput>
              </CollapsibleFormSection>
            </div>

            {/* 预览区域 */}
            {showPreview && (
              <div className="border-t border-theme-border bg-theme-background-subtle">
                <div className="p-8 space-y-4">
                  <h3 className="section-title !text-theme-foreground-muted">Modelfile 预览</h3>
                  <div className="bg-theme-background border border-theme-border rounded-lg p-4 font-mono text-sm text-theme-foreground whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {generateModelfile()}
                  </div>
                </div>
              </div>
            )}

            {/* 底部操作按钮 - 固定 */}
            <div className="p-8 flex justify-between items-center border-t border-theme-border">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="btn-base btn-secondary px-4 py-2"
                >
                  {showPreview ? '隐藏预览' : '预览 Modelfile'}
                </button>
                <button
                  onClick={downloadModelfile}
                  disabled={!formData.display_name.trim()}
                  className="btn-base btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  下载 Modelfile
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="btn-base btn-secondary px-6 py-3"
                >
                  取消
                </button>
                <button 
                  onClick={handleSave}
                  disabled={!formData.display_name.trim()}
                  className="btn-base btn-primary px-6 py-3"
                >
                  <DiamondPlus className="w-4 h-4" />
                  创建模型
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}