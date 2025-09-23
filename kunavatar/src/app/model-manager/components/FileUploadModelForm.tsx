'use client';

import { useState } from 'react';
import { X, Folder, Zap, AlertCircle } from 'lucide-react';
import ModalWrapper from './ModalWrapper';
import { useNotification } from '@/components/notification';
import { useI18n } from '@/contexts/I18nContext';

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
  const { t } = useI18n();
  
  // 动态生成量化选项
  const getQuantizationOptions = () => [
    { value: '', label: t('settings.models.fileUploadForm.quantizationOptions.none') },
    { value: 'q4_K_M', label: t('settings.models.fileUploadForm.quantizationOptions.q4_K_M') },
    { value: 'q4_K_S', label: t('settings.models.fileUploadForm.quantizationOptions.q4_K_S') },
    { value: 'q8_0', label: t('settings.models.fileUploadForm.quantizationOptions.q8_0') }
  ];
  
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
      newErrors.display_name = t('settings.models.fileUploadForm.fields.modelAliasRequired');
    }

    // 验证文件路径
    if (formData.files.length === 0 || !formData.files[0].path) {
      newErrors.file_path = t('settings.models.fileUploadForm.fields.filePathRequired');
    } else {
      const filePath = formData.files[0].path;
      // 验证文件路径格式
      if (!filePath.match(/\.(gguf|bin)$/i)) {
        newErrors.file_path = t('settings.models.fileUploadForm.fields.fileFormatError');
      } else if (!filePath.match(/^[a-zA-Z]:|^\/|^\\\\|^\./)) {
        newErrors.file_path = t('settings.models.fileUploadForm.fields.filePathInvalid');
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
          title: t('settings.models.fileUploadForm.errors.validation.title'), 
          message: errorData.message || t('settings.models.fileUploadForm.errors.validation.message')
        };
        
      case 'name_conflict':
        return { 
          title: t('settings.models.fileUploadForm.errors.nameConflict.title'), 
          message: t('settings.models.fileUploadForm.errors.nameConflict.message')
        };
        
      case 'file_error':
        return { 
          title: t('settings.models.fileUploadForm.errors.fileError.title'), 
          message: errorData.message || t('settings.models.fileUploadForm.errors.fileError.message')
        };
        
      case 'ollama_not_found':
        return { 
          title: t('settings.models.fileUploadForm.errors.ollamaNotFound.title'), 
          message: t('settings.models.fileUploadForm.errors.ollamaNotFound.message')
        };
        
      case 'permission_error':
        return { 
          title: t('settings.models.fileUploadForm.errors.permissionError.title'), 
          message: t('settings.models.fileUploadForm.errors.permissionError.message')
        };
        
      case 'timeout_error':
        return { 
          title: t('settings.models.fileUploadForm.errors.timeoutError.title'), 
          message: t('settings.models.fileUploadForm.errors.timeoutError.message')
        };
        
      case 'storage_error':
        return { 
          title: t('settings.models.fileUploadForm.errors.storageError.title'), 
          message: t('settings.models.fileUploadForm.errors.storageError.message')
        };
        
      case 'command_error':
        return { 
          title: t('settings.models.fileUploadForm.errors.commandError.title'), 
          message: t('settings.models.fileUploadForm.errors.commandError.message')
        };
        
      case 'server_error':
        return { 
          title: t('settings.models.fileUploadForm.errors.serverError.title'), 
          message: t('settings.models.fileUploadForm.errors.serverError.message')
        };
        
      default:
        return { 
          title: t('settings.models.fileUploadForm.errors.default.title'), 
          message: errorData.message || t('settings.models.fileUploadForm.errors.default.message')
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
          t('settings.models.fileUploadForm.messages.createSuccess'), 
          t('settings.models.fileUploadForm.messages.createSuccessDesc').replace('{modelName}', formData.display_name)
        );
        if (onSuccess) {
          onSuccess(t('settings.models.fileUploadForm.messages.createSuccessShort').replace('{modelName}', formData.display_name));
        }
        
        return;
      } else {
        const errorInfo = getErrorMessage(result);
        notification.error(errorInfo.title, errorInfo.message);
      }
    } catch (error) {
      console.error('创建模型失败:', error);
      
      // 处理网络错误等异常
      const errorMessage = error instanceof Error ? error.message : t('errors.network');
      notification.error(
        t('settings.models.fileUploadForm.errors.networkError.title'), 
        t('settings.models.fileUploadForm.errors.networkError.message').replace('{error}', errorMessage)
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
      return t('settings.models.fileUploadForm.placeholders.windows');
    } else if (platform.includes('mac')) {
      return t('settings.models.fileUploadForm.placeholders.mac');
    } else {
      return t('settings.models.fileUploadForm.placeholders.linux');
    }
  };

  return (
    <ModalWrapper
      isOpen={true}
      onClose={onCancel}
      title={t('settings.models.fileUploadForm.title')}
      subtitle={t('settings.models.fileUploadForm.subtitle')}
      icon={modalIcon}
      maxWidth="2xl"
    >
      <div className="max-h-[90vh] overflow-hidden flex flex-col">
        {/* 内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-8 space-y-8">
          {/* 基本信息 */}
          <FormSection title={t('settings.models.fileUploadForm.basicInfo')}>
            <FormInput 
              label={t('settings.models.fileUploadForm.fields.modelAlias')} 
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
                placeholder={t('settings.models.fileUploadForm.fields.modelAliasPlaceholder')}
              />
              {errors.display_name && (
                <p className="mt-1 text-sm text-red-600">{errors.display_name}</p>
              )}
            </FormInput>
          </FormSection>

          {/* 文件选择 */}
          <FormSection title={t('settings.models.fileUploadForm.modelFile')}>
            <FormInput 
              label={t('settings.models.fileUploadForm.fields.ggufFilePath')} 
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
          <FormSection title={t('settings.models.fileUploadForm.advancedSettings')}>
            <FormInput label={t('settings.models.fileUploadForm.fields.quantization')} hint={t('settings.models.fileUploadForm.fields.quantizationHint')}>
              <select
                value={formData.quantize || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  quantize: e.target.value as any
                }))}
                className="form-input-base"
              >
                {getQuantizationOptions().map(option => (
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
              {t('settings.models.fileUploadForm.actions.cancel')}
            </button>
            <button 
              onClick={handleSave}
              disabled={isUploading || formData.files.length === 0}
              className="btn-base btn-primary px-6 py-3"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {t('settings.models.fileUploadForm.actions.creating')}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {t('settings.models.fileUploadForm.actions.createModel')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}