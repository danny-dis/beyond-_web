'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Location, Star, StarCatalogEntry, SkyContext, CelestialObject } from '@/types/astronomy'
import { processStarData } from '@/utils/astronomyCalculations'
import { fetchHygStars } from '@/utils/realAstronomyEngine'
import { getSolarSystemObjects } from '@/utils/solarSystem'

interface UseStarDataReturn {
  stars: Star[]
  solarSystem: CelestialObject[]
  loading: boolean
  error: string | null
  totalStars: number
  visibleStars: number
  lastUpdated: Date | null
}

export const useStarData = (
  location: Location | null,
  currentTime: Date,
  screenWidth: number = typeof window !== 'undefined' ? window.innerWidth : 1920,
  screenHeight: number = typeof window !== 'undefined' ? window.innerHeight : 1080,
  minimumMagnitude: number = 5.0
): UseStarDataReturn => {
  const [starCatalog, setStarCatalog] = useState<StarCatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Load star catalog from HYG API
  useEffect(() => {
    let cancelled = false
    
    const loadStarCatalog = async () => {
      if (!location) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch from our local-backed API
        const allStars = await fetchHygStars({ 
          minMag: -2, 
          maxMag: Math.max(minimumMagnitude, 6.5), 
          limit: 8000 
        })

        if (cancelled) return

        if (allStars.length > 0) {
          setStarCatalog(allStars)
          setLastUpdated(new Date())
          setError(null)
        } else {
          setError('No stars loaded - using fallback catalog')
          setStarCatalog([])
        }
      } catch (err) {
        if (cancelled) return
        console.error('Error loading star catalog:', err)
        setError('Failed to load stars - using fallback')
        setStarCatalog([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadStarCatalog()
    
    // Reload every 5 minutes to catch time-based visibility changes
    const interval = setInterval(loadStarCatalog, 5 * 60 * 1000)
    
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [location?.latitude, location?.longitude, minimumMagnitude])

  // Process star data when location, time, or catalog changes
  const stars = useMemo(() => {
    if (!location || starCatalog.length === 0) return []

    const context: SkyContext = {
      location,
      dateTime: currentTime,
      localSiderealTime: 0
    }

    try {
      return processStarData(starCatalog, context, screenWidth, screenHeight, minimumMagnitude)
    } catch (err) {
      console.error('Error processing star data:', err)
      return []
    }
  }, [location, currentTime, starCatalog, screenWidth, screenHeight, minimumMagnitude])

  // Calculate solar system objects
  const solarSystem = useMemo(() => {
    if (!location) return []
    try {
      return getSolarSystemObjects(location, currentTime)
    } catch (err) {
      console.error('Error calculating solar system:', err)
      return []
    }
  }, [location, currentTime])

  const visibleStars = stars.filter(star => star.visible).length

  return {
    stars,
    solarSystem,
    loading,
    error,
    totalStars: starCatalog.length,
    visibleStars,
    lastUpdated
  }
}

// Hook for searching stars
export const useStarSearch = (stars: Star[]) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Star[]>([])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const query = searchQuery.toLowerCase()
    const results = stars.filter(star => 
      star.name.toLowerCase().includes(query) ||
      (star.commonName && star.commonName.toLowerCase().includes(query)) ||
      star.constellation.toLowerCase().includes(query)
    ).slice(0, 10)

    setSearchResults(results)
  }, [searchQuery, stars])

  return {
    searchQuery,
    setSearchQuery,
    searchResults
  }
}

// Hook for star filtering
export const useStarFilter = () => {
  const [filters, setFilters] = useState({
    minimumMagnitude: 6.0,
    showConstellations: true,
    showStarNames: true,
    spectralClasses: ['O', 'B', 'A', 'F', 'G', 'K', 'M']
  })

  const updateFilter = useCallback((key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const filterStars = useCallback((stars: Star[]): Star[] => {
    return stars.filter(star => {
      if (star.magnitude > filters.minimumMagnitude) return false
      const spectralClass = star.spectralClass.charAt(0).toUpperCase()
      if (!filters.spectralClasses.includes(spectralClass)) return false
      return true
    })
  }, [filters])

  return {
    filters,
    updateFilter,
    filterStars
  }
}
