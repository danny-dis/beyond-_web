'use client'

import { useMemo } from 'react'
import type { Location, CelestialObject } from '@/types/astronomy'

export interface UseSatellitesReturn {
  satellites: CelestialObject[]
}

// Fallback no-op hook to avoid bundling optional satellite library during build
export const useSatellites = (
  enabled: boolean,
  location: Location | null,
  currentTime: Date
): UseSatellitesReturn => {
  const satellites = useMemo<CelestialObject[]>(() => {
    // Return empty; SkyMap will fall back to its lightweight demo generator
    return []
  }, [enabled, location, currentTime])

  return { satellites }
}



