/**
 * 模型Logo映射工具模块
 * 提供统一的模型logo映射和处理功能
 */

// 模型logo映射配置
const MODEL_LOGO_MAPPING: Record<string, string> = {
  // Meta/LLaMA系列
  'llama': 'Meta_icon.svg',
  'meta': 'Meta_icon.svg',
  
  // 通义千问系列
  'qwen': 'Qwen_icon.svg',
  
  // Google Gemma系列
  'gemma': 'Gemma_icon.svg',
  
  // Mistral系列
  'mistral': 'Mistral_icon.svg',
  
  // Microsoft Phi系列
  'phi': 'Phi_icon.svg',
  
  // DeepSeek系列
  'deepseek': 'Deepseek_icon.svg',
  
  // Cohere系列
  'cohere': 'Cohere_icon.svg',
  
  // LLaVA系列
  'llava': 'LLaVA_icon.svg',
  
  // NVIDIA系列
  'nvidia': 'Nvidia_icon.svg',
  
  // ModelScope系列
  'modelscope': 'Modelscope_icon.svg',
  
  // HuggingFace系列
  'huggingface': 'Huggingface_icon.svg',
  'hf': 'Huggingface_icon.svg',
  
  // Ollama系列
  'ollama': 'Ollama_icon.svg',
};

// 默认图标
const DEFAULT_ICON = 'DefaultIcon.svg';

/**
 * 根据模型名称获取对应的logo图标文件名
 * @param modelName 模型名称或家族名称
 * @returns logo图标文件名
 */
export function getModelIconFile(modelName: string): string {
  if (!modelName) return DEFAULT_ICON;
  
  const lowerModelName = modelName.toLowerCase();
  
  // 遍历映射配置，找到匹配的图标
  for (const [key, iconFile] of Object.entries(MODEL_LOGO_MAPPING)) {
    if (lowerModelName.includes(key)) {
      return iconFile;
    }
  }
  
  return DEFAULT_ICON;
}

/**
 * 获取模型logo的完整路径
 * @param modelName 模型名称或家族名称
 * @returns logo图标的完整路径
 */
export function getModelLogoPath(modelName: string): string {
  const iconFile = getModelIconFile(modelName);
  return `/assets/modelslogo/${iconFile}`;
}

/**
 * 获取模型家族的简短缩写（用于备用显示）
 * @param modelFamily 模型家族名称
 * @returns 简短缩写（1个字符，支持中文）
 */
export function getModelFamilyInitial(modelFamily: string): string {
  if (!modelFamily) return '?';
  
  // 获取第一个字符，支持Unicode字符（如中文、日文等）
  const firstChar = Array.from(modelFamily)[0];
  return firstChar ? firstChar.toUpperCase() : '?';
}

/**
 * 检查是否有对应的模型图标
 * @param modelName 模型名称
 * @returns 是否有对应的图标
 */
export function hasModelIcon(modelName: string): boolean {
  return getModelIconFile(modelName) !== DEFAULT_ICON;
}

/**
 * 获取所有支持的模型家族列表
 * @returns 支持的模型家族名称数组
 */
export function getSupportedModelFamilies(): string[] {
  return Object.keys(MODEL_LOGO_MAPPING);
} 