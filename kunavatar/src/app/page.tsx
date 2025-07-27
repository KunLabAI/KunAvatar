'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function HomePageContent() {
  const router = useRouter();

  useEffect(() => {
    // 用户访问根路径时，直接跳转到聊天页面的默认状态
    // 不带任何参数，让聊天页面处理默认状态逻辑
    console.log('从首页跳转到聊天页面');
    router.replace('/chat');
  }, [router]);

  return null; // 不需要显示任何内容，直接跳转
}

export default function HomePage() {
  return (
    <ProtectedRoute requireAuth={false} redirectTo="/login">
      <HomePageContent />
    </ProtectedRoute>
  );
}