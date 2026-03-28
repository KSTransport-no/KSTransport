'use client'

import { useEffect, useState } from 'react'

export function VersionFooter() {
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    fetch('/sw.js')
      .then(res => res.text())
      .then(text => {
        const match = text.match(/CACHE_VERSION\s*=\s*["']([^"']+)["']/)
        if (match) setVersion(match[1])
      })
      .catch(() => {})
  }, [])

  if (!version) return null

  return <span className="text-xs text-gray-400">{version}</span>
}
