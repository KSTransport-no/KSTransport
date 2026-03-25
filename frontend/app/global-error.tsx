'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="no">
      <body>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-2xl">Kritisk feil</CardTitle>
              <CardDescription>
                En kritisk feil oppstod. Appen kan ikke lastes. Vi har blitt varslet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-gray-100 p-3 rounded text-xs font-mono overflow-auto max-h-32">
                  <p className="text-red-600 font-semibold">{error.message}</p>
                  {error.stack && (
                    <pre className="mt-2 text-gray-600 whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  )}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={reset}
                  className="flex-1"
                >
                  Prøv igjen
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Last inn på nytt
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}

