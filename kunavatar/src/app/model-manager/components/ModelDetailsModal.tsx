'use client';

import { CustomModel } from '@/lib/database/custom-models';
import { Info, Settings, Shield } from 'lucide-react';
import ModelLogo from '@/app/model-manager/components/ModelLogo';
import ModalWrapper from './ModalWrapper';
import { Button, FormSection } from './FormComponents';

interface ModelDetailsModalProps {
  model: CustomModel | null;
  onClose: () => void;
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const InfoRow = ({ 
  label, 
  value, 
  mono = false
}: { 
  label: string; 
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="py-3">
    <div className="text-sm font-medium text-theme-foreground-muted mb-2">
      {label}
    </div>
    {value ? (
      <div className={`text-theme-foreground ${mono ? 'font-mono text-sm' : ''} ${
        mono ? 'bg-theme-background-secondary px-4 py-3 rounded-xl text-xs break-all' : ''
      }`}>
        {value}
      </div>
    ) : (
      <div className="text-theme-foreground-muted text-sm italic">未设置</div>
    )}
  </div>
);

export default function ModelDetailsModal({ model, onClose }: ModelDetailsModalProps) {
  if (!model) return null;

  const modalIcon = (
    <ModelLogo 
      modelName={model.family || model.base_model}
      containerSize={56}
      imageSize={32}
      className="bg-theme-background-secondary rounded-2xl"
    />
  );

  const headerContent = (
    <div className="flex flex-wrap gap-2 mt-3">
      {model.tags && model.tags.length > 0 && model.tags.map((tag, index) => (
        <span 
          key={index} 
          className="inline-flex items-center gap-1 px-2 py-1 bg-theme-primary text-white text-xs rounded-md shadow-sm"
        >
          {tag}
        </span>
      ))}
    </div>
  );

  return (
    <ModalWrapper
      isOpen={true}
      onClose={onClose}
      title={model.display_name}
      subtitle={model.base_model}
      maxWidth="4xl"
      icon={modalIcon}
    >
      <div className="flex flex-col h-full min-h-0">
        {/* 标签显示 */}
        <div className="flex-shrink-0 px-8 pb-4">
          {headerContent}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 px-8 pb-8 overflow-y-auto scrollbar-thin">
          <div className="space-y-10">
            {/* 基本信息 */}
            <div>
              <h3 className="section-title !text-theme-foreground-muted mb-6">基本信息</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
                <div className="space-y-1">
                  <InfoRow label="模型别名" value={model.display_name} />
                  <InfoRow label="基础模型" value={model.base_model} />
                  <InfoRow label="模型家族" value={model.family} />
                  <InfoRow label="架构" value={model.architecture || '未知'} />
                  <InfoRow 
                    label="参数规模" 
                    value={model.parameter_count ? `${(model.parameter_count / 1e9).toFixed(1)}B` : '未知'} 
                  />
                  <InfoRow 
                    label="文件大小" 
                    value={model.size ? formatFileSize(model.size) : '未知'} 
                  />
                </div>
                <div className="space-y-1">
                  <InfoRow 
                    label="上下文长度" 
                    value={model.context_length ? model.context_length.toLocaleString() : '未知'} 
                  />
                  <InfoRow 
                    label="嵌入长度" 
                    value={model.embedding_length ? model.embedding_length.toLocaleString() : '未知'} 
                  />
                  <InfoRow 
                    label="量化级别" 
                    value={model.quantization_level || '未知'} 
                  />
                  <InfoRow 
                    label="文件格式" 
                    value={model.format || '未知'} 
                  />
                  <InfoRow 
                    label="模型能力" 
                    value={model.capabilities && model.capabilities.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {model.capabilities.map((capability, index) => (
                          <span 
                            key={index} 
                            className="inline-flex items-center gap-1 px-2 py-1 bg-theme-primary text-white text-xs rounded-md shadow-sm"
                          >
                            {capability}
                          </span>
                        ))}
                      </div>
                    ) : '未知'} 
                  />
                  <InfoRow 
                    label="更新时间" 
                    value={model.updated_at ? new Date(model.updated_at).toLocaleString('zh-CN') : new Date(model.created_at).toLocaleString('zh-CN')} 
                  />
                  <InfoRow 
                    label="Ollama修改时间" 
                    value={model.ollama_modified_at ? new Date(model.ollama_modified_at).toLocaleString('zh-CN') : '未知'} 
                  />
                </div>
              </div>
              
              {/* 模型描述 */}
              <div className="mt-4">
                <InfoRow 
                  label="模型描述" 
                  value={model.description ? (
                    <div 
                      className="text-theme-foreground leading-relaxed text-sm"
                    >
                      {model.description}
                    </div>
                  ) : null} 
                />
              </div>
            </div>

            {/* 高级配置 */}
            <div>
              <h3 className="section-title !text-theme-foreground-muted mb-6">高级配置</h3>
              <div className="space-y-4">
                <InfoRow 
                  label="系统提示" 
                  value={model.system_prompt ? (
                    <pre className="whitespace-pre-wrap text-sm bg-theme-background-secondary px-4 py-3 rounded-xl border border-theme-border overflow-x-auto scrollbar-thin">
                      {model.system_prompt}
                    </pre>
                  ) : null} 
                />
                <InfoRow 
                  label="模型参数" 
                  value={model.parameters && Object.keys(model.parameters).length > 0 ? (
                    <div className="bg-theme-background-secondary px-4 py-3 rounded-xl border border-theme-border space-y-2">
                      {Object.entries(model.parameters).map(([key, value]) => {
                        const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                        return (
                          <div key={key} className="flex justify-between items-center text-sm">
                            <span className="font-medium text-theme-foreground-muted">{key}:</span>
                            <span className="font-mono text-theme-foreground">{displayValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null} 
                />
                <InfoRow 
                  label="模板" 
                  value={model.template ? (
                    <pre className="whitespace-pre-wrap text-sm bg-theme-background-secondary px-4 py-3 rounded-xl border border-theme-border overflow-x-auto scrollbar-thin font-mono">
                      {model.template}
                    </pre>
                  ) : null} 
                />
              </div>
            </div>

            {/* 许可证 */}
            <div>
              <h3 className="section-title !text-theme-foreground-muted mb-6">许可证</h3>
              <InfoRow 
                label="许可证信息" 
                value={model.license ? (
                  <pre className="whitespace-pre-wrap text-sm bg-theme-background-secondary px-4 py-3 rounded-xl border border-theme-border overflow-x-auto scrollbar-thin">
                    {model.license}
                  </pre>
                ) : null} 
              />
            </div>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}