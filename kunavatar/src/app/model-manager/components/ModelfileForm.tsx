'use client';

import { useState, useEffect } from 'react';
import { X, Code, Eye, Sparkles, FileText, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OllamaModel } from '@/lib/ollama';
import { ModelSelector } from '@/components/ModelSelector';
import { SystemPromptEditor } from './SystemPromptEditor';

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
const PARAMETER_PRESETS = {
  creative: {
    name: '创意型',
    description: '更加创造性和多样化的回答',
    temperature: 1.0,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
    num_ctx: 4096,
    num_predict: -1,
  },
  balanced: {
    name: '平衡型', 
    description: '创造性和准确性的平衡',
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
    num_ctx: 4096,
    num_predict: -1,
  },
  precise: {
    name: '精确型',
    description: '更加准确和一致的回答',
    temperature: 0.3,
    top_p: 0.7,
    top_k: 20,
    repeat_penalty: 1.2,
    num_ctx: 4096,
    num_predict: -1,
  },
};

// 系统提示词模板
const SYSTEM_TEMPLATES = {
  assistant: {
    name: '通用助手',
    content: '你是一个有用、无害、诚实的AI助手。请用中文回答问题，提供准确和有帮助的信息。',
  },
  translator: {
    name: '翻译助手',
    content: '你是一个专业的翻译助手。请准确翻译用户提供的文本，保持原意不变，语言自然流畅。',
  },
  programmer: {
    name: '编程助手',
    content: '你是一个专业的编程助手。请提供清晰、准确的代码解答和技术建议。代码应该遵循最佳实践，并包含必要的注释。',
  },
};

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-6">
    <h3 className="section-title !text-theme-foreground-muted">{title}</h3>
    {children}
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
  const [formData, setFormData] = useState<ModelfileData>({
    display_name: '',
    base_model: '',
    system_prompt: '',
    template: '',
    license: '',
    parameters: PARAMETER_PRESETS.balanced,
    description: '',
    tags: [],
  });

  const [showPreview, setShowPreview] = useState(false);
  const [currentTag, setCurrentTag] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

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

  // 应用参数预设
  const applyParameterPreset = (presetKey: keyof typeof PARAMETER_PRESETS) => {
    setFormData(prev => ({
      ...prev,
      parameters: { ...PARAMETER_PRESETS[presetKey] }
    }));
  };

  // 应用系统提示词模板
  const applySystemTemplate = (templateKey: keyof typeof SYSTEM_TEMPLATES) => {
    setFormData(prev => ({
      ...prev,
      system_prompt: SYSTEM_TEMPLATES[templateKey].content
    }));
  };

  // 处理标签
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = currentTag.trim();
      if (newTag && !formData.tags?.includes(newTag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...(prev.tags || []), newTag]
        }));
      }
      setCurrentTag('');
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
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-start z-50 p-4 pt-8"
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
                  onClick={() => setShowPreview(!showPreview)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    showPreview 
                      ? 'bg-theme-primary text-white shadow-md' 
                      : 'bg-theme-card text-theme-foreground hover:bg-theme-card-hover border border-theme-border'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  预览
                </button>
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

                <FormInput label="描述">
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="form-input-base h-20 resize-none"
                    placeholder="描述此模型的功能和用途..."
                  />
                </FormInput>

                <FormInput label="标签" >
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      className="form-input-base"
                      placeholder="按回车或逗号添加标签"
                    />
                    {formData.tags && formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map(tag => (
                          <span 
                            key={tag}
                            className="tag-base tag-primary"
                          >
                            {tag}
                            <button 
                              onClick={() => removeTag(tag)}
                              className="text-theme-primary hover:text-theme-primary-hover transition-colors"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </FormInput>
              </FormSection>

              {/* 系统提示词 */}
              <FormSection title="系统提示词">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-theme-foreground mb-3 block">快速模板</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(SYSTEM_TEMPLATES).map(([key, template]) => (
                        <button
                          key={key}
                          onClick={() => applySystemTemplate(key as keyof typeof SYSTEM_TEMPLATES)}
                          className="p-3 text-left rounded-lg border border-theme-border bg-theme-card hover:bg-theme-card-hover transition-colors duration-200"
                        >
                          <div className="font-medium text-theme-foreground text-sm">{template.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <FormInput label="提示词内容" >
                    <SystemPromptEditor
                      value={formData.system_prompt || ''}
                      onChange={(value) => setFormData(prev => ({ ...prev, system_prompt: value }))}
                      placeholder="定义模型的角色和行为..."
                    />
                  </FormInput>
                </div>
              </FormSection>

              {/* 模型参数 */}
              <FormSection title="模型参数">
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-theme-foreground mb-3 block">参数预设</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {Object.entries(PARAMETER_PRESETS).map(([key, preset]) => (
                        <button
                          key={key}
                          onClick={() => applyParameterPreset(key as keyof typeof PARAMETER_PRESETS)}
                          className="p-4 text-left rounded-lg border border-theme-border bg-theme-card hover:bg-theme-card-hover transition-colors duration-200"
                        >
                          <div className="font-medium text-theme-foreground">{preset.name}</div>
                          <div className="text-sm text-theme-foreground-muted mt-1">{preset.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

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
                </div>
              </FormSection>

              {/* 高级设置 */}
              <FormSection title="高级设置">
                <FormInput label="对话模板" >
                  <textarea
                    value={formData.template}
                    onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
                    className="form-input-base h-24 resize-none font-mono text-sm"
                    placeholder={`{{ if .System }}<|im_start|>system\n{{ .System }}<|im_end|>\n{{ end }}{{ if .Prompt }}<|im_start|>user\n{{ .Prompt }}<|im_end|>\n{{ end }}<|im_start|>assistant`}
                  />
                </FormInput>

                <FormInput label="许可证" >
                  <textarea
                    value={formData.license}
                    onChange={(e) => setFormData(prev => ({ ...prev, license: e.target.value }))}
                    className="form-input-base h-20 resize-none"
                    placeholder="指定模型的许可证..."
                  />
                </FormInput>
              </FormSection>
            </div>

            {/* 底部操作 */}
            <div className="p-8 flex justify-between items-center border-t border-theme-border bg-theme-background-secondary">
              <button
                onClick={downloadModelfile}
                className="btn-base btn-secondary px-6 py-3"
              >
                <Download className="w-4 h-4" />
                下载 Modelfile
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="btn-base btn-secondary px-6 py-3"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="btn-base btn-primary px-6 py-3"
                >
                  <Sparkles className="w-4 h-4" />
                  创建模型
                </button>
              </div>
            </div>
          </div>

          {/* 右侧预览区域 */}
          {showPreview && (
            <motion.div 
              className="w-96 border-l border-theme-border bg-theme-background-secondary"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="p-6 border-b border-theme-border">
                <h3 className="card-title !text-theme-foreground-secondary flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Modelfile 预览
                </h3>
              </div>
              <div className="p-6 h-full overflow-y-auto scrollbar-thin">
                <pre className="text-sm font-mono text-theme-foreground whitespace-pre-wrap break-words">
                  {generateModelfile()}
                </pre>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}