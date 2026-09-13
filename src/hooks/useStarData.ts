'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Location, Star, StarCatalogEntry, SkyContext, CelestialObject } from '@/types/astronomy'
import { processStarData } from '@/utils/astronomyCalculations'
import { fetchHygStars } from '@/utils/realAstronomyEngine'
import { 
  calculateStarPosition, 
  calculatePlanetPosition,
  calculateMoonPosition,
  calculateSunPosition,
  getStarColor
} from '@/utils/astrometry'
import * as Astronomy from 'astronomy-engine'

interface UseStarDataReturn {
  stars: Star[]
  solarSystem: CelestialObject[]
  loading: boolean
  error: string | null
  totalStars: number
  visibleStars: number
  lastUpdated: Date | null
  engine: 'astronomy-engine' | 'fallback'
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
  const [useEngine, setUseEngine] = useState(true)

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
    
    const interval = setInterval(loadStarCatalog, 5 * 60 * 1000)
    
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [location?.latitude, location?.longitude, minimumMagnitude])

  // Process star data using astronomy-engine when possible
  const stars = useMemo(() => {
    if (!location || starCatalog.length === 0) return []

    const context: SkyContext = {
      location,
      dateTime: currentTime,
      localSiderealTime: 0
    }

    try {
      if (useEngine) {
        // Use astronomy-engine for research-grade positions
        const processedStars: Star[] = []
        
        for (const catalogStar of starCatalog) {
          try {
            // Calculate position with proper motion propagation
            const pos = calculateStarPosition(
              {
                name: catalogStar.name,
                ra: catalogStar.ra,
                dec: catalogStar.dec,
                pmra: catalogStar.pmra,
                pmdec: catalogStar.pmdec,
                plx: catalogStar.plx,
                rv: catalogStar.rv,
                mag: catalogStar.mag,
                spect: catalogStar.spectralClass,
                dist: catalogStar.distance,
                con: catalogStar.constellation
              },
              currentTime,
              location.latitude,
              location.longitude,
              0,
              screenWidth,
              screenHeight
            )
            
            if (pos) {
              processedStars.push({
                id: catalogStar.id,
                name: catalogStar.name,
                commonName: catalogStar.commonName,
                constellation: catalogStar.constellation,
                rightAscension: catalogStar.ra,
                declination: catalogStar.dec,
                magnitude: catalogStar.mag,
                spectralClass: catalogStar.spectralClass,
                temperature: catalogStar.temp,
                distance: catalogStar.distance,
                color: getStarColor(catalogStar.spectralClass),
                x: pos.x,
                y: pos.y,
                visible: pos.visible,
                azimuth: pos.az,
                altitude: pos.alt
              })
            }
          } catch {
            // Skip stars that fail calculation
          }
        }
        
        return processedStars
      } else {
        // Fallback to simple calculations
        return processStarData(starCatalog, context, screenWidth, screenHeight, minimumMagnitude)
      }
    } catch (err) {
      console.error('Error processing star data:', err)
      setUseEngine(false) // Switch to fallback on error
      return processStarData(starCatalog, context, screenWidth, screenHeight, minimumMagnitude)
    }
  }, [location, currentTime, starCatalog, screenWidth, screenHeight, minimumMagnitude, useEngine])

  // Calculate solar system objects using astronomy-engine
  const solarSystem = useMemo(() => {
    if (!location) return []
    
    try {
      const objects: CelestialObject[] = []
      
      // Sun
      const sun = calculateSunPosition(currentTime, location.latitude, location.longitude)
      if (sun) {
        objects.push({
          id: 'sun',
          name: 'Sun',
          type: 'planet',
          x: (sun.az / 360) * screenWidth,
          y: screenHeight - ((sun.alt + 30) / 120) * screenHeight,
          visible: sun.visible,
          magnitude: sun.mag,
          azimuth: sun.az,
          altitude: sun.alt,
          phase: 1
        })
      }
      
      // Moon
      const moon = calculateMoonPosition(currentTime, location.latitude, location.longitude)
      if (moon) {
        objects.push({
          id: 'moon',
          name: 'Moon',
          type: 'moon',
          x: (moon.az / 360) * screenWidth,
          y: screenHeight - ((moon.alt + 30) / 120) * screenHeight,
          visible: moon.visible,
          magnitude: moon.mag,
          azimuth: moon.az,
          altitude: moon.alt,
          phase: moon.phase
        })
      }
      
      // Planets
      const planetBodies = [
        { body: Astronomy.Body.Mercury, name: 'Mercury' },
        { body: Astronomy.Body.Venus, name: 'Venus' },
        { body: Astronomy.Body.Mars, name: 'Mars' },
        { body: Astronomy.Body.Jupiter, name: 'Jupiter' },
        { body: Astronomy.Body.Saturn, name: 'Saturn' },
      ]
      
      for (const { body, name } of planetBodies) {
        const planet = calculatePlanetPosition(body, currentTime, location.latitude, location.longitude)
        if (planet) {
          objects.push({
            id: name.toLowerCase(),
            name,
            type: 'planet',
            x: (planet.az / 360) * screenWidth,
            y: screenHeight - ((planet.alt + 30) / 120) * screenHeight,
            visible: planet.visible,
            magnitude: planet.mag,
            azimuth: planet.az,
            altitude: planet.alt,
            phase: planet.phase
          })
        }
      }
      
      return objects
    } catch (err) {
      console.error('Error calculating solar system:', err)
      return []
    }
  }, [location, currentTime, screenWidth, screenHeight])

  const visibleStars = stars.filter(star => star.visible).length

  return {
    stars,
    solarSystem,
    loading,
    error,
    totalStars: starCatalog.length,
    visibleStars,
    lastUpdated,
    engine: useEngine ? 'astronomy-engine' : 'fallback'
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
