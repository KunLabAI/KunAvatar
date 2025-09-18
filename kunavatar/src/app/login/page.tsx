'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, LogIn, Info } from 'lucide-react';
import BlackHoleAnimation from '@/components/BlackHoleAnimation';
import { validateRedirectUrl } from '@/lib/security/url-validator';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [showAdminInfo, setShowAdminInfo] = useState(false);

  // 检查是否为首次运行
  useEffect(() => {
    const checkFirstRun = async () => {
      try {
        const response = await fetch('/api/system/first-run');
        const data = await response.json();
        
        if (data.success && data.isFirstRun) {
          setIsFirstRun(true);
          setShowAdminInfo(true);
        }
      } catch (error) {
        console.error('检查首次运行状态失败:', error);
      }
    };
    
    checkFirstRun();
  }, []);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 保存访问令牌
        localStorage.setItem('accessToken', data.accessToken);
        
        // 清除可能存在的旧设置缓存，确保登录后获取最新的用户设置
        localStorage.removeItem('user-settings-cache-time');
        
        // 使用 window.location.href 强制跳转，确保页面完全刷新
        // 这样可以避免React状态不一致的问题
        setTimeout(() => {
          // 🔧 安全修复：验证重定向 URL 以防止开放重定向攻击和 XSS
          const redirectParam = new URLSearchParams(window.location.search).get('redirect');
          const safeRedirectTo = validateRedirectUrl(redirectParam, '/chat');
          window.location.href = safeRedirectTo;
        }, 300);
      } else {
        setError(data.error || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      setError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // 对用户名和密码字段去除空格
    const trimmedValue = (name === 'username' || name === 'password') ? value.trim() : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: trimmedValue,
    }));
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <BlackHoleAnimation className="absolute inset-0" offsetX={-3} hideControls={true} />
      
      {/* 响应式布局容器 */}
      <div className="absolute inset-0 flex flex-col lg:flex-row auth-page-container">
        {/* 左侧黑洞动画区域 - 在大屏幕上显示，小屏幕上作为背景 */}
        <div className="hidden lg:block lg:w-2/3 auth-left-section"></div>
        
        {/* 右侧登录表单区域 */}
        <div className="flex-1 lg:w-1/3 relative flex items-center justify-center p-4 lg:p-8 auth-right-section">        
          <div className="auth-form-card">
            <div className="w-full space-y-6">
              {/* 品牌标题 */}
              <div className="text-center mb-6">
                <h1 className="text-3xl lg:text-4xl font-bold mb-2 text-theme-foreground">
                  Kun Avatar
                </h1>
                <div className="w-16 h-1 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] mx-auto rounded-full mb-4"></div>
              </div>
              
              {/* 首次启动提示 */}
              {isFirstRun && showAdminInfo && (
                <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg backdrop-blur-sm">
                  <div className="flex-1 items-start space-x-3">
                      </div>
                      <p className="flex justify-center text-xs text-blue-300 m-2">
                        💡 注册完成后自动激活并获得超级管理员账号
                      </p>
                    </div>
              )}
              
              <div>
                <h2 className="text-center text-xl lg:text-2xl font-bold text-[var(--color-foreground)] mb-6">
                  嗨，欢迎回来！
                </h2>
              </div>

               <form className="space-y-5" onSubmit={handleSubmit}>
                 <div className="space-y-4">
                   <div>
                     <label htmlFor="username" className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                       用户名或邮箱
                     </label>
                     <input
                       id="username"
                       name="username"
                       type="text"
                       required
                       autoComplete="username"
                       value={formData.username}
                       onChange={handleChange}
                       className="w-full px-4 py-3 border border-[var(--color-input-border)] placeholder-[var(--color-foreground-muted)] text-[var(--color-foreground)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-input)] backdrop-blur-sm transition-all duration-200"
                       placeholder="请输入用户名或邮箱"
                     />
                   </div>

                   <div>
                     <label htmlFor="password" className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                       密码
                     </label>
                     <div className="relative">
                       <input
                         id="password"
                         name="password"
                         type={showPassword ? 'text' : 'password'}
                         required
                         autoComplete="current-password"
                         value={formData.password}
                         onChange={handleChange}
                         className="w-full px-4 py-3 pr-12 border border-[var(--color-input-border)] placeholder-[var(--color-foreground-muted)] text-[var(--color-foreground)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-input)] backdrop-blur-sm transition-all duration-200"
                         placeholder="请输入密码"
                       />
                       <button
                         type="button"
                         className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-[var(--color-foreground)] transition-colors"
                         onClick={() => setShowPassword(!showPassword)}
                       >
                         {showPassword ? (
                           <EyeOff className="h-5 w-5 text-[var(--color-foreground-muted)]" />
                         ) : (
                           <Eye className="h-5 w-5 text-[var(--color-foreground-muted)]" />
                         )}
                       </button>
                     </div>
                   </div>
                 </div>

                 {error && (
                   <div className="bg-[var(--color-error)]/20 border border-[var(--color-error)]/30 text-[var(--color-error)] px-4 py-3 rounded-lg backdrop-blur-sm">
                     {error}
                   </div>
                 )}

                 <button
                   type="submit"
                   disabled={loading}
                   className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] hover:from-[var(--color-primary-hover)] hover:to-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                 >
                   <LogIn className="w-4 h-4 mr-2" />
                   {loading ? '登录中...' : '登录'}
                 </button>
                 
                 {/* 注册新账号按钮 */}
                 <Link
                   href="/register"
                   className="w-full flex justify-center items-center py-3 px-4 border border-[var(--color-border)] text-sm font-medium rounded-lg text-[var(--color-foreground)] bg-transparent hover:bg-[var(--color-card-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 transition-all duration-200"
                 >
                   注册新账号
                 </Link>
               </form>
               
               {/* 版权信息 */}
               <div className="text-center pt-4 ">
                 <p className="text-xs text-[var(--color-foreground-muted)]">
                   © 2025{' '}
                   <a 
                     href="https://kunpuai.com" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
                   >
                     KunpuAI
                   </a>
                   , Inc. All rights reserved.
                 </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
