'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import BlackHoleAnimation from '@/components/BlackHoleAnimation';

// 验证状态类型
type ValidationStatus = 'idle' | 'valid' | 'invalid';

interface ValidationState {
  status: ValidationStatus;
  message: string;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // 验证状态管理
  const [validationStates, setValidationStates] = useState<{
    username: ValidationState;
    email: ValidationState;
    password: ValidationState;
    confirmPassword: ValidationState;
  }>({
    username: { status: 'idle', message: '' },
    email: { status: 'idle', message: '' },
    password: { status: 'idle', message: '' },
    confirmPassword: { status: 'idle', message: '' },
  });
  
  const router = useRouter();

  // 验证函数
  const validateUsername = (username: string): ValidationState => {
    if (!username) {
      return { status: 'invalid', message: '用户名不能为空' };
    }
    if (username.length < 3) {
      return { status: 'invalid', message: '用户名至少需要3个字符' };
    }
    if (username.length > 20) {
      return { status: 'invalid', message: '用户名不能超过20个字符' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { status: 'invalid', message: '用户名只能包含字母、数字和下划线' };
    }
    return { status: 'valid', message: '用户名格式正确' };
  };

  const validateEmail = (email: string): ValidationState => {
    if (!email) {
      return { status: 'invalid', message: '邮箱不能为空' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { status: 'invalid', message: '请输入有效的邮箱地址' };
    }
    return { status: 'valid', message: '邮箱格式正确' };
  };

  const validatePassword = (password: string): ValidationState => {
    if (!password) {
      return { status: 'invalid', message: '密码不能为空' };
    }
    if (password.length < 6) {
      return { status: 'invalid', message: '密码至少需要6个字符' };
    }
    if (password.length > 20) {
      return { status: 'invalid', message: '密码不能超过20个字符' };
    }
    return { status: 'valid', message: '密码格式正确' };
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): ValidationState => {
    if (!confirmPassword) {
      return { status: 'invalid', message: '请确认密码' };
    }
    if (password !== confirmPassword) {
      return { status: 'invalid', message: '两次输入的密码不一致' };
    }
    return { status: 'valid', message: '密码确认正确' };
  };

  // 处理字段验证
  const handleFieldValidation = (fieldName: string, value: string) => {
    let validationResult: ValidationState;
    
    switch (fieldName) {
      case 'username':
        validationResult = validateUsername(value);
        break;
      case 'email':
        validationResult = validateEmail(value);
        break;
      case 'password':
        validationResult = validatePassword(value);
        // 如果确认密码已经输入，也需要重新验证
        if (formData.confirmPassword) {
          const confirmValidation = validateConfirmPassword(value, formData.confirmPassword);
          setValidationStates(prev => ({
            ...prev,
            confirmPassword: confirmValidation
          }));
        }
        break;
      case 'confirmPassword':
        validationResult = validateConfirmPassword(formData.password, value);
        break;
      default:
        return;
    }
    
    setValidationStates(prev => ({
      ...prev,
      [fieldName]: validationResult
    }));
  };

  // 处理输入框失去焦点
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (['username', 'email', 'password', 'confirmPassword'].includes(name)) {
      handleFieldValidation(name, value);
    }
  };

  // 验证消息组件
  const ValidationMessage = ({ validation }: { validation: ValidationState }) => {
    if (validation.status === 'idle') return null;
    
    return (
      <div className={`flex items-center mt-1 text-xs ${
        validation.status === 'valid' ? 'text-green-400' : 'text-red-400'
      }`}>
        {validation.status === 'valid' ? (
          <CheckCircle className="h-3 w-3 mr-1" />
        ) : (
          <XCircle className="h-3 w-3 mr-1" />
        )}
        {validation.message}
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 验证所有字段
    const usernameValidation = validateUsername(formData.username);
    const emailValidation = validateEmail(formData.email);
    const passwordValidation = validatePassword(formData.password);
    const confirmPasswordValidation = validateConfirmPassword(formData.password, formData.confirmPassword);
    
    // 更新验证状态
    setValidationStates({
      username: usernameValidation,
      email: emailValidation,
      password: passwordValidation,
      confirmPassword: confirmPasswordValidation,
    });
    
    // 检查是否有验证错误
    if (
      usernameValidation.status === 'invalid' ||
      emailValidation.status === 'invalid' ||
      passwordValidation.status === 'invalid' ||
      confirmPasswordValidation.status === 'invalid'
    ) {
      setError('请修正表单中的错误后再提交');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        if (data.details) {
          // 显示详细的验证错误
          const errorMessages = data.details.map((detail: any) => detail.message).join(', ');
          setError(errorMessages);
        } else {
          setError(data.error || '注册失败');
        }
      }
    } catch (error) {
      console.error('注册失败:', error);
      setError('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // 对用户名、邮箱和密码字段去除空格
    const trimmedValue = (name === 'username' || name === 'email' || name === 'password' || name === 'confirmPassword') 
      ? value.trim() 
      : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: trimmedValue,
    }));
    
    // 确认密码实时验证
    if (name === 'confirmPassword') {
      const confirmValidation = validateConfirmPassword(formData.password, trimmedValue);
      setValidationStates(prev => ({
        ...prev,
        confirmPassword: confirmValidation
      }));
    }
  };

  if (success) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <BlackHoleAnimation className="absolute inset-0" offsetX={-3} hideControls={true} />
        
