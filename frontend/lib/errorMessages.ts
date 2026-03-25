/**
 * Sentralisert feilmelding-håndtering med spesifikke meldinger og handlinger
 */

export interface ErrorMessage {
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  variant?: 'destructive' | 'warning' | 'info'
}

/**
 * Mapper API-feilkoder til brukervenlige meldinger
 */
export function getErrorMessage(error: any): ErrorMessage {
  // Håndter spesifikke API-feilmeldinger
  if (error?.response?.data?.feil) {
    const apiError = error.response.data.feil.toLowerCase()
    
    // Database/validering feil
    if (apiError.includes('påkrevd') || apiError.includes('mangler')) {
      return {
        title: 'Manglende informasjon',
        description: apiError,
        variant: 'warning',
        action: {
          label: 'Fyll ut alle felt',
          onClick: () => {
            // Scroll til første feilfelt
            const firstInput = document.querySelector('input:invalid, select:invalid, textarea:invalid')
            firstInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            ;(firstInput as HTMLElement)?.focus()
          }
        }
      }
    }

    // Autentisering feil
    if (apiError.includes('ugyldig') && (apiError.includes('passord') || apiError.includes('e-post'))) {
      return {
        title: 'Påloggingsfeil',
        description: 'E-post eller passord er feil. Sjekk at du har skrevet riktig.',
        variant: 'destructive',
        action: {
          label: 'Prøv igjen',
          onClick: () => {
            const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement
            emailInput?.focus()
          }
        }
      }
    }

    // Session/timeout feil
    if (apiError.includes('session') || apiError.includes('timeout') || apiError.includes('utløpt')) {
      return {
        title: 'Sesjon utløpt',
        description: 'Din sesjon har utløpt. Vennligst logg inn på nytt.',
        variant: 'warning',
        action: {
          label: 'Logg inn',
          onClick: () => {
            window.location.href = '/login'
          }
        }
      }
    }

    // Nettverksfeil
    if (apiError.includes('nettverk') || apiError.includes('tilkobling')) {
      return {
        title: 'Tilkoblingsproblem',
        description: 'Kunne ikke koble til serveren. Sjekk internettforbindelsen din.',
        variant: 'warning',
        action: {
          label: 'Prøv igjen',
          onClick: () => {
            window.location.reload()
          }
        }
      }
    }

    // Generisk API-feil
    return {
      title: 'Feil oppstod',
      description: apiError,
      variant: 'destructive'
    }
  }

  // Håndter HTTP status koder
  if (error?.response?.status) {
    switch (error.response.status) {
      case 400:
        return {
          title: 'Ugyldig forespørsel',
          description: 'Dataen du sendte er ikke gyldig. Sjekk at alle felt er riktig utfylt.',
          variant: 'warning',
          action: {
            label: 'Sjekk skjema',
            onClick: () => {
              const firstInput = document.querySelector('input:invalid, select:invalid, textarea:invalid')
              firstInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }
        }

      case 401:
        return {
          title: 'Ikke autorisert',
          description: 'Du må logge inn for å fortsette.',
          variant: 'warning',
          action: {
            label: 'Logg inn',
            onClick: () => {
              window.location.href = '/login'
            }
          }
        }

      case 403:
        return {
          title: 'Ingen tilgang',
          description: 'Du har ikke tilgang til denne ressursen.',
          variant: 'destructive'
        }

      case 404:
        return {
          title: 'Ikke funnet',
          description: 'Det du leter etter finnes ikke lenger.',
          variant: 'info',
          action: {
            label: 'Gå tilbake',
            onClick: () => {
              window.history.back()
            }
          }
        }

      case 409:
        return {
          title: 'Konflikt',
          description: 'Denne operasjonen kan ikke utføres fordi det allerede eksisterer lignende data.',
          variant: 'warning'
        }

      case 422:
        return {
          title: 'Valideringsfeil',
          description: 'Noen av feltene er ikke korrekt utfylt. Sjekk skjemaet ditt.',
          variant: 'warning',
          action: {
            label: 'Sjekk felter',
            onClick: () => {
              const firstInput = document.querySelector('input:invalid, select:invalid, textarea:invalid')
              firstInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              ;(firstInput as HTMLElement)?.focus()
            }
          }
        }

      case 429:
        return {
          title: 'For mange forespørsler',
          description: 'Du har sendt for mange forespørsler. Vennligst vent litt før du prøver igjen.',
          variant: 'warning',
          action: {
            label: 'Vent og prøv igjen',
            onClick: () => {
              setTimeout(() => window.location.reload(), 5000)
            }
          }
        }

      case 500:
      case 502:
      case 503:
        return {
          title: 'Serverfeil',
          description: 'Serveren har problemer akkurat nå. Vi jobber med å fikse det. Prøv igjen om litt.',
          variant: 'destructive',
          action: {
            label: 'Prøv igjen',
            onClick: () => {
              window.location.reload()
            }
          }
        }

      case 504:
        return {
          title: 'Timeout',
          description: 'Forespørselen tok for lang tid. Sjekk internettforbindelsen din.',
          variant: 'warning',
          action: {
            label: 'Prøv igjen',
            onClick: () => {
              window.location.reload()
            }
          }
        }
    }
  }

  // Håndter nettverksfeil
  if (error?.message === 'Network Error' || error?.code === 'ECONNABORTED') {
    return {
      title: 'Tilkoblingsproblem',
      description: 'Kunne ikke koble til serveren. Sjekk internettforbindelsen din og prøv igjen.',
      variant: 'warning',
      action: {
        label: 'Prøv igjen',
        onClick: () => {
          window.location.reload()
        }
      }
    }
  }

  // Håndter timeout
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return {
      title: 'Forespørsel tok for lang tid',
      description: 'Serveren svarer ikke. Dette kan skyldes langsom internettforbindelse eller serverproblemer.',
      variant: 'warning',
      action: {
        label: 'Prøv igjen',
        onClick: () => {
          window.location.reload()
        }
      }
    }
  }

  // Generisk feil
  return {
    title: 'Noe gikk galt',
    description: error?.message || 'En uventet feil oppstod. Vennligst prøv igjen.',
    variant: 'destructive',
    action: {
      label: 'Prøv igjen',
      onClick: () => {
        window.location.reload()
      }
    }
  }
}

