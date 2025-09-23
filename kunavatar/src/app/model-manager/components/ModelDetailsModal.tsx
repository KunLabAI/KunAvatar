'use client';

import { CustomModel } from '@/lib/database/custom-models';
import { Info, Settings, Shield } from 'lucide-react';
import ModelLogo from '@/app/model-manager/components/ModelLogo';
import ModalWrapper from './ModalWrapper';
import { Button, FormSection } from './FormComponents';
import { formatTime } from '@/lib/utils/time';
import { useI18n } from '@/contexts/I18nContext';

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
  mono = false,
  t
}: { 
  label: string; 
  value: React.ReactNode;
  mono?: boolean;
  t: (key: string) => string;
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
      <div className="text-theme-foreground-muted text-sm italic">{t('settings.models.modelDetails.values.notSet')}</div>
    )}
  </div>
);

export default function ModelDetailsModal({ model, onClose }: ModelDetailsModalProps) {
  const { t } = useI18n();
  
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
              <h3 className="section-title !text-theme-foreground-muted">{t('settings.models.modelDetails.sections.basicInfo')}</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
                <div className="space-y-1">
                  <InfoRow label={t('settings.models.modelDetails.fields.modelAlias')} value={model.display_name} t={t} />
                  <InfoRow label={t('settings.models.modelDetails.fields.baseModel')} value={model.base_model} t={t} />
                  <InfoRow label={t('settings.models.modelDetails.fields.modelFamily')} value={model.family} t={t} />
                  <InfoRow label={t('settings.models.modelDetails.fields.architecture')} value={model.architecture || t('settings.models.modelDetails.values.unknown')} t={t} />
                  <InfoRow 
                    label={t('settings.models.modelDetails.fields.parameterScale')} 
                    value={model.parameter_count ? `${(model.parameter_count / 1e9).toFixed(1)}B` : t('settings.models.modelDetails.values.unknown')} 
                    t={t}
                  />
                  <InfoRow 
                    label={t('settings.models.modelDetails.fields.fileSize')} 
                    value={model.size ? formatFileSize(model.size) : t('settings.models.modelDetails.values.unknown')} 
                    t={t}
                  />
                </div>
                <div className="space-y-1">
                  <InfoRow 
                    label={t('settings.models.modelDetails.fields.contextLength')} 
                    value={model.context_length ? model.context_length.toLocaleString() : t('settings.models.modelDetails.values.unknown')} 
                    t={t}
                  />
                  <InfoRow 
                    label={t('settings.models.modelDetails.fields.embeddingLength')} 
                    value={model.embedding_length ? model.embedding_length.toLocaleString() : t('settings.models.modelDetails.values.unknown')} 
                    t={t}
                  />
                  <InfoRow 
                    label={t('settings.models.modelDetails.fields.quantizationLevel')} 
                    value={model.quantization_level || t('settings.models.modelDetails.values.unknown')} 
                    t={t}
                  />
                  <InfoRow 
                    label={t('settings.models.modelDetails.fields.fileFormat')} 
                    value={model.format || t('settings.models.modelDetails.values.unknown')} 
                    t={t}
                  />
                  <InfoRow 
                    label={t('settings.models.modelDetails.fields.modelCapabilities')} 
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
                    ) : t('settings.models.modelDetails.values.unknown')} 
                    t={t}
                  />
                  <InfoRow 
                    label={t('settings.models.modelDetails.fields.updateTime')} 
                    value={formatTime(model.updated_at || model.created_at)} 
                    t={t}
                  />
                  <InfoRow 
                    label={t('settings.models.modelDetails.fields.ollamaModifiedTime')} 
                    value={model.ollama_modified_at ? formatTime(model.ollama_modified_at) : t('settings.models.modelDetails.values.unknown')} 
                    t={t}
                  />
                </div>
              </div>
            </div>

            {/* 高级配置 */}
            <div>
              <h3 className="section-title !text-theme-foreground-muted">{t('settings.models.modelDetails.sections.advancedConfig')}</h3>
              <div className="space-y-4">
                <InfoRow 
                  label={t('settings.models.modelDetails.fields.systemPrompt')} 
                  value={model.system_prompt ? (
                    <pre className="whitespace-pre-wrap text-sm bg-theme-background-secondary px-4 py-3 rounded-xl border border-theme-border overflow-x-auto scrollbar-thin">
                      {model.system_prompt}
                    </pre>
                  ) : null} 
                  t={t}
                />
                <InfoRow 
                  label={t('settings.models.modelDetails.fields.modelParameters')} 
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
                  t={t}
                />
                <InfoRow 
                  label={t('settings.models.modelDetails.fields.template')} 
                  value={model.template ? (
                    <pre className="whitespace-pre-wrap text-sm bg-theme-background-secondary px-4 py-3 rounded-xl border border-theme-border overflow-x-auto scrollbar-thin font-mono">
                      {model.template}
                    </pre>
                  ) : null} 
                  t={t}
                />
              </div>
            </div>

            {/* 许可证 */}
            <div>
              <h3 className="section-title !text-theme-foreground-muted">{t('settings.models.modelDetails.sections.license')}</h3>
              <InfoRow 
                label={t('settings.models.modelDetails.fields.licenseInfo')} 
                value={model.license ? (
                  <pre className="whitespace-pre-wrap text-sm bg-theme-background-secondary px-4 py-3 rounded-xl border border-theme-border overflow-x-auto scrollbar-thin">
                    {model.license}
                  </pre>
                ) : null} 
                t={t}
              />
            </div>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}