import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { PWAProvider } from '@/contexts/PWAContext'
import { CACHE_VERSION } from '@/lib/cacheUtils'
import { Toaster } from '@/components/ui/toaster'
import { OfflineWrapper } from '@/components/OfflineWrapper'
import { VersionFooter } from '@/components/VersionFooter'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KS Transport - Registrering',
  description: 'Registreringsløsning for sjåfører',
  manifest: `/manifest.json?v=${CACHE_VERSION}`,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KS Transport',
  },
  icons: {
    icon: `/icon-192x192.png?v=${CACHE_VERSION}`,
    apple: `/icon-192x192.png?v=${CACHE_VERSION}`,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3b82f6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no">
      <body className={inter.className}>
        <PWAProvider>
          <AuthProvider>
            <OfflineWrapper>
              {children}
            </OfflineWrapper>
            <Toaster />
          </AuthProvider>
        </PWAProvider>
        <footer className="fixed bottom-0 left-0 w-full pointer-events-none text-center py-1">
          <VersionFooter />
        </footer>
      </body>
    </html>
  )
}
