'use client'

import { useEffect, useMemo, useState } from 'react'
import { DeepSkyObject, Location, SkyContext } from '@/types/astronomy'
import { calculateLocalSiderealTime, equatorialToHorizontal, horizontalToScreen } from '@/utils/astronomyCalculations'
import { fetchOpenNgc } from '@/utils/realAstronomyEngine'

export interface UseDeepSkyReturn {
  objects: DeepSkyObject[]
  loading: boolean
  error: string | null
}

export const useDeepSkyData = (
  location: Location | null,
  currentTime: Date,
  screenWidth: number = typeof window !== 'undefined' ? window.innerWidth : 1920,
  screenHeight: number = typeof window !== 'undefined' ? window.innerHeight : 1080,
  magnitudeLimit: number = 11.0
): UseDeepSkyReturn => {
  const [rawObjects, setRawObjects] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!location) return
      try {
        setLoading(true)
        const data = await fetchOpenNgc()
        setRawObjects(data)
        setError(null)
      } catch (e) {
        setError('Failed to load deep-sky catalog')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [location])

  const objects: DeepSkyObject[] = useMemo(() => {
    if (!location || !rawObjects.length) return []

    const lst = calculateLocalSiderealTime(location, currentTime)

    return rawObjects
      .filter((o: any) => (o.mag ?? 99) <= magnitudeLimit)
      .map((o: any) => {
        const { azimuth, altitude } = equatorialToHorizontal(o.ra * 15, o.dec, lst, location.latitude)
        const { x, y, visible } = horizontalToScreen(azimuth, altitude, screenWidth, screenHeight)
        const objectType = mapNgcType(o.type)
        const name = o.name || `${o.catalog || 'NGC'} ${o.id}`
        return {
          id: `${o.catalog || 'NGC'}-${o.id}`,
          name,
          catalog: o.catalog || 'NGC',
          objectType,
          rightAscension: o.ra,
          declination: o.dec,
          magnitude: o.mag,
          sizeArcMin: o.size,
          x,
          y,
          visible,
          azimuth,
          altitude,
        } as DeepSkyObject
      })
      .filter((o: DeepSkyObject) => o.visible)
  }, [location, currentTime, rawObjects, screenWidth, screenHeight, magnitudeLimit])

  return { objects, loading, error }
}

const mapNgcType = (t: string): DeepSkyObject['objectType'] => {
  switch (t) {
    case 'G': return 'galaxy'
    case 'N': return 'nebula'
    case 'OC': return 'cluster'
    case 'GC': return 'cluster'
    case 'PN': return 'planetary_nebula'
    default: return 'other'
  }
}


