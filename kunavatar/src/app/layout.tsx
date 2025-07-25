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
import { UserSettingsProvider } from '@/contexts/UserSettingsContext'
import { DownloadManagerProvider } from '@/contexts/DownloadManagerContext'
import { GlobalDownloadManager } from '@/components/GlobalDownloadManager'
import OllamaStatusChecker from '@/components/OllamaStatusChecker'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Kun Avatar',
  icons: {
    icon: '/assets/logo@64.svg',
    shortcut: '/assets/logo@64.svg',
    apple: '/assets/logo@64.svg',
  },
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
              <UserSettingsProvider>
                <DownloadManagerProvider>
                  <NotificationProvider>
                    <div className="min-h-screen">
                      {children}
                    </div>
                    <NotificationManager />
                    <GlobalDownloadManager />
                    <OllamaStatusChecker />
                  </NotificationProvider>
                </DownloadManagerProvider>
              </UserSettingsProvider>
            </AuthProvider>
          </AuthErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}