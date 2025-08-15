'use client';

import { useState } from 'react';
import { X, Folder, Zap, AlertCircle } from 'lucide-react';
import ModalWrapper from './ModalWrapper';
import { useNotification } from '@/components/notification';

interface FileUploadModelFormProps {
  onSave?: (modelData: FileUploadModelData) => void;
  onCancel: () => void;
  onSuccess?: (message: string) => void;
}

export interface FileUploadModelData {
  display_name: string;
  files: FileUploadInfo[];
  model_type: 'gguf' | 'safetensors';
  upload_method: 'file_path';
  quantize?: 'q4_K_M' | 'q4_K_S' | 'q8_0' | '';
}

interface FileUploadInfo {
  file: File;
  name: string;
  size: number;
  path?: string;
  uploadStatus?: 'completed';
  uploadProgress?: number;
}

const QUANTIZATION_OPTIONS = [
  { value: '', label: '不量化' },
  { value: 'q4_K_M', label: 'Q4_K_M (推荐, 中等质量)' },
  { value: 'q4_K_S', label: 'Q4_K_S (小尺寸)' },
  { value: 'q8_0', label: 'Q8_0 (推荐, 高质量)' }
];

// 统一的表单区域组件
const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-6">
    <h3 className="section-title !text-theme-foreground-muted">{title}</h3>
    {children}
  </div>
);