/**
 * Spesifikke feilmeldinger for vanlige operasjoner
 */
export const specificErrors = {
  login: {
    invalidCredentials: {
      title: 'Feil e-post eller passord',
      description: 'E-postadressen eller passordet er feil. Sjekk at du har skrevet riktig.',
      variant: 'destructive' as const,
      action: {
        label: 'Prøv igjen',
        onClick: () => {
          const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement
          emailInput?.focus()
        }
      }
    },
    networkError: {
      title: 'Kunne ikke logge inn',
      description: 'Kunne ikke koble til serveren. Sjekk internettforbindelsen din.',
      variant: 'warning' as const,
      action: {
        label: 'Prøv igjen',
        onClick: () => window.location.reload()
      }
    }
  },
  skift: {
    saveFailed: {
      title: 'Kunne ikke lagre skift',
      description: 'Det oppstod en feil ved lagring av skiftet. Sjekk at alle felt er riktig utfylt.',
      variant: 'destructive' as const,
      action: {
        label: 'Sjekk skjema',
        onClick: () => {
          const firstInput = document.querySelector('input:invalid, select:invalid, textarea:invalid')
          firstInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    },
    loadFailed: {
      title: 'Kunne ikke laste skift',
      description: 'Det oppstod en feil ved lasting av skift. Prøv å oppdatere siden.',
      variant: 'warning' as const,
      action: {
        label: 'Oppdater side',
        onClick: () => window.location.reload()
      }
    },
    validationFailed: {
      title: 'Manglende informasjon',
      description: 'Vennligst fyll ut alle påkrevde felt før du lagrer.',
      variant: 'warning' as const,
      action: {
        label: 'Fyll ut felt',
        onClick: () => {
          const firstInput = document.querySelector('input:invalid, select:invalid, textarea:invalid')
          firstInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          ;(firstInput as HTMLElement)?.focus()
        }
      }
    }
  },
  upload: {
    fileTooLarge: {
      title: 'Fil for stor',
      description: 'Filen er for stor. Maksimal filstørrelse er 10MB.',
      variant: 'warning' as const
    },
    invalidType: {
      title: 'Ugyldig filtype',
      description: 'Kun bilder (JPG, PNG, GIF) er tillatt.',
      variant: 'warning' as const
    },
    uploadFailed: {
      title: 'Opplasting feilet',
      description: 'Kunne ikke laste opp filen. Sjekk internettforbindelsen og prøv igjen.',
      variant: 'destructive' as const,
      action: {
        label: 'Prøv igjen',
        onClick: () => {}
      }
    }
  }
}

