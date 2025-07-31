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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {models.map((model, index) => (
        <div 
          key={model.id}
          className="rounded-xl hover:border-theme-primary/30 hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group"
          style={{ backgroundColor: 'var(--color-card)' }}
        >
          {/* 卡片头部 */}
          <div className="p-6 flex-grow">
            {/* 模型名称和Logo */}
            <div className="flex items-center gap-4 mb-4 ">
              <ModelLogoComponent 
                modelName={model.family || model.base_model} 
                containerSize={56} 
                imageSize={32} 
              />
              
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-theme-foreground truncate group-hover:text-theme-primary transition-colors duration-300">
                  {model.display_name || model.base_model}
                </h3>
                <p className="text-sm text-theme-foreground-muted mt-1 truncate" title={model.base_model}>
                  {model.base_model}
                </p>
              </div>
            </div>
            
            {/* 描述 */}
            <div className="mb-4">
              <p className="text-sm text-theme-foreground-secondary line-clamp-2 min-h-[2.5rem]">
                {model.description || '暂无描述'}
              </p>
            </div>
            
            {/* 标签 */}
            <div className="flex flex-wrap gap-2">
              {model.tags && model.tags.length > 0 ? (
                model.tags.slice(0, 3).map((tag, index) => (
                  <span 
                    key={index} 
                    className="px-2 py-1 bg-theme-primary/10 text-theme-primary text-xs rounded-full flex items-center transition-colors duration-300"
                  >
                    <Tag className="w-3 h-3 mr-1"/>
                    {tag}
                  </span>
                ))
              ) : (
                <span className="px-2 py-1 bg-theme-background-tertiary text-theme-foreground-muted text-xs rounded-full flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1"/>
                  无标签
                </span>
              )}
              {model.tags && model.tags.length > 3 && (
                <span className="px-2 py-1 bg-theme-background-tertiary text-theme-foreground-muted text-xs rounded-full">
                  +{model.tags.length - 3}
                </span>
              )}
            </div>
          </div>
          
          {/* 卡片底部操作区 - 悬停显示 */}
          <div className="bg-theme-background-secondary/50 px-2 pb-5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out">
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
                className="flex items-center justify-center w-10 h-10 rounded-lg text-theme-foreground-muted hover:text-theme-primary transition-all duration-300"
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