'use client'

import { SkeletonPageHeader, SkeletonStats, SkeletonSkiftList } from './SkeletonCard'

/**
 * Full page skeleton loader
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <SkeletonPageHeader />
        <SkeletonStats />
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
            <SkeletonSkiftList count={5} />
          </div>
        </div>
      </div>
    </div>
  )
}