        {/* 响应式布局容器 */}
        <div className="absolute inset-0 flex flex-col lg:flex-row">
          {/* 左侧黑洞动画区域 - 在大屏幕上显示，小屏幕上作为背景 */}
          <div className="hidden lg:block lg:w-2/3"></div>
          
          {/* 右侧成功信息区域 */}
          <div className="flex-1 lg:w-1/3 relative flex items-center justify-center p-4 lg:p-8">
            {/* 小屏幕背景遮罩 */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm lg:hidden"></div>
            
            <div className="w-full max-w-md bg-[var(--color-card)]/90 lg:bg-[var(--color-card)]/80 backdrop-blur-xl border border-[var(--color-border)]/30 rounded-2xl shadow-2xl p-6 lg:p-8 relative z-10">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-[var(--color-success)]/20 border border-[var(--color-success)]/30 mb-6">
                  <UserPlus className="h-8 w-8 text-[var(--color-success)]" />
                </div>
                <h2 className="text-2xl lg:text-3xl font-extrabold text-[var(--color-foreground)] mb-4">
                  注册成功！
                </h2>
                <p className="text-[var(--color-foreground-secondary)]">
                  您的账户已创建成功，正在跳转到登录页面...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <BlackHoleAnimation className="absolute inset-0" offsetX={-3} hideControls={true} />
      
      {/* 响应式布局容器 */}
      <div className="absolute inset-0 flex flex-col lg:flex-row">
        {/* 左侧黑洞动画区域 - 在大屏幕上显示，小屏幕上作为背景 */}
        <div className="hidden lg:block lg:w-2/3"></div>
        
        {/* 右侧注册表单区域 */}
        <div className="flex-1 lg:w-1/3 relative flex items-center justify-center p-4 lg:p-8">
          {/* 小屏幕背景遮罩 */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm lg:hidden"></div>
          
          <div className="w-full max-w-md bg-[var(--color-card)]/90 lg:bg-[var(--color-card)]/80 backdrop-blur-xl border border-[var(--color-border)] rounded-3xl p-6 lg:p-8 relative z-10 max-h-[90vh] overflow-y-auto">
            {/* 品牌标题 */}
            <div className="text-center mb-6 lg:mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-foreground)] mb-2">
                Kun Avatar
              </h1>
              <div className="w-16 h-0.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] mx-auto rounded-full mb-4 lg:mb-6"></div>
            </div>
            <div className="text-center mb-4 lg:mb-6">
              <h2 className="text-xl lg:text-2xl font-bold text-[var(--color-foreground)] mb-2">
                创建新账户
              </h2>
              <p className="text-sm text-[var(--color-foreground-secondary)]">
                或者{' '}
                <Link href="/login" className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors">
                  登录到现有账户
                </Link>
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                    用户名 <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-3 border placeholder-[var(--color-foreground-muted)] text-[var(--color-foreground)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 bg-[var(--color-input)] backdrop-blur-sm transition-all ${
                      validationStates.username.status === 'valid' ? 'border-[var(--color-success)]/50' :
                      validationStates.username.status === 'invalid' ? 'border-[var(--color-error)]/50' :
                      'border-[var(--color-input-border)]'
                    }`}
                    placeholder="请输入用户名"
                  />
                  <ValidationMessage validation={validationStates.username} />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                    邮箱 <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-3 border placeholder-[var(--color-foreground-muted)] text-[var(--color-foreground)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 bg-[var(--color-input)] backdrop-blur-sm transition-all ${
                      validationStates.email.status === 'valid' ? 'border-[var(--color-success)]/50' :
                      validationStates.email.status === 'invalid' ? 'border-[var(--color-error)]/50' :
                      'border-[var(--color-input-border)]'
                    }`}
                    placeholder="请输入邮箱地址"
                  />
                  <ValidationMessage validation={validationStates.email} />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                    密码 <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 pr-12 border placeholder-[var(--color-foreground-muted)] text-[var(--color-foreground)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 bg-[var(--color-input)] backdrop-blur-sm transition-all ${
                        validationStates.password.status === 'valid' ? 'border-[var(--color-success)]/50' :
                        validationStates.password.status === 'invalid' ? 'border-[var(--color-error)]/50' :
                        'border-[var(--color-input-border)]'
                      }`}
                      placeholder="请输入密码（6-20个字符）"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors" />
                      ) : (
                        <Eye className="h-5 w-5 text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors" />
                      )}
                    </button>
                  </div>
                  <ValidationMessage validation={validationStates.password} />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                    确认密码 <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 pr-12 border placeholder-[var(--color-foreground-muted)] text-[var(--color-foreground)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 bg-[var(--color-input)] backdrop-blur-sm transition-all ${
                        validationStates.confirmPassword.status === 'valid' ? 'border-[var(--color-success)]/50' :
                        validationStates.confirmPassword.status === 'invalid' ? 'border-[var(--color-error)]/50' :
                        'border-[var(--color-input-border)]'
                      }`}
                      placeholder="请再次输入密码"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors" />
                      ) : (
                        <Eye className="h-5 w-5 text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors" />
                      )}
                    </button>
                  </div>
                  <ValidationMessage validation={validationStates.confirmPassword} />
                </div>
        </div>

            {error && (
              <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 text-[var(--color-error)] px-4 py-3 rounded-lg backdrop-blur-sm">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] text-white font-medium rounded-lg hover:from-[var(--color-primary-hover)] hover:to-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? '注册中...' : '创建账户'}
              </button>
            </div>
        </form>
         </div>
       </div>
     </div>
   </div>
 );
}
