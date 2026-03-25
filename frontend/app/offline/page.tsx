'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <WifiOff className="h-16 w-16 text-gray-400" />
          </div>
          <CardTitle className="text-2xl">Ingen tilkobling</CardTitle>
          <CardDescription>
            Du er offline. Sjekk internettforbindelsen din.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-gray-600">
            <p className="mb-4">
              Appen fungerer offline, men du trenger tilkobling for å:
            </p>
            <ul className="text-sm space-y-2 text-left">
              <li>• Logge inn</li>
              <li>• Synkronisere data</li>
              <li>• Hente ny informasjon</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleRetry}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Prøv igjen
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
