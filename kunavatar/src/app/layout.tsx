import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/theme/contexts/ThemeContext'
import { ThemeScript } from '@/theme/components/ThemeScript'
import { ColorThemeScript } from '@/theme/components/ColorThemeScript'
import { NotificationProvider } from '@/components/notification'
import { NotificationManager } from '@/components/notification/NotificationManager'
import { AuthProvider } from '@/components/AuthProvider'
import { AuthErrorBoundary } from '@/components/AuthErrorBoundary'
import OllamaStatusChecker from '@/components/OllamaStatusChecker'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Kun Agent',
  description: '智能对话助手',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <ColorThemeScript />
      </head>
      <body className={`${inter.className} bg-theme-background text-theme-foreground transition-opacity duration-200`} suppressHydrationWarning>
        <ThemeProvider>
          <AuthErrorBoundary>
            <AuthProvider>
              <NotificationProvider>
                <div className="min-h-screen">
                  {children}
                </div>
                <NotificationManager />
                <OllamaStatusChecker />
              </NotificationProvider>
            </AuthProvider>
          </AuthErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}