// 统一的表单输入组件
const FormInput = ({ 
  label, 
  required = false,
  hint,
  children
}: { 
  label: string; 
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-theme-foreground block">
      {label}
      {required && <span className="text-theme-error ml-1">*</span>}
    </label>
    {children}
    {hint && (
      <p className="text-xs text-theme-foreground-muted">{hint}</p>
    )}
  </div>
);

export default function FileUploadModelForm({ onSave, onCancel, onSuccess }: FileUploadModelFormProps) {
  const [formData, setFormData] = useState<FileUploadModelData>({
    display_name: '',
    files: [],
    model_type: 'gguf',
    upload_method: 'file_path',
    quantize: '',
  });

  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<{
    display_name?: string;
    file_path?: string;
  }>({});
  const notification = useNotification();

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: { display_name?: string; file_path?: string } = {};
    
    // 验证模型名称
    if (!formData.display_name.trim()) {
      newErrors.display_name = '模型名称不能为空';
    }

    // 验证文件路径
    if (formData.files.length === 0 || !formData.files[0].path) {
      newErrors.file_path = '请输入有效的文件路径';
    } else {
      const filePath = formData.files[0].path;
      // 验证文件路径格式
      if (!filePath.match(/\.(gguf|bin)$/i)) {
        newErrors.file_path = '文件必须是 .gguf 或 .bin 格式';
      } else if (!filePath.match(/^[a-zA-Z]:|^\/|^\\\\|^\./)) {
        newErrors.file_path = '请输入有效的文件路径（绝对路径或相对路径）';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 根据错误类型生成用户友好的错误信息
  const getErrorMessage = (errorData: any): { title: string; message: string } => {
    const errorType = errorData.type || 'unknown';
    
    switch (errorType) {
      case 'validation':
        return { 
          title: '输入验证失败', 
          message: errorData.message || '请检查输入的信息是否正确' 
        };
        
      case 'name_conflict':
        return { 
          title: '模型名称冲突', 
          message: '模型名称已存在，请尝试使用不同的名称' 
        };
        
      case 'file_error':
        return { 
          title: '文件访问错误', 
          message: errorData.message || '无法访问指定的文件，请检查文件路径和权限' 
        };
        
      case 'ollama_not_found':
        return { 
          title: 'Ollama 未安装', 
          message: 'Ollama 未正确安装或配置，请先安装 Ollama 并确保其在系统 PATH 中' 
        };
        
      case 'permission_error':
        return { 
          title: '权限不足', 
          message: '权限不足，请以管理员身份运行或检查文件权限' 
        };
        
      case 'timeout_error':
        return { 
          title: '操作超时', 
          message: '操作超时，可能是文件过大导致的。请稍后重试或使用较小的文件' 
        };
        
      case 'storage_error':
        return { 
          title: '存储空间不足', 
          message: '磁盘空间不足，请清理磁盘空间后重试' 
        };
        
      case 'command_error':
        return { 
          title: 'Ollama 命令失败', 
          message: '模型创建命令执行失败，请检查文件格式是否正确' 
        };
        
      case 'server_error':
        return { 
          title: '服务器错误', 
          message: '服务器处理请求时发生错误，请稍后重试' 
        };
        
      default:
        return { 
          title: '创建失败', 
          message: errorData.message || '模型创建失败，请重试' 
        };
    }
  };

  // 保存模型
  const handleSave = async () => {
    if (!validateForm()) return;
    if (isUploading) return;

    try {
      setIsUploading(true);
      
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/models/create-modelfile-from-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        console.log('模型创建成功:', result.model);
        
        // 使用成功通知
        notification.success(
          '模型创建成功', 
          `模型 "${formData.display_name}" 已成功创建并添加到列表中`
        );
        if (onSuccess) {
          onSuccess(`模型 "${formData.display_name}" 创建成功！`);
        }
        
        return;
      } else {
        const errorInfo = getErrorMessage(result);
        notification.error(errorInfo.title, errorInfo.message);
      }
    } catch (error) {
      console.error('创建模型失败:', error);
      
      // 处理网络错误等异常
      notification.error(
        '网络错误', 
        `无法连接到服务器: ${error instanceof Error ? error.message : '请检查网络连接'}`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const modalIcon = (
    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-theme-primary to-theme-accent flex items-center justify-center">
      <Folder className="w-7 h-7 text-white" />
    </div>
  );

  // 根据操作系统生成占位符示例
  const getPlaceholderPath = (): string => {
    const platform = navigator.platform.toLowerCase();
    
    if (platform.includes('win')) {
      return '例如: D:\\Models\\your-model.gguf';
    } else if (platform.includes('mac')) {
      return '例如: /Users/yourname/Models/your-model.gguf';
    } else {
      return '例如: /home/yourname/models/your-model.gguf';
    }
  };

  return (
    <ModalWrapper
      isOpen={true}
      onClose={onCancel}
      title="从文件创建模型"
      subtitle="选择本地 GGUF 文件来创建自定义模型"
      icon={modalIcon}
      maxWidth="2xl"
    >
      <div className="max-h-[90vh] overflow-hidden flex flex-col">
        {/* 内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-8 space-y-8">
          {/* 基本信息 */}
          <FormSection title="基本信息">
            <FormInput 
              label="模型别名" 
              required 
            >
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, display_name: e.target.value }));
                  // 清除该字段的验证错误
                  if (errors.display_name) {
                    setErrors(prev => ({ ...prev, display_name: undefined }));
                  }
                }}
                className="form-input-base"
                placeholder="例如：我的自定义模型"
              />
              {errors.display_name && (
                <p className="mt-1 text-sm text-red-600">{errors.display_name}</p>
              )}
            </FormInput>
          </FormSection>

          {/* 文件选择 */}
          <FormSection title="模型文件">
            <FormInput 
              label="GGUF 文件路径" 
              required 
            >
              <input
                type="text"
                value={formData.files[0]?.path || ''}
                onChange={(e) => {
                  const path = e.target.value;
                  // 清除该字段的验证错误
                  if (errors.file_path) {
                    setErrors(prev => ({ ...prev, file_path: undefined }));
                  }
                  
                  if (path) {
                    const fileName = path.split(/[/\\]/).pop() || 'unknown';
                    const fileInfo: FileUploadInfo = {
                      file: {} as File,
                      name: fileName,
                      size: 0,
                      path: path,
                      uploadStatus: 'completed',
                      uploadProgress: 100
                    };
                    setFormData(prev => ({
                      ...prev,
                      files: [fileInfo]
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      files: []
                    }));
                  }
                }}
                className="form-input-base"
                placeholder={getPlaceholderPath()}
              />
              {errors.file_path && (
                <p className="mt-1 text-sm text-red-600">{errors.file_path}</p>
              )}

              {/* 显示选中的文件 */}
              {formData.files.length > 0 && (
                <div className="mt-3 p-3 bg-theme-background-secondary border border-theme-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Folder className="w-4 h-4 text-theme-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-theme-foreground truncate">
                        {formData.files[0].name}
                      </p>
                      <p className="text-xs text-theme-foreground-muted font-mono break-all">
                        {formData.files[0].path}
                      </p>
                    </div>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, files: [] }))}
                      className="p-1 text-theme-foreground-muted hover:text-theme-error transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </FormInput>
          </FormSection>

          {/* 高级设置 */}
          <FormSection title="高级设置">
            <FormInput label="量化选项" hint="量化可以减少模型大小但可能影响质量">
              <select
                value={formData.quantize || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  quantize: e.target.value as any
                }))}
                className="form-input-base"
              >
                {QUANTIZATION_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormInput>
          </FormSection>
        </div>

        {/* 底部操作按钮 - 固定 */}
        <div className="p-8 flex justify-end items-center border-t border-theme-border">
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isUploading}
              className="btn-base btn-secondary px-6 py-3"
            >
              取消
            </button>
            <button 
              onClick={handleSave}
              disabled={isUploading || formData.files.length === 0}
              className="btn-base btn-primary px-6 py-3"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  创建中...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  创建模型
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}