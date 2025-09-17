'use client';

import { useState, useEffect } from 'react';
import { CustomModel } from '@/lib/database/custom-models';
import { X } from 'lucide-react';
import ModelLogo from '@/app/model-manager/components/ModelLogo';
import ModalWrapper from './ModalWrapper';
import { TextInput, TextArea, Button } from './FormComponents';

interface ModelFormProps {
  model: CustomModel | null;
  onSave: (id: number, data: Partial<Pick<CustomModel, 'display_name' | 'description' | 'tags'>>) => void;
  onCancel: () => void;
}

export default function ModelForm({ model, onSave, onCancel }: ModelFormProps) {
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (model) {
      setDisplayName(model.display_name || '');
      setDescription(model.description || '');
      setTags(model.tags || []);
    }
  }, [model]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!displayName.trim()) {
      newErrors.displayName = '显示名称不能为空';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }
    
    if (model) {
      onSave(model.id, {
        display_name: displayName,
        description: description,
        tags: tags,
      });
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = currentTag.trim();
      if (newTag && !tags.includes(newTag) && tags.length < 6) {
        setTags([...tags, newTag]);
        setCurrentTag('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  if (!model) return null;

  const modalIcon = (
    <ModelLogo 
      modelName={model.family || model.base_model}
      containerSize={56}
      imageSize={32}
      className="bg-theme-background-secondary rounded-2xl"
    />
  );

  return (
    <ModalWrapper
      isOpen={true}
      onClose={onCancel}
      title="编辑模型配置"
      subtitle={model.base_model}
      icon={modalIcon}
    >
      <div className="max-h-[90vh] overflow-hidden flex flex-col">
        {/* 内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-8 space-y-8">
          <div className="space-y-6">
            <h3 className="section-title !text-theme-foreground-muted">基本信息</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-theme-foreground block">
                模型别名
                <span className="text-theme-error ml-1">*</span>
              </label>
              <TextInput
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (errors.displayName) {
                    setErrors({...errors, displayName: ''});
                  }
                }}
                placeholder="为模型设置一个易于识别的别名"
                error={!!errors.displayName}
              />
              {errors.displayName && (
                <p className="text-sm text-theme-error">{errors.displayName}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-theme-foreground block">
                标签
              </label>
              <div className="relative">
                <div className="form-input-base min-h-[42px] flex flex-wrap items-center gap-1 p-2">
                  {tags.map((tag, index) => (
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
                    placeholder={tags.length === 0 ? "按回车或逗号添加标签，最多6个" : "添加标签..."}
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => {
                      const newTag = currentTag.trim();
                      if (newTag && !tags.includes(newTag) && tags.length < 6) {
                        setTags([...tags, newTag]);
                        setCurrentTag('');
                      }
                    }}
                    maxLength={20}
                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-theme-foreground placeholder-theme-foreground-muted"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作按钮 - 固定 */}
        <div className="p-8 flex justify-end gap-3 border-t border-theme-border">
          <Button variant="secondary" onClick={onCancel}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSave}>
            保存更改
          </Button>
        </div>
      </div>
    </ModalWrapper>
  );
}