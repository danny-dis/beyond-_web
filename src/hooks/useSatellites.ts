'use client'

import { useMemo } from 'react'
import type { Location, CelestialObject } from '@/types/astronomy'

export interface UseSatellitesReturn {
  satellites: CelestialObject[]
}

// Demo satellite positions (artificial, for visual effect only)
export const useSatellites = (
  enabled: boolean,
  location: Location | null,
  currentTime: Date
): UseSatellitesReturn => {
  const satellites = useMemo<CelestialObject[]>(() => {
    if (!enabled || !location) return []
    
    const base = currentTime.getTime() / 1000
    const satDefs = [
      { id: 'sat-iss', name: 'ISS (demo)', magnitude: 1.5 },
      { id: 'sat-hubble', name: 'Hubble (demo)', magnitude: 2.0 },
      { id: 'sat-starlink', name: 'Starlink (demo)', magnitude: 3.0 },
    ]
    
    return satDefs.map((s, idx) => {
      const azimuth = ((base / 15 + idx * 120) % 360 + 360) % 360
      const altitude = 15 + 40 * Math.sin((base / 90) + idx * 2)
      return {
        id: s.id,
        name: s.name,
        type: 'satellite' as const,
        x: 0, y: 0,
        visible: altitude > 0,
        magnitude: s.magnitude,
        azimuth,
        altitude,
      }
    })
  }, [enabled, location, currentTime])

  return { satellites }
}
