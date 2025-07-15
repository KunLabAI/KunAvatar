'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import BlackHoleAnimation from '@/components/BlackHoleAnimation';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
        
        // 使用 window.location.href 强制跳转，确保页面完全刷新
        // 这样可以避免React状态不一致的问题
        setTimeout(() => {
          const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/simple-chat';
          window.location.href = redirectTo;
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
      <div className="absolute inset-0 flex flex-col lg:flex-row">
        {/* 左侧黑洞动画区域 - 在大屏幕上显示，小屏幕上作为背景 */}
        <div className="hidden lg:block lg:w-2/3"></div>
        
        {/* 右侧登录表单区域 */}
        <div className="flex-1 lg:w-1/3 relative flex items-center justify-center p-4 lg:p-8">
          {/* 小屏幕背景遮罩 */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm lg:hidden"></div>
          
          <div className="w-full max-w-md bg-[var(--color-card)]/90 lg:bg-[var(--color-card)]/80 backdrop-blur-xl border border-[var(--color-border)] rounded-3xl p-6 lg:p-8 relative z-10">
            <div className="w-full space-y-6">
              {/* 品牌标题 */}
              <div className="text-center mb-6">
                <h1 className="text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-accent)] to-[var(--color-primary-hover)] bg-clip-text text-transparent">
                  Kun Avatar
                </h1>
                <div className="w-16 h-1 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] mx-auto rounded-full mb-4"></div>
              </div>
              
              <div>
                <h2 className="text-center text-xl lg:text-2xl font-bold text-[var(--color-foreground)] mb-2">
                  嗨，欢迎回来！
                </h2>
                <p className="text-center text-sm text-[var(--color-foreground-secondary)]">
                  或者{' '}
                  <Link href="/register" className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors">
                    重新开始
                  </Link>
                </p>
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
                       value={formData.username}
                       onChange={handleChange}
                       className="w-full px-4 py-3 border border-[var(--color-input-border)] placeholder-[var(--color-foreground-muted)] text-[var(--color-foreground)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] bg-[var(--color-input)] backdrop-blur-sm transition-all duration-200"
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
                         value={formData.password}
                         onChange={handleChange}
                         className="w-full px-4 py-3 pr-12 border border-[var(--color-input-border)] placeholder-[var(--color-foreground-muted)] text-[var(--color-foreground)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] bg-[var(--color-input)] backdrop-blur-sm transition-all duration-200"
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
               </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
