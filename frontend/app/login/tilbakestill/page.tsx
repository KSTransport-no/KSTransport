'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

function ResetForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [passord, setPassord] = useState('')
  const [bekreft, setBekreft] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  if (!token) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <p className="text-red-600 font-medium">Ugyldig tilbakestillingslenke</p>
          <p className="text-sm text-gray-600">Lenken mangler eller er ugyldig. Be om en ny lenke.</p>
          <Button variant="outline" onClick={() => router.push('/login/glemt-passord')}>
            Be om ny lenke
          </Button>
        </CardContent>
      </Card>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passord !== bekreft) {
      toast({ variant: 'destructive', title: 'Feil', description: 'Passordene samsvarer ikke.' })
      return
    }
    if (passord.length < 6) {
      toast({ variant: 'destructive', title: 'Feil', description: 'Passordet må være minst 6 tegn.' })
      return
    }

    setIsLoading(true)
    try {
      await api.post('/auth/tilbakestill-passord', { token, nyttPassord: passord })
      setDone(true)
    } catch (err: any) {
      const msg = err.response?.data?.feil || 'Kunne ikke tilbakestille passord. Lenken kan være utløpt.'
      toast({ variant: 'destructive', title: 'Feil', description: msg })
    } finally {
      setIsLoading(false)
    }
  }

  if (done) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <p className="font-medium text-gray-900">Passord tilbakestilt!</p>
          <p className="text-sm text-gray-600">Du kan nå logge inn med ditt nye passord.</p>
          <Button className="w-full" onClick={() => router.push('/login')}>
            Gå til innlogging
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-center text-lg">Nytt passord</CardTitle>
        <CardDescription className="text-center text-sm">Velg et nytt passord for kontoen din.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passord">Nytt passord</Label>
            <Input
              id="passord"
              type="password"
              value={passord}
              onChange={(e) => setPassord(e.target.value)}
              placeholder="Minst 6 tegn"
              required
              minLength={6}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bekreft">Bekreft passord</Label>
            <Input
              id="bekreft"
              type="password"
              value={bekreft}
              onChange={(e) => setBekreft(e.target.value)}
              placeholder="Gjenta passordet"
              required
              minLength={6}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Tilbakestiller...
              </>
            ) : (
              'Tilbakestill passord'
            )}
          </Button>
          <Button variant="ghost" className="w-full" type="button" onClick={() => router.push('/login')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til innlogging
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function TilbakestillPassordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">KS Transport</h1>
          <p className="mt-1 text-gray-600 text-sm">Tilbakestill passord</p>
        </div>
        <Suspense fallback={<div className="text-center text-gray-500">Laster...</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  )
}
