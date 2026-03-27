'use client'

import { Suspense } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
      <p className="text-sm text-gray-500">Laster admin-side...</p>
    </div>
  </div>
)

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { sjåfør, isLoading } = useAuth()
  const router = useRouter()

  // Redirect hvis ikke admin
  if (!isLoading && sjåfør && !sjåfør.admin) {
    router.push('/')
    return null
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {children}
    </Suspense>
  )
}

