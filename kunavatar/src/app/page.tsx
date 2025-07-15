'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Loading from '@/components/Loading';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // 等待认证状态确定后再决定跳转
    if (!loading) {
      setIsRedirecting(true);
      
      if (user) {
        // 用户已登录，跳转到聊天页面
        router.replace('/simple-chat?new=true');
      } else {
        // 用户未登录，跳转到登录页面
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-screen bg-theme-background items-center justify-center">
      <Loading 
        size="normal"
        text={loading ? "正在验证身份..." : isRedirecting ? "正在跳转..." : "Kun Avatar正在初始化..."}
        showText={true}
        containerStyle={{
          padding: '3rem'
        }}
      />
    </div>
  );
}