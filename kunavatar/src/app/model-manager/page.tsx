'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CustomModel } from '@/lib/database/custom-models';
import { useI18n } from '@/contexts/I18nContext';
import ModelList from './components/ModelList';
import ModelForm from './components/ModelForm';
import ModelDetailsModal from './components/ModelDetailsModal';
import ModelfileForm, { ModelfileData } from './components/ModelfileForm';
import FileUploadModelForm, { FileUploadModelData } from './components/FileUploadModelForm';
import PullModelModal from './components/PullModelModal';
import { Loader, Code, Upload, RefreshCw, Download } from 'lucide-react';
import { useNotification } from '@/components/notification';
import Modal from '@/components/Modal';
import { Sidebar } from '../Sidebar';
import { PageLoading, InlineLoading } from '@/components/Loading';
import { useConversations } from '@/hooks/useConversations';
import { ProtectedRoute } from '@/components/ProtectedRoute';


function ModelManagerPageContent() {
  const { t } = useI18n();
  const [models, setModels] = useState<CustomModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showModelfileForm, setShowModelfileForm] = useState(false);
  const [showFileUploadForm, setShowFileUploadForm] = useState(false);
  const [showPullModelModal, setShowPullModelModal] = useState(false);
  const [editingModel, setEditingModel] = useState<CustomModel | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedModelForDetails, setSelectedModelForDetails] = useState<CustomModel | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState<'create' | 'update' | 'delete' | 'modelfile' | 'sync' | 'general'>('general');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<CustomModel | null>(null);


  // 使用路由进行客户端跳转
  const router = useRouter();

  // 使用新的通知系统
  const notification = useNotification();

  // 获取对话数据用于侧边栏
  const { conversations } = useConversations();

  // 同步模型
  const handleSyncModels = useCallback(async () => {
    try {
      setProcessingType('sync');
      setIsProcessing(true);
      await loadModels(true);
    } catch (error) {
      console.error(t('settings.models.messages.syncFailed') + ':', error);
      notification.error(t('settings.models.messages.syncFailed'), t('settings.models.messages.syncFailedDesc'));
    } finally {
      setIsProcessing(false);
    }
  }, [notification]);

  // 加载模型列表
  const loadModels = useCallback(async (forceSync = false) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');

      // 构建请求URL，根据需要添加同步参数
      const url = forceSync ? '/api/custom-models?sync=true' : '/api/custom-models';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setModels(data.models);
        
        if (forceSync && data.models.length > 0) {
          notification.success(t('settings.models.messages.syncSuccess'), t('settings.models.messages.syncSuccessDesc').replace('{count}', data.models.length.toString()));
        }
      } else {
        console.error(t('settings.models.messages.loadFailed') + ':', data.error);
        notification.error(t('settings.models.messages.loadFailed'), data.error);
      }
    } catch (error) {
      console.error(t('settings.models.messages.loadFailed') + ':', error);
      notification.error(t('settings.models.messages.networkError'), t('settings.models.messages.networkErrorDesc'));
    } finally {
      setIsLoading(false);
    }
  }, [notification]);

  // 创建新模型
  const handleCreateModel = async (id: number, modelData: Omit<CustomModel, 'id' | 'model_hash'>) => {
    try {
      setProcessingType('create');
      setIsProcessing(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/custom-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(modelData),
      });

      const data = await response.json();
      if (data.success) {
        setShowForm(false);
        setIsModalOpen(false);
        await loadModels();
        notification.success(t('settings.models.messages.createSuccess'), t('settings.models.messages.createSuccessDesc'));
      } else {
        throw new Error(data.message || t('settings.models.messages.createFailed'));
      }
    } catch (error) {
      console.error(t('settings.models.messages.createFailed') + ':', error);
      const message = error instanceof Error ? error.message : t('settings.models.messages.createFailed');
      notification.error(t('settings.models.messages.createFailed'), message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 更新模型
  const handleUpdateModel = async (id: number, modelData: Partial<CustomModel>) => {
    try {
      setProcessingType('update');
      setIsProcessing(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/custom-models/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(modelData),
      });

      const data = await response.json();
      if (data.success) {
        setShowForm(false);
        setEditingModel(null);
        setIsModalOpen(false);
        await loadModels();
        notification.success(t('settings.models.messages.updateSuccess'), t('settings.models.messages.updateSuccessDesc'));
      } else {
        throw new Error(data.message || t('settings.models.messages.updateFailed'));
      }
    } catch (error) {
      console.error(t('settings.models.messages.updateFailed') + ':', error);
      const message = error instanceof Error ? error.message : t('settings.models.messages.updateFailed');
      notification.error(t('settings.models.messages.updateFailed'), message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 删除模型
  const handleDeleteModel = (id: number) => {
    const model = models.find(m => m.id === id);
    if (!model) return;
    setModelToDelete(model);
    setDeleteModalOpen(true);
  };

  // 确认删除
  const confirmDeleteModel = async () => {
    if (!modelToDelete) return;
    
    // 立即关闭Modal，避免loading被覆盖
    setDeleteModalOpen(false);
    
    try {
      setProcessingType('delete');
      setIsProcessing(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/custom-models/${modelToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        await loadModels();
        notification.success(t('settings.models.messages.deleteSuccess'), t('settings.models.messages.deleteSuccessDesc'));
      } else {
        throw new Error(data.message || t('settings.models.messages.deleteFailed'));
      }
    } catch (error) {
      console.error(t('settings.models.messages.deleteFailed') + ':', error);
      const message = error instanceof Error ? error.message : t('settings.models.messages.deleteFailed');
      notification.error(t('settings.models.messages.deleteFailed'), message);
    } finally {
      setIsProcessing(false);
      setModelToDelete(null);
    }
  };

  // 编辑模型
  const handleEditModel = (model: CustomModel) => {
    setEditingModel(model);
    setIsModalOpen(true);
  };

  // 查看模型详情
  const handleShowDetails = (model: CustomModel) => {
    setSelectedModelForDetails(model);
    setIsDetailsModalOpen(true);
  };

  // 开始与模型对话
  const handleStartChat = (model: CustomModel) => {
    // 使用客户端路由跳转到聊天页面，避免页面重新加载导致的身份验证问题
    const modelName = model.base_model; // 使用base_model作为模型标识
    router.push(`/chat?new=true&model=${encodeURIComponent(modelName)}`);
  };

  // 处理 Modelfile 创建
  const handleCreateModelfile = async (modelfileData: ModelfileData) => {
    try {
      setProcessingType('modelfile');
      setIsProcessing(true);
      
      // 生成 Modelfile 内容
      let modelfile = `# Generated Modelfile for ${modelfileData.display_name}\n\n`;
      modelfile += `FROM ${modelfileData.base_model}\n\n`;
      
      if (modelfileData.system_prompt) {
        modelfile += `SYSTEM """${modelfileData.system_prompt}"""\n\n`;
      }
      
      // 添加参数（只包含有效的 Ollama 参数）
      const validParameters = ['temperature', 'top_p', 'top_k', 'repeat_penalty', 'num_ctx', 'num_predict', 'seed'];
      
      Object.entries(modelfileData.parameters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'stop' && validParameters.includes(key)) {
          modelfile += `PARAMETER ${key} ${value}\n`;
        }
      });
      
      if (modelfileData.parameters.stop && modelfileData.parameters.stop.length > 0) {
        modelfileData.parameters.stop.forEach(stopSeq => {
          modelfile += `PARAMETER stop "${stopSeq}"\n`;
        });
      }
      
      if (modelfileData.template) {
        modelfile += `TEMPLATE """${modelfileData.template}"""\n\n`;
      }
      
      if (modelfileData.license) {
        modelfile += `LICENSE """${modelfileData.license}"""\n`;
      }

      // 发送创建请求
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/models/create-modelfile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          modelName: modelfileData.display_name,
          modelfile: modelfile,
          metadata: {
            display_name: modelfileData.display_name,
            description: modelfileData.description,
            tags: modelfileData.tags
          }
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setShowModelfileForm(false);
        await loadModels();
        notification.success(t('settings.models.messages.modelfileCreateSuccess'), t('settings.models.messages.modelfileCreateSuccessDesc').replace('{modelName}', modelfileData.display_name));
      } else {
        throw new Error(data.message || t('settings.models.messages.createFailed'));
      }
    } catch (error) {
      console.error(t('settings.models.messages.modelfileCreateFailed') + ':', error);
      const message = error instanceof Error ? error.message : t('settings.models.messages.createFailed');
      notification.error(t('settings.models.messages.modelfileCreateFailed'), message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理拉取模型成功
  const handlePullModelSuccess = async (modelName: string) => {
    setShowPullModelModal(false);
    // 拉取成功后刷新模型列表
    await loadModels(true); // 强制同步以获取新拉取的模型
  };

  // 关闭表单弹窗
  const handleCloseModal = () => {
    setEditingModel(null);
    setIsModalOpen(false);
  };

  // 关闭详情弹窗
  const handleCloseDetailsModal = () => {
    setSelectedModelForDetails(null);
    setIsDetailsModalOpen(false);
  };

  useEffect(() => {
    loadModels(false); 
  }, []); 



  if (isLoading) {
    return (
      <div className="flex h-screen bg-theme-background">
        <Sidebar
          conversations={conversations}
        />
        <div className="flex-1 overflow-auto scrollbar-thin">
          <PageLoading 
            text={t('settings.models.loading')} 
            fullScreen={true}
          />
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-theme-background">
      {/* 侧边栏 */}
      <Sidebar
        conversations={conversations}
      />
      
      {/* 主内容区域 */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="min-h-screen bg-theme-background transition-all duration-300">
          {/* 页面头部 - 主标题副标题+操作区 */}
          <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div>
                    <h1 className="page-title">
                    {t('settings.models.title')}
                    </h1>          
                    
                    <p className="page-subtitle mt-2">
                      {t('settings.models.subtitle')} · {t('settings.models.modelCount').replace('{count}', models.length.toString())}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <button
                      onClick={handleSyncModels}
                      disabled={isLoading || (isProcessing && processingType === 'sync')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-theme-card text-theme-foreground rounded-lg hover:bg-theme-card-hover transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-4 h-4 ${(isProcessing && processingType === 'sync') ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">{(isProcessing && processingType === 'sync') ? t('settings.models.syncing') : t('settings.models.sync')}</span>
                    </button>
                    <button
                      onClick={() => setShowPullModelModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-theme-card text-theme-foreground rounded-lg hover:bg-theme-card-hover transition-colors duration-200 font-medium"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('settings.models.pull')}</span>
                    </button>
                    <button
                      onClick={() => setShowFileUploadForm(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-theme-card text-theme-foreground rounded-lg hover:bg-theme-card-hover transition-colors duration-200 font-medium"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('settings.models.upload')}</span>
                    </button>
                    <button
                      onClick={() => setShowModelfileForm(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors duration-200 font-medium"
                    >
                      <Code className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('settings.models.createModelfile')}</span>
                    </button>
                  </div>
                </div>
              </div>
            
            {/* 主要内容区域 */}
            <div className="space-y-6">
              {/* 处理状态指示器 */}
              {isProcessing && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[10000]">
                  <div className="bg-theme-card border border-theme-border rounded-lg px-4 py-2 shadow-lg">
                    <InlineLoading 
                      text={
                        processingType === 'delete' ? t('settings.models.processing.deleting') :
                        processingType === 'create' ? t('settings.models.processing.creating') :
                        processingType === 'update' ? t('settings.models.processing.updating') :
                        processingType === 'modelfile' ? t('settings.models.processing.creatingModelfile') :
                        t('settings.models.processing.processing')
                      }
                      size="small"
                    />
                  </div>
                </div>
              )}

              {/* 模型列表 */}
              <div className="space-y-6">
                <ModelList
                  models={models}
                  isLoading={isLoading}
                  onEdit={handleEditModel}
                  onDelete={handleDeleteModel}
                  onShowDetails={handleShowDetails}
                  onStartChat={handleStartChat}
                />
              </div>
            </div>

            {/* 拉取模型弹窗 */}
            {showPullModelModal && (
              <PullModelModal
                isOpen={showPullModelModal}
                onClose={() => setShowPullModelModal(false)}
                onSuccess={handlePullModelSuccess}
              />
            )}

            {/* 模型表单弹窗 */}
            {isModalOpen && (
              <ModelForm
                model={editingModel}
                onSave={(id, data) => editingModel ? handleUpdateModel(id, data) : handleCreateModel(id, data as Omit<CustomModel, 'id' | 'model_hash'>)}
                onCancel={handleCloseModal}
              />
            )}

            {/* Modelfile 创建表单 */}
            {showModelfileForm && (
              <ModelfileForm
                onSave={handleCreateModelfile}
                onCancel={() => setShowModelfileForm(false)}
              />
            )}

            {/* 文件上传创建模型表单 */}
            {showFileUploadForm && (
              <FileUploadModelForm
                onCancel={() => setShowFileUploadForm(false)}
                onSuccess={async (message) => {
                  setShowFileUploadForm(false);
                  // 文件上传成功后刷新模型列表
                  await loadModels();
                }}
              />
            )}

            {/* 模型详情弹窗 */}
            {isDetailsModalOpen && selectedModelForDetails && (
              <ModelDetailsModal
                model={selectedModelForDetails}
                onClose={handleCloseDetailsModal}
              />
            )}

            {/* 删除确认弹窗 */}
            <Modal
              open={deleteModalOpen}
              onClose={() => { setDeleteModalOpen(false); setModelToDelete(null); }}
              title={t('settings.models.deleteModal.title')}
              icon={<Loader className="w-6 h-6 text-theme-warning" />}
              actions={[
                {
                  label: t('settings.models.deleteModal.cancel'),
                  onClick: () => { setDeleteModalOpen(false); setModelToDelete(null); },
                  variant: 'secondary',
                },
                {
                  label: t('settings.models.deleteModal.confirm'),
                  onClick: confirmDeleteModel,
                  variant: 'danger',
                  autoFocus: true,
                },
              ]}
              width={380}
            >
              {modelToDelete && (
                <span>
                  {t('settings.models.deleteModal.content').replace('{modelName}', modelToDelete.display_name || modelToDelete.base_model)}
                </span>
              )}
            </Modal>
            </div>
          </main>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}

export default function ModelManagerPage() {
  return (
    <ProtectedRoute requiredPermission="models:read">
      <ModelManagerPageContent />
    </ProtectedRoute>
  );
}