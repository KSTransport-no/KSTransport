'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Truck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { specificErrors } from '@/lib/errorMessages'

export default function LoginPage() {
  const [epost, setEpost] = useState('')
  const [passord, setPassord] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { login } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await login(epost, passord)
      toast({
        variant: 'success',
        title: 'Innlogging vellykket',
        description: 'Du blir omdirigert til hovedsiden...',
      })
      router.push('/')
    } catch (err: any) {
      logger.error('Login error:', err)
      
      // Bruk spesifikke feilmeldinger
      if (err.message?.includes('Ugyldig') || err.message?.includes('passord') || err.message?.includes('e-post')) {
        toast({
          ...specificErrors.login.invalidCredentials,
          action: (
            <button
              onClick={() => {
                const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement
                emailInput?.focus()
              }}
              className="text-sm font-medium underline"
            >
              {specificErrors.login.invalidCredentials.action?.label}
            </button>
          ) as any,
        })
      } else if (err.message?.includes('nettverk') || err.code === 'ECONNABORTED') {
        toast({
          ...specificErrors.login.networkError,
          action: (
            <button
              onClick={() => window.location.reload()}
              className="text-sm font-medium underline"
            >
              {specificErrors.login.networkError.action?.label}
            </button>
          ) as any,
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Påloggingsfeil',
          description: err.message || 'Kunne ikke logge inn. Prøv igjen.',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        {/* Logo og header */}
        <div className="text-center">
          <div className="flex justify-center mb-3 sm:mb-4">
            <img src="/logo.png" alt="KS Transport" className="h-36 sm:h-48 w-auto" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">KS Transport</h1>
          <p className="mt-1 sm:mt-2 text-gray-600 text-sm sm:text-base">Registrering for sjåfører</p>
        </div>

        {/* Login form */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-center text-lg sm:text-xl">Logg inn</CardTitle>
            <CardDescription className="text-center text-sm sm:text-base">
              Skriv inn dine påloggingsdetaljer
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="epost" className="text-sm sm:text-base">E-post</Label>
                <Input
                  id="epost"
                  type="email"
                  value={epost}
                  onChange={(e) => setEpost(e.target.value)}
                  placeholder="din.epost@kstransport.no"
                  required
                  disabled={isLoading}
                  className="text-sm sm:text-base"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="passord" className="text-sm sm:text-base">Passord</Label>
                <Input
                  id="passord"
                  type="password"
                  value={passord}
                  onChange={(e) => setPassord(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="text-sm sm:text-base"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full text-sm sm:text-base" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logger inn...
                  </>
                ) : (
                  'Logg inn'
                )}
              </Button>

              <div className="text-center">
                <Link href="/login/glemt-passord" className="text-sm text-blue-600 hover:underline">
                  Glemt passord?
                </Link>
              </div>
              
            </form>
          </CardContent>
        </Card>

        {/* Demo credentials 
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">Demo påloggingsdetaljer:</p>
              <p><strong>E-post:</strong> ole.hansen@kstransport.no</p>
              <p><strong>Passord:</strong> demo123</p>
            </div>
          </CardContent>
        </Card>
        */}
      </div>
    </div>
  )
}
