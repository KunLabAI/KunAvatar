/**
 * 模型Logo映射工具模块
 * 提供统一的模型logo映射和处理功能
 */

// 模型logo配置类型
interface LogoConfig {
  icon: string;
  needsThemeAdaptation?: boolean; // 是否需要主题适配
  lightColor?: string; // 浅色主题下的颜色
  darkColor?: string; // 深色主题下的颜色
}

// 模型logo映射配置
const MODEL_LOGO_MAPPING: Record<string, LogoConfig> = {
  // Meta/LLaMA系列
  'llama': { icon: 'Meta_icon.svg' },
  'meta': { icon: 'Meta_icon.svg' },
  
  // 通义千问系列
  'qwen': { icon: 'Qwen_icon.svg' },
  
  // Google Gemma系列
  'gemma': { icon: 'Gemma_icon.svg' },
  
  // Mistral系列
  'mistral': { icon: 'Mistral_icon.svg' },
  
  // Microsoft Phi系列
  'phi': { icon: 'Phi_icon.svg' },
  
  // DeepSeek系列
  'deepseek': { icon: 'Deepseek_icon.svg' },
  
  // Cohere系列
  'cohere': { icon: 'Cohere_icon.svg' },
  
  // LLaVA系列
  'llava': { icon: 'LLaVA_icon.svg' },
  
  // NVIDIA系列
  'nvidia': { icon: 'Nvidia_icon.svg' },
  
  // ModelScope系列
  'modelscope': { icon: 'Modelscope_icon.svg' },
  
  // HuggingFace系列
  'huggingface': { icon: 'Huggingface_icon.svg' },
  'hf': { icon: 'Huggingface_icon.svg' },
  
  // Ollama系列
  'ollama': { icon: 'Ollama_icon.svg' },

  // OpenAI系列 - 需要主题适配
  'gptoss': { 
    icon: 'Openai_icon.svg', 
    needsThemeAdaptation: true,
    lightColor: '#000000', // 浅色主题用黑色
    darkColor: '#ffffff'   // 深色主题用白色
  },
  'gpt-oss': { 
    icon: 'Openai_icon.svg', 
    needsThemeAdaptation: true,
    lightColor: '#000000',
    darkColor: '#ffffff'
  },
  'gpt': { 
    icon: 'Openai_icon.svg', 
    needsThemeAdaptation: true,
    lightColor: '#000000',
    darkColor: '#ffffff'
  },
};

// 默认图标
const DEFAULT_ICON = 'DefaultIcon.svg';

/**
 * 根据模型名称获取对应的logo配置
 * @param modelName 模型名称或家族名称
 * @returns logo配置对象
 */
export function getModelLogoConfig(modelName: string): LogoConfig {
  if (!modelName) return { icon: DEFAULT_ICON };
  
  const lowerModelName = modelName.toLowerCase();
  
  // 按照键长度排序，优先匹配更具体的模型名称
  const sortedEntries = Object.entries(MODEL_LOGO_MAPPING)
    .sort(([a], [b]) => b.length - a.length);
  
  // 遍历映射配置，找到匹配的图标
  for (const [key, config] of sortedEntries) {
    if (lowerModelName.includes(key)) {
      return config;
    }
  }
  
  return { icon: DEFAULT_ICON };
}

/**
 * 根据模型名称获取对应的logo图标文件名
 * @param modelName 模型名称或家族名称
 * @returns logo图标文件名
 */
export function getModelIconFile(modelName: string): string {
  const config = getModelLogoConfig(modelName);
  return config.icon;
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
 * 检查模型是否需要主题适配
 * @param modelName 模型名称
 * @returns 是否需要主题适配
 */
export function needsThemeAdaptation(modelName: string): boolean {
  const config = getModelLogoConfig(modelName);
  return config.needsThemeAdaptation === true;
}

/**
 * 获取模型在指定主题下的颜色
 * @param modelName 模型名称
 * @param isDark 是否为深色主题
 * @returns 对应主题下的颜色，如果不需要适配则返回undefined
 */
export function getModelThemeColor(modelName: string, isDark: boolean): string | undefined {
  const config = getModelLogoConfig(modelName);
  if (!config.needsThemeAdaptation) {
    return undefined;
  }
  return isDark ? config.darkColor : config.lightColor;
}

/**
 * 获取所有支持的模型家族列表
 * @returns 支持的模型家族名称数组
 */
export function getSupportedModelFamilies(): string[] {
  return Object.keys(MODEL_LOGO_MAPPING);
}