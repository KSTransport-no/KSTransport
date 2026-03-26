'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function GlemtPassordPage() {
  const [epost, setEpost] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await api.post('/auth/glemt-passord', { epost })
      setSent(true)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Feil',
        description: 'Kunne ikke sende tilbakestillingslenke. Prøv igjen senere.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">KS Transport</h1>
          <p className="mt-1 text-gray-600 text-sm">Tilbakestill passord</p>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-center text-lg">Glemt passord?</CardTitle>
            <CardDescription className="text-center text-sm">
              {sent
                ? 'Sjekk e-posten din for en tilbakestillingslenke.'
                : 'Skriv inn e-posten din, så sender vi en lenke for å tilbakestille passordet.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {sent ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <Mail className="h-12 w-12 text-blue-500" />
                </div>
                <p className="text-sm text-gray-600">
                  Hvis e-postadressen finnes i systemet vil du motta en e-post med instruksjoner. Lenken er gyldig i 1 time.
                </p>
                <Button variant="outline" className="w-full" onClick={() => router.push('/login')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Tilbake til innlogging
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="epost">E-post</Label>
                  <Input
                    id="epost"
                    type="email"
                    value={epost}
                    onChange={(e) => setEpost(e.target.value)}
                    placeholder="din.epost@kstransport.no"
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sender...
                    </>
                  ) : (
                    'Send tilbakestillingslenke'
                  )}
                </Button>
                <Button variant="ghost" className="w-full" type="button" onClick={() => router.push('/login')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Tilbake til innlogging
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
