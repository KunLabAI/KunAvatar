'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, UserPlus, CheckCircle, XCircle, Languages } from 'lucide-react';
import BlackHoleAnimation from '@/components/BlackHoleAnimation';
import { useI18n } from '@/contexts/I18nContext';
import { type Locale } from '@/i18n/config';

// 验证状态类型
type ValidationStatus = 'idle' | 'valid' | 'invalid';

interface ValidationState {
  status: ValidationStatus;
  message: string;
}

export default function RegisterPage() {
  const { t, locale, setLocale } = useI18n();
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
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  
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

  // 处理语言菜单外部点击
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setShowLanguageMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 语言切换处理
  const handleLanguageChange = async (newLocale: Locale) => {
    await setLocale(newLocale);
    setShowLanguageMenu(false);
  };

  // 验证函数
  const validateUsername = (username: string): ValidationState => {
    if (!username) {
      return { status: 'invalid', message: t('auth.validation.usernameRequired') };
    }
    if (username.length < 3) {
      return { status: 'invalid', message: t('auth.validation.usernameMinLength') };
    }
    if (username.length > 20) {
      return { status: 'invalid', message: t('auth.validation.usernameMaxLength') };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { status: 'invalid', message: t('auth.validation.usernameInvalidChars') };
    }
    return { status: 'valid', message: t('auth.validation.usernameValid') };
  };

  const validateEmail = (email: string): ValidationState => {
    if (!email) {
      return { status: 'invalid', message: t('auth.validation.emailRequired') };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { status: 'invalid', message: t('auth.validation.emailInvalid') };
    }
    return { status: 'valid', message: t('auth.validation.emailValid') };
  };

  const validatePassword = (password: string): ValidationState => {
    if (!password) {
      return { status: 'invalid', message: t('auth.validation.passwordRequired') };
    }
    if (password.length < 6) {
      return { status: 'invalid', message: t('auth.validation.passwordMinLength') };
    }
    if (password.length > 20) {
      return { status: 'invalid', message: t('auth.validation.passwordMaxLength') };
    }
    return { status: 'valid', message: t('auth.validation.passwordValid') };
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): ValidationState => {
    if (!confirmPassword) {
      return { status: 'invalid', message: t('auth.validation.confirmPasswordRequired') };
    }
    if (password !== confirmPassword) {
      return { status: 'invalid', message: t('auth.validation.confirmPasswordMismatch') };
    }
    return { status: 'valid', message: t('auth.validation.confirmPasswordValid') };
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
      setError(t('auth.validation.formErrors'));
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
        setIsFirstUser(data.isFirstUser || false);
        setSuccessMessage(data.message || t('auth.success.registerSuccess'));
        setTimeout(() => {
          router.push('/login');
        }, data.isFirstUser ? 4000 : 2000); // 第一个用户显示更长时间
      } else {
        if (data.details) {
          // 显示详细的验证错误
          const errorMessages = data.details.map((detail: any) => detail.message).join(', ');
          setError(errorMessages);
        } else {
          setError(data.error || t('auth.registerFailed'));
        }
      }
    } catch (error) {
      console.error('注册失败:', error);
      setError(t('auth.registerFailedRetry'));
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
        <div className="absolute inset-0 flex flex-col lg:flex-row auth-page-container">
          {/* 左侧黑洞动画区域 - 在大屏幕上显示，小屏幕上作为背景 */}
          <div className="hidden lg:block lg:w-2/3 auth-left-section"></div>
          
          {/* 右侧成功信息区域 */}
          <div className="flex-1 lg:w-1/3 relative flex items-center justify-center p-4 lg:p-8 auth-right-section">
            {/* 小屏幕背景遮罩 */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm lg:hidden auth-mobile-overlay"></div>
            
            <div className="auth-form-card">
              <div className="text-center">
                <div className={`mx-auto h-16 w-16 flex items-center justify-center rounded-full mb-6 ${
                  isFirstUser 
                    ? 'bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/30' 
                    : 'bg-[var(--color-success)]/20 border border-[var(--color-success)]/30'
                }`}>
                  <UserPlus className={`h-8 w-8 ${
                    isFirstUser ? 'text-yellow-400' : 'text-[var(--color-success)]'
                  }`} />
                </div>
                <h2 className="text-2xl lg:text-3xl font-extrabold text-[var(--color-foreground)] mb-4">
                  {isFirstUser ? t('auth.success.superAdminCreated') : t('auth.success.registerSuccess')}
                </h2>
                <div className="text-[var(--color-foreground-secondary)] space-y-3">
                  <p className="text-base">
                    {successMessage}
                  </p>
                  {isFirstUser && (
                    <div className="bg-gradient-to-r from-yellow-400/10 to-orange-400/10 border border-yellow-400/20 rounded-lg p-4 mt-4">
                      <div className="text-yellow-400 font-semibold mb-2">{t('auth.success.superAdminPrivileges')}</div>
                      <ul className="text-sm text-left space-y-1">
                        <li>{t('auth.success.privileges.userManagement')}</li>
                        <li>{t('auth.success.privileges.roleManagement')}</li>
                        <li>{t('auth.success.privileges.systemSettings')}</li>
                        <li>{t('auth.success.privileges.modelManagement')}</li>
                        <li>{t('auth.success.privileges.fullAccess')}</li>
                      </ul>
                    </div>
                  )}
                  <p className="text-sm">
                    {t('auth.success.redirecting')}
                  </p>
                </div>
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
      <div className="absolute inset-0 flex flex-col lg:flex-row auth-page-container">
        {/* 左侧黑洞动画区域 - 在大屏幕上显示，小屏幕上作为背景 */}
        <div className="hidden lg:block lg:w-2/3 auth-left-section"></div>
        
        {/* 右侧注册表单区域 */}
        <div className="flex-1 lg:w-1/3 relative flex items-center justify-center p-2 sm:p-4 lg:p-8 auth-right-section">
          
          <div className="auth-form-card w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto scrollbar-thin relative">
            {/* 语言切换按钮 */}
            <div className="absolute top-4 right-4 z-20" ref={languageMenuRef}>
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="group flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-card)]/80 backdrop-blur-sm border border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition-all duration-200"
                title="切换语言 / Switch Language"
              >
                <Languages className="h-4 w-4 text-[var(--color-foreground-muted)] group-hover:text-[var(--color-foreground)] transition-colors" />
              </button>
              
              {showLanguageMenu && (
                <div className="absolute top-full right-0 mt-2 w-32 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow-lg backdrop-blur-sm z-30">
                  <button
                    onClick={() => handleLanguageChange('zh')}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-card-hover)] transition-colors first:rounded-t-lg ${
                      locale === 'zh' ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-[var(--color-foreground)]'
                    }`}
                  >
                    中文
                  </button>
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-card-hover)] transition-colors last:rounded-b-lg ${
                      locale === 'en' ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-[var(--color-foreground)]'
                    }`}
                  >
                    English
                  </button>
                </div>
              )}
            </div>
            
            {/* 品牌标题 */}
            <div className="text-center mb-6 lg:mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                Kun Avatar
              </h1>
              <div className="w-16 h-0.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] mx-auto rounded-full mb-4 lg:mb-6"></div>
            </div>
            <div className="text-center mb-4 lg:mb-6">
              <h2 className="text-xl lg:text-2xl font-bold text-[var(--color-foreground)] mb-6">
                {t('auth.createAccount')}
              </h2>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-3 border placeholder-[var(--color-foreground-muted)] text-[var(--color-foreground)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-input)] backdrop-blur-sm transition-all ${
                      validationStates.username.status === 'valid' ? 'border-[var(--color-success)]/50' :
                      validationStates.username.status === 'invalid' ? 'border-[var(--color-error)]/50' :
                      'border-[var(--color-input-border)]'
                    }`}
                    placeholder={t('auth.usernameRegisterPlaceholder')}
                  />
                  <ValidationMessage validation={validationStates.username} />
                </div>

                <div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-3 border placeholder-[var(--color-foreground-muted)] text-[var(--color-foreground)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-input)] backdrop-blur-sm transition-all ${
                      validationStates.email.status === 'valid' ? 'border-[var(--color-success)]/50' :
                      validationStates.email.status === 'invalid' ? 'border-[var(--color-error)]/50' :
                      'border-[var(--color-input-border)]'
                    }`}
                    placeholder={t('auth.emailPlaceholder')}
                  />
                  <ValidationMessage validation={validationStates.email} />
                </div>

                <div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 pr-12 border placeholder-[var(--color-foreground-muted)] text-[var(--color-foreground)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-input)] backdrop-blur-sm transition-all ${
                        validationStates.password.status === 'valid' ? 'border-[var(--color-success)]/50' :
                        validationStates.password.status === 'invalid' ? 'border-[var(--color-error)]/50' :
                        'border-[var(--color-input-border)]'
                      }`}
                      placeholder={t('auth.passwordRegisterPlaceholder')}
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
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 pr-12 border placeholder-[var(--color-foreground-muted)] text-[var(--color-foreground)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-input)] backdrop-blur-sm transition-all ${
                        validationStates.confirmPassword.status === 'valid' ? 'border-[var(--color-success)]/50' :
                        validationStates.confirmPassword.status === 'invalid' ? 'border-[var(--color-error)]/50' :
                        'border-[var(--color-input-border)]'
                      }`}
                      placeholder={t('auth.confirmPasswordPlaceholder')}
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
                {loading ? t('auth.registering') : t('auth.createAccountButton')}
              </button>
              
              {/* 登录到现有账户按钮 */}
              <Link
                href="/login"
                className="w-full flex justify-center items-center py-3 px-4 mt-3 border border-[var(--color-border)] text-sm font-medium rounded-lg text-[var(--color-foreground)] bg-transparent hover:bg-[var(--color-card-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 transition-all duration-200"
              >
                {t('auth.loginToExisting')}
              </Link>
            </div>
        </form>
        
        {/* 版权信息 */}
        <div className="text-center pt-4 ">
          <p className="text-xs text-[var(--color-foreground-muted)]">
            © 2025 <span className="text-[var(--color-primary)] font-medium">KunpuAI</span>, Inc. All rights reserved.
          </p>
        </div>
         </div>
       </div>
     </div>
   </div>
 );
}
