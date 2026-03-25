'use client'

import React, { useMemo } from 'react'
import { FixedSizeList as List } from 'react-window'
import { logger } from '@/lib/logger'

interface VirtualizedListProps<T> {
  items: T[]
  height: number
  itemHeight: number
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
  className?: string
  overscanCount?: number
}

/**
 * Virtualized list component for optimalisering av lange lister
 * Bruker react-window for å kun rendre synlige elementer
 */
export function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className = '',
  overscanCount = 5
}: VirtualizedListProps<T>) {
  const Row = useMemo(() => {
    return ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const item = items[index]
      if (!item) {
        return null
      }
      return <div style={style}>{renderItem(item, index, style)}</div>
    }
  }, [items, renderItem])

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-500 text-sm">Ingen elementer å vise</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <List
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        overscanCount={overscanCount}
        width="100%"
      >
        {Row}
      </List>
    </div>
  )
}

/**
 * Auto-sizing virtualized list that calculates height based on container
 */
export function AutoVirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  className = '',
  maxHeight = 600,
  overscanCount = 5
}: Omit<VirtualizedListProps<T>, 'height'> & { maxHeight?: number }) {
  const calculatedHeight = Math.min(items.length * itemHeight, maxHeight)
  const minHeight = Math.min(items.length * itemHeight, 400)

  return (
    <VirtualizedList
      items={items}
      height={calculatedHeight}
      itemHeight={itemHeight}
      renderItem={renderItem}
      className={className}
      overscanCount={overscanCount}
    />
  )
}

