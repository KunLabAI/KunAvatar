'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function HomePageContent() {
  const router = useRouter();

  useEffect(() => {
    // 如果用户已经通过了ProtectedRoute验证，直接跳转到聊天页面
    router.replace('/simple-chat');
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