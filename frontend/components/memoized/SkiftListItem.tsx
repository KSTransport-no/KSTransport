'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Truck, MapPin, Package, Scale, Pause, Users, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

interface Skift {
  id: number
  sjåfør_navn?: string
  bil_registreringsnummer: string
  bil_merke?: string
  bil_modell?: string
  sone_navn: string
  dato: string
  start_tid: string
  slutt_tid?: string
  pause_minutter: number
  antall_sendinger: number
  vekt: number
  godkjent?: boolean
  fakturert?: boolean
  sga_kode?: string
  sga_kode_annet?: string
  registrering_type?: string
  kommentarer?: string
  bomtur_venting?: string
  opprettet?: string
  godkjent_dato?: string
  godkjent_av_navn?: string
  sga_beskrivelse?: string
  sga_skal_faktureres?: boolean
}

interface SkiftListItemProps {
  skift: Skift
  onApprove?: (id: number) => void
  onEdit?: (id: number) => void
  showCheckbox?: boolean
  isSelected?: boolean
  onToggle?: (id: number) => void
  formatDato?: (dato: string) => string
  formatTid?: (tid: string) => string
  beregnArbeidstid?: (skift: Skift) => string
}

/**
 * Memoized skift list item component
 * Forhindrer unødvendige re-renders når listen oppdateres
 */
export const SkiftListItem = React.memo<SkiftListItemProps>(({
  skift,
  onApprove,
  onEdit,
  showCheckbox = false,
  isSelected = false,
  onToggle,
  formatDato = (d) => new Date(d).toLocaleDateString('no-NO'),
  formatTid = (t) => new Date(t).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
  beregnArbeidstid = () => ''
}) => {
  const handleApprove = () => {
    if (onApprove) {
      onApprove(skift.id)
    }
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(skift.id)
    }
  }

  const handleToggle = () => {
    if (onToggle) {
      onToggle(skift.id)
    }
  }

  return (
    <div className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {showCheckbox && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleToggle}
              className="mt-1"
            />
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm sm:text-base">
                  {formatDato(skift.dato)}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {formatTid(skift.start_tid)}
                {skift.slutt_tid ? ` - ${formatTid(skift.slutt_tid)}` : ' - Pågående'}
              </Badge>
              {skift.fakturert && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Fakturert
                </Badge>
              )}
              {skift.godkjent && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Godkjent
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {skift.sga_kode || skift.sga_kode_annet || 'Ingen SGA-kode'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              {skift.sjåfør_navn && (
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span><span className="font-medium">Sjåfør:</span> {skift.sjåfør_navn}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-gray-400" />
                <span><span className="font-medium">Bil:</span> {skift.bil_registreringsnummer} {skift.bil_merke && `- ${skift.bil_merke} ${skift.bil_modell}`}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span><span className="font-medium">Sone:</span> {skift.sone_navn}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span><span className="font-medium">Arbeidstid:</span> {beregnArbeidstid(skift)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-gray-400" />
                <span><span className="font-medium">Sendinger:</span> {skift.antall_sendinger}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Scale className="h-4 w-4 text-gray-400" />
                <span><span className="font-medium">Vekt:</span> {skift.vekt || 0}kg</span>
              </div>
              {skift.pause_minutter > 0 && (
                <div className="flex items-center space-x-2">
                  <Pause className="h-4 w-4 text-gray-400" />
                  <span><span className="font-medium">Pause:</span> {skift.pause_minutter} min</span>
                </div>
              )}
              {skift.sga_kode && (
                <div className="flex items-center space-x-2">
                  <span className="font-medium">SGA:</span> {skift.sga_kode} {skift.sga_beskrivelse && `- ${skift.sga_beskrivelse}`} {skift.sga_skal_faktureres && '(Faktureres)'}
                </div>
              )}
              {skift.sga_kode_annet && (
                <div className="flex items-center space-x-2">
                  <span className="font-medium">SGA (annet):</span> {skift.sga_kode_annet}
                </div>
              )}
            </div>

            {skift.kommentarer && (
              <div className="mt-3 p-2 bg-white rounded border-l-4 border-blue-200">
                <div className="flex items-start space-x-2">
                  <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Kommentarer:</span> {skift.kommentarer}
                  </p>
                </div>
              </div>
            )}

            {skift.bomtur_venting && (
              <div className="mt-2 p-2 bg-white rounded border-l-4 border-yellow-200">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Bomtur/Venting:</span> {skift.bomtur_venting}
                </p>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
              {skift.opprettet && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Registrert:</span> {new Date(skift.opprettet).toLocaleString('no-NO', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
              {skift.godkjent && skift.godkjent_dato && (
                <p className="text-xs text-green-600">
                  <span className="font-medium">Godkjent:</span> {new Date(skift.godkjent_dato).toLocaleString('no-NO', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })} {skift.godkjent_av_navn && `av ${skift.godkjent_av_navn}`}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {(onApprove || onEdit) && (
          <div className="flex sm:flex-col gap-2 sm:ml-4">
            {onApprove && (
              <Button
                variant={skift.godkjent ? "outline" : "default"}
                size="sm"
                onClick={handleApprove}
                className="text-xs sm:text-sm"
              >
                {skift.godkjent ? (
                  <>
                    <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Avgodkjenn
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Godkjenn
                  </>
                )}
              </Button>
            )}
            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleEdit}
                className="text-xs sm:text-sm"
              >
                Rediger
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  return (
    prevProps.skift.id === nextProps.skift.id &&
    prevProps.skift.godkjent === nextProps.skift.godkjent &&
    prevProps.skift.fakturert === nextProps.skift.fakturert &&
    prevProps.isSelected === nextProps.isSelected
  )
})

SkiftListItem.displayName = 'SkiftListItem'

