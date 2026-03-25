'use client'

import { OfflineIndicator } from './OfflineIndicator'

export function OfflineWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineIndicator />
      {children}
    </>
  )
}

