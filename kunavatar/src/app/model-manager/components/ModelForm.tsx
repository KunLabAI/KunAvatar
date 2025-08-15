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
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setCurrentTag('');
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
                描述
              </label>
              <TextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="简单描述一下模型的特点和用途..."
              />
              <p className="text-xs text-theme-foreground-muted">选填：描述模型的主要用途和特点</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-theme-foreground block">
                标签
              </label>
              <div className="bg-theme-background border-2 border-theme-border rounded-2xl p-4 focus-within:border-theme-primary transition-all duration-200 hover:border-theme-primary/50">
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((tag) => (
                      <div 
                        key={tag} 
                        className="inline-flex items-center gap-2 bg-theme-primary text-white text-sm px-3 py-2 rounded-full"
                      >
                        <span>{tag}</span>
                        <button 
                          onClick={() => removeTag(tag)} 
                          className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-0.5 transition-colors duration-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={tags.length === 0 ? "输入标签后按回车添加..." : "继续添加标签..."}
                  className="w-full bg-transparent outline-none text-theme-foreground placeholder-theme-foreground-muted"
                />
              </div>
              <p className="text-xs text-theme-foreground-muted">按回车或逗号添加标签，便于分类和搜索</p>
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