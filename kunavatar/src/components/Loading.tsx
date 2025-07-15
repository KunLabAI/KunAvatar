'use client';

import React from 'react';

interface LoadingProps {
  /** 加载动画尺寸 */
  size?: 'small' | 'normal' | 'large';
  /** 显示的文本 */
  text?: string;
  /** 是否显示文本 */
  showText?: boolean;
  /** 自定义样式类名 */
  className?: string;
  /** 容器样式 */
  containerStyle?: React.CSSProperties;
  /** 文本样式 */
  textStyle?: React.CSSProperties;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'normal',
  text = '正在加载...',
  showText = true,
  className = '',
  containerStyle,
  textStyle
}) => {
  // 根据尺寸确定spinner类名和容器样式
  const getSpinnerClass = () => {
    switch (size) {
      case 'small':
        return 'spinner-small';
      case 'large':
        return 'spinner';
      case 'normal':
      default:
        return 'spinner';
    }
  };

  const getContainerPadding = () => {
    switch (size) {
      case 'small':
        return '1rem';
      case 'large':
        return '3rem';
      case 'normal':
      default:
        return '2rem';
    }
  };

  const getGap = () => {
    switch (size) {
      case 'small':
        return '0.75rem';
      case 'large':
        return '1.5rem';
      case 'normal':
      default:
        return '1rem';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return '0.875rem'; // text-sm
      case 'large':
        return '1.125rem'; // text-lg
      case 'normal':
      default:
        return '1rem'; // text-base
    }
  };

  const defaultContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: getContainerPadding(),
    gap: getGap(),
    ...containerStyle
  };

  const defaultTextStyle: React.CSSProperties = {
    fontSize: getTextSize(),
    fontWeight: '500',
    color: 'var(--color-foreground-muted)',
    textAlign: 'center',
    ...textStyle
  };

  return (
    <div 
      className={`loading-container ${className}`}
      style={defaultContainerStyle}
    >
      {/* 3D立方体动画 */}
      <div className={getSpinnerClass()}>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      
      {/* 可选的加载文本 */}
      {showText && text && (
        <p style={defaultTextStyle}>
          {text}
        </p>
      )}
    </div>
  );
};

// 预设的Loading组件变体
export const LoadingSmall: React.FC<Omit<LoadingProps, 'size'>> = (props) => (
  <Loading {...props} size="small" />
);

export const LoadingLarge: React.FC<Omit<LoadingProps, 'size'>> = (props) => (
  <Loading {...props} size="large" />
);

// 页面级Loading组件
export const PageLoading: React.FC<{
  text?: string;
  fullScreen?: boolean;
}> = ({ 
  text = '正在加载页面...', 
  fullScreen = true 
}) => (
  <div 
    className={fullScreen ? 'min-h-screen' : 'min-h-[400px]'}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Loading 
      size="normal"
      text={text}
      showText={true}
      containerStyle={{
        padding: '3rem'
      }}
    />
  </div>
);

// 模态框Loading组件
export const ModalLoading: React.FC<{
  text?: string;
}> = ({ text = '处理中...' }) => (
  <div 
    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
  >
    <div 
      className="rounded-2xl p-8 shadow-2xl"
      style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        background: `linear-gradient(135deg, 
          var(--color-card) 0%, 
          var(--color-background-secondary) 100%)`
      }}
    >
      <Loading 
        size="normal"
        text={text}
        showText={true}
      />
    </div>
  </div>
);

// 内联Loading组件
export const InlineLoading: React.FC<{
  text?: string;
  size?: 'small' | 'normal';
}> = ({ text = '加载中...', size = 'small' }) => (
  <div 
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem'
    }}
  >
    <Loading 
      size={size}
      text={text}
      showText={!!text}
      containerStyle={{
        padding: '0',
        gap: '0.5rem'
      }}
    />
  </div>
);

export default Loading; 