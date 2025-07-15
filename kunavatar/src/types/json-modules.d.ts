// JSON模块类型声明
declare module '*.json' {
  const value: any;
  export default value;
}

// 默认提示词配置类型
interface PromptConfig {
  key: string;
  value: string;
  description: string;
  category: string;
}

interface DefaultPrompts {
  prompt_optimize_system_prompt: PromptConfig;
  title_summary_system_prompt: PromptConfig;
  memory_system_prompt: PromptConfig;
}

declare module '../config/default-prompts.json' {
  const defaultPrompts: DefaultPrompts;
  export default defaultPrompts;
}