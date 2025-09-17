'use client';

import { CustomModel } from '@/lib/database/custom-models';
import { SlidersHorizontal, Pencil, Trash2, Tag, ServerOff, AlertCircle, MessageCircle } from 'lucide-react';
import ModelLogoComponent from '@/app/model-manager/components/ModelLogo';

interface ModelListProps {
  models: CustomModel[];
  isLoading: boolean;
  onEdit: (model: CustomModel) => void;
  onDelete: (id: number) => void;
  onShowDetails: (model: CustomModel) => void;
  onStartChat: (model: CustomModel) => void;
}



export default function ModelList({ models, isLoading, onEdit, onDelete, onShowDetails, onStartChat }: ModelListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-theme-border border-t-theme-primary"></div>
          <p className="text-theme-foreground-muted">正在加载模型...</p>
        </div>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="text-center py-20 bg-theme-card rounded-xl border border-theme-border shadow-sm">
        <div className="flex flex-col items-center gap-4 px-6">
          <div className="w-20 h-20 bg-theme-background-secondary rounded-full flex items-center justify-center">
            <ServerOff className="w-10 h-10 text-theme-foreground-muted" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-theme-foreground mb-2">未找到任何模型</h3>
            <p className="text-theme-foreground-secondary max-w-md">
              尝试同步Ollama或调整搜索和过滤条件。您也可以创建自定义模型配置。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4 xl:gap-5">
      {models.map((model, index) => (
        <div 
          key={model.id}
          className="rounded-xl hover:border-theme-primary/30 hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group"
          style={{ backgroundColor: 'var(--color-card)' }}
        >
          {/* 卡片头部 */}
          <div className="p-5 xl:p-4 flex-grow">
            {/* 模型名称和Logo */}
            <div className="flex items-center gap-3 xl:gap-2 mb-4 xl:mb-3">
              <ModelLogoComponent 
                modelName={model.family || model.base_model} 
                containerSize={56} 
                imageSize={32}
                className="xl:w-12 xl:h-12"
              />
              
              <div className="flex-1 min-w-0">
                <h3 className="text-lg xl:text-base font-bold text-theme-foreground truncate group-hover:text-theme-primary transition-colors duration-300">
                  {model.display_name || model.base_model}
                </h3>
                <p className="text-sm xl:text-xs text-theme-foreground-muted mt-1 truncate" title={model.base_model}>
                  {model.base_model}
                </p>
              </div>
            </div>
                        
            {/* 标签 */}
            <div className="relative">
              <div 
                className="flex gap-2 overflow-hidden"
                ref={(el) => {
                  if (el && model.tags && model.tags.length > 0) {
                    // 检查是否需要显示+N
                    const containerWidth = el.offsetWidth;
                    const children = Array.from(el.children) as HTMLElement[];
                    let totalWidth = 0;
                    let visibleCount = 0;
                    
                    for (let i = 0; i < children.length; i++) {
                      const child = children[i];
                      if (child.classList.contains('tag-item')) {
                        totalWidth += child.offsetWidth + 8; // 8px for gap
                        if (totalWidth <= containerWidth - 60) { // 60px reserved for +N
                          visibleCount++;
                        } else {
                          break;
                        }
                      }
                    }
                    
                    // 更新显示状态
                    const hiddenCount = model.tags.length - visibleCount;
                    const plusElement = el.querySelector('.plus-indicator') as HTMLElement;
                    if (plusElement) {
                      if (hiddenCount > 0) {
                        plusElement.style.display = 'inline-flex';
                        plusElement.textContent = `+${hiddenCount}`;
                      } else {
                        plusElement.style.display = 'none';
                      }
                    }
                    
                    // 隐藏超出的标签
                    children.forEach((child, index) => {
                      if (child.classList.contains('tag-item')) {
                        if (index >= visibleCount) {
                          (child as HTMLElement).style.display = 'none';
                        } else {
                          (child as HTMLElement).style.display = 'inline-flex';
                        }
                      }
                    });
                  }
                }}
              >
                {model.tags && model.tags.length > 0 ? (
                  <>
                    {model.tags.map((tag, index) => (
                      <span 
                        key={index} 
                        className="tag-item px-2 py-1 bg-theme-primary text-theme-primary-foreground text-xs rounded transition-colors duration-300 flex-shrink-0"
                      >
                        {tag}
                      </span>
                    ))}
                    <span className="plus-indicator px-2 py-1 bg-theme-background-tertiary text-theme-foreground-muted text-xs rounded flex-shrink-0" style={{display: 'none'}}>
                    </span>
                  </>
                ) : (
                  <span className="px-2 py-1 bg-theme-background-tertiary text-theme-foreground-muted text-xs rounded flex items-center flex-shrink-0">
                    <AlertCircle className="w-3 h-3 mr-1"/>
                    无标签
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* 卡片底部操作区 - 悬停显示 */}
          <div className="bg-theme-background-secondary/50 px-2 pb-4 xl:pb-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out">
            <div className="flex items-center justify-evenly">
              {/* 开始对话按钮 */}
              <button
                onClick={() => onStartChat(model)}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-theme-foreground-muted hover:text-theme-success transition-all duration-300"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                }}
                title="开始对话"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              
              {/* 查看详情按钮 */}
              <button
                onClick={() => onShowDetails(model)}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-theme-foreground-muted hover:text-theme-info transition-all duration-300"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                }}
                title="查看详情"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
              
              {/* 编辑按钮 */}
              <button
                onClick={() => onEdit(model)}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-theme-foreground-muted hover:text-theme-warning transition-all duration-300"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                }}
                title="编辑"
              >
                <Pencil className="w-5 h-5" />
              </button>
              
              {/* 删除按钮 */}
              <button
                onClick={() => onDelete(model.id)}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-theme-foreground-muted hover:text-theme-error transition-all duration-300"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                }}
                title="删除"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}