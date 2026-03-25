import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(time: string): string {
  return time.substring(0, 5) // HH:MM format
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('no-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleString('no-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function calculateWorkHours(startTime: string, endTime: string, pauseMinutes: number = 0): number {
  const start = new Date(`2000-01-01T${startTime}`)
  const end = new Date(`2000-01-01T${endTime}`)
  
  const diffMs = end.getTime() - start.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  
  return Math.max(0, diffHours - (pauseMinutes / 60))
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function isOnline(): boolean {
  return typeof window !== 'undefined' ? navigator.onLine : true
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
