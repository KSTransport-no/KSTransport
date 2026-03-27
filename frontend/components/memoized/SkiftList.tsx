'use client'

import React, { useCallback } from 'react'
import { VirtualizedList } from '@/components/VirtualizedList'
import { SkiftListItem } from './SkiftListItem'

interface Skift {
  id: number
  sjåfør_navn?: string
  bil_registreringsnummer?: string
  bil_merke?: string
  bil_modell?: string
  sone_navn?: string
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
}

interface SkiftListProps {
  skift: Skift[]
  onApprove?: (id: number, godkjent: boolean) => void
  onEdit?: (id: number) => void
  showCheckbox?: boolean
  selectedIds?: Set<number>
  onToggle?: (id: number) => void
  formatDato?: (dato: string) => string
  formatTid?: (tid: string) => string
  beregnArbeidstid?: (skift: Skift) => string
  useVirtualization?: boolean
  maxHeight?: number
}

/**
 * Memoized skift list component with optional virtualization
 */
export const SkiftList = React.memo<SkiftListProps>(({
  skift,
  onApprove,
  onEdit,
  showCheckbox = false,
  selectedIds = new Set(),
  onToggle,
  formatDato = (d) => new Date(d).toLocaleDateString('no-NO', { year: 'numeric', month: 'long', day: 'numeric' }),
  formatTid = (t) => new Date(t).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
  beregnArbeidstid = () => '',
  useVirtualization = false,
  maxHeight = 600
}) => {
  const handleApprove = useCallback((id: number) => {
    if (onApprove) {
      // Toggle status (godkjent or fakturert)
      const skiftItem = skift.find(s => s.id === id)
      if (skiftItem) {
        // Check if it's fakturert toggle or godkjent toggle
        if ('fakturert' in skiftItem) {
          onApprove(id, !skiftItem.fakturert)
        } else {
          onApprove(id, !skiftItem.godkjent)
        }
      }
    }
  }, [onApprove, skift])

  const handleToggle = useCallback((id: number) => {
    if (onToggle) {
      onToggle(id)
    }
  }, [onToggle])

  const renderItem = useCallback((item: Skift) => {
  return (
    <div className="pb-4">
      <SkiftListItem
        skift={item}
        onApprove={onApprove ? () => handleApprove(item.id) : undefined}
        onEdit={onEdit}
        showCheckbox={showCheckbox}
        isSelected={selectedIds.has(item.id)}
        onToggle={handleToggle}
        formatDato={formatDato}
        formatTid={formatTid}
        beregnArbeidstid={beregnArbeidstid}
      />
    </div>
  )
}, [onApprove, onEdit, showCheckbox, selectedIds, handleToggle, formatDato, formatTid, beregnArbeidstid, handleApprove])

  if (skift.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">Ingen skift funnet</p>
      </div>
    )
  }

  // Use virtualization for lists with more than 20 items
  if (useVirtualization && skift.length > 20) {
    return (
      <VirtualizedList
        items={skift}
        height={maxHeight}
        itemHeight={320} // Estimated height per item
        renderItem={renderItem}
        className="w-full"
        overscanCount={5}
      />
    )
  }

  // Regular rendering for smaller lists
  return (
    <div className="space-y-4">
      {skift.map((item) => (
        <SkiftListItem
          key={item.id}
          skift={item}
          onApprove={onApprove ? () => handleApprove(item.id) : undefined}
          onEdit={onEdit}
          showCheckbox={showCheckbox}
          isSelected={selectedIds.has(item.id)}
          onToggle={handleToggle}
          formatDato={formatDato}
          formatTid={formatTid}
          beregnArbeidstid={beregnArbeidstid}
        />
      ))}
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.skift.length === nextProps.skift.length &&
    prevProps.skift.every((s, i) => {
      const next = nextProps.skift[i]
      return next && s.id === next.id && s.godkjent === next.godkjent && s.fakturert === next.fakturert
    }) &&
    prevProps.selectedIds?.size === nextProps.selectedIds?.size &&
    Array.from(prevProps.selectedIds || []).every(id => nextProps.selectedIds?.has(id))
  )
})

SkiftList.displayName = 'SkiftList'

