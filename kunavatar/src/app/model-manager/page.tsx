'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CustomModel } from '@/lib/database/custom-models';
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<CustomModel | null>(null);
  const [hasPermissionError, setHasPermissionError] = useState(false);

  // 使用路由进行客户端跳转
  const router = useRouter();

  // 使用新的通知系统
  const notification = useNotification();

  // 获取对话数据用于侧边栏
  const { conversations } = useConversations();

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
          notification.success('同步成功', `已同步 ${data.models.length} 个模型`);
        }
      } else {
        console.error('加载模型失败:', data.error);
        // 如果是权限不足错误，设置特殊状态而不是显示通知
        if (response.status === 403) {
          setHasPermissionError(true);
        } else {
          notification.error('加载模型列表失败', data.error);
        }
      }
    } catch (error) {
      console.error('加载模型失败:', error);
      notification.error('网络错误', '请检查网络连接后重试');
    } finally {
      setIsLoading(false);
    }
  }, [notification]);

  // 创建新模型
  const handleCreateModel = async (id: number, modelData: Omit<CustomModel, 'id' | 'model_hash'>) => {
    try {
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
        notification.success('模型创建成功', '新模型已添加到列表中');
      } else {
        throw new Error(data.message || '创建模型失败');
      }
    } catch (error) {
      console.error('创建模型失败:', error);
      const message = error instanceof Error ? error.message : '创建模型失败';
      notification.error('创建模型失败', message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 更新模型
  const handleUpdateModel = async (id: number, modelData: Partial<CustomModel>) => {
    try {
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
        notification.success('模型更新成功', '模型信息已保存');
      } else {
        throw new Error(data.message || '更新模型失败');
      }
    } catch (error) {
      console.error('更新模型失败:', error);
      const message = error instanceof Error ? error.message : '更新模型失败';
      notification.error('更新模型失败', message);
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
    try {
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
        notification.success('模型删除成功', '模型已从列表中移除');
      } else {
        throw new Error(data.message || '删除模型失败');
      }
    } catch (error) {
      console.error('删除模型失败:', error);
      const message = error instanceof Error ? error.message : '删除模型失败';
      notification.error('删除模型失败', message);
    } finally {
      setIsProcessing(false);
      setDeleteModalOpen(false);
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
        notification.success('Modelfile模型创建成功', `模型 "${modelfileData.display_name}" 已创建`);
      } else {
        throw new Error(data.message || '创建模型失败');
      }
    } catch (error) {
      console.error('创建 Modelfile 模型失败:', error);
      const message = error instanceof Error ? error.message : '创建模型失败';
      notification.error('创建Modelfile模型失败', message);
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

  // 如果有权限错误，显示权限不足页面
  if (hasPermissionError) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-theme-background">
          <Sidebar conversations={conversations} />
              <div className="mb-6">
                  <svg className="w-10 h-10 text-theme-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-theme-foreground mb-4">权限不足</h2>
              <p className="text-theme-foreground-muted mb-6">
                您没有访问模型管理功能的权限。请联系管理员为您分配相应的权限。
              </p>
              <div className="space-y-3">
                <p className="text-sm text-theme-foreground-muted">
                  需要权限：<span className="font-mono bg-theme-card px-2 py-1 rounded">models:read</span>
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors duration-200"
                >
                  返回首页
                </button>
              </div>
      </ProtectedRoute>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen bg-theme-background">
        <Sidebar
          conversations={conversations}
        />
        <div className="flex-1 overflow-auto scrollbar-thin">
          <PageLoading 
            text="loading..." 
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="page-title">
                    模型管理
                    </h1>          
                    
                    <p className="page-subtitle mt-2">
                      管理和配置 AI 模型 · 共 {models.length} 个模型
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-3">
                    <button
                      onClick={() => setShowPullModelModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme-border text-theme-foreground rounded-lg hover:bg-theme-card-hover transition-colors duration-200 font-medium"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">拉取模型</span>
                    </button>
                    <button
                      onClick={() => setShowFileUploadForm(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme-border text-theme-foreground rounded-lg hover:bg-theme-card-hover transition-colors duration-200 font-medium"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="hidden sm:inline">上传文件</span>
                    </button>
                    <button
                      onClick={() => setShowModelfileForm(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors duration-200 font-medium"
                    >
                      <Code className="w-4 h-4" />
                      <span className="hidden sm:inline">创建 Modelfile</span>
                    </button>
                  </div>
                </div>
              </div>
            
            {/* 主要内容区域 */}
            <div className="space-y-6">
              {/* 处理状态指示器 */}
              {isProcessing && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40">
                  <div className="bg-theme-card border border-theme-border rounded-lg px-4 py-2 shadow-lg">
                    <InlineLoading 
                      text="处理中..."
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
              title="确认删除模型"
              icon={<Loader className="w-6 h-6 text-theme-warning" />}
              actions={[
                {
                  label: '取消',
                  onClick: () => { setDeleteModalOpen(false); setModelToDelete(null); },
                  variant: 'secondary',
                },
                {
                  label: '确认删除',
                  onClick: confirmDeleteModel,
                  variant: 'danger',
                  autoFocus: true,
                },
              ]}
              width={380}
            >
              {modelToDelete && (
                <span>
                  确定要删除模型「<b>{modelToDelete.display_name || modelToDelete.base_model}</b>」吗？此操作不可撤销。
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
  return <ModelManagerPageContent />;
}