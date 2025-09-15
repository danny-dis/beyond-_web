'use client'

import { useState, useEffect, useMemo } from 'react'
import { Location, Star, StarCatalogEntry, SkyContext, DeepSkyObject } from '@/types/astronomy'
import { processStarData } from '@/utils/astronomyCalculations'
import { getVisibleStarsForLocation, fetchHygStars } from '@/utils/realAstronomyEngine'

interface UseStarDataReturn {
  stars: Star[]
  loading: boolean
  error: string | null
  totalStars: number
  visibleStars: number
}

export const useStarData = (
  location: Location | null,
  currentTime: Date,
  screenWidth: number = typeof window !== 'undefined' ? window.innerWidth : 1920,
  screenHeight: number = typeof window !== 'undefined' ? window.innerHeight : 1080,
  minimumMagnitude: number = 5.0 // Show more stars by default
): UseStarDataReturn => {
  const [starCatalog, setStarCatalog] = useState<StarCatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load star catalog based on location - simplified for all devices
  useEffect(() => {
    const loadStarCatalog = async () => {
      if (!location) return

      try {
        setLoading(true)
        // Loading stars for location

        // Use HYG provider (stubbed) for broader dataset
        const allStars = await fetchHygStars()

        // Simple filtering that works on all devices
        const visibleStars = allStars.filter(star => {
          // Show bright stars (magnitude filter)
          if (star.mag > minimumMagnitude) return false

          // Basic location filtering
          const lat = location.latitude

          // Simple declination check
          if (Math.abs(lat) < 30) {
            // Near equator (like Kenya) - can see most stars
            return star.dec >= -75 && star.dec <= 75
          } else if (lat > 0) {
            // Northern hemisphere
            return star.dec >= lat - 85
          } else {
            // Southern hemisphere
            return star.dec <= lat + 85
          }
        })

        setStarCatalog(visibleStars)
        setError(null)
        // Stars loaded successfully
      } catch (err) {
        // Error loading star catalog
        setError('Failed to load stars - please refresh')
      } finally {
        setLoading(false)
      }
    }

    loadStarCatalog()
  }, [location, currentTime, minimumMagnitude])

  // Process star data when location, time, or catalog changes
  const stars = useMemo(() => {
    if (!location || !starCatalog.length) {
      return []
    }

    const context: SkyContext = {
      location,
      dateTime: currentTime,
      localSiderealTime: 0 // Will be calculated in processStarData
    }

    try {
      return processStarData(starCatalog, context, screenWidth, screenHeight, minimumMagnitude)
    } catch (err) {
      console.error('Error processing star data:', err)
      return []
    }
  }, [location, currentTime, starCatalog, screenWidth, screenHeight, minimumMagnitude])

  const visibleStars = stars.filter(star => star.visible).length

  return {
    stars,
    loading,
    error,
    totalStars: starCatalog.length,
    visibleStars
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
    ).slice(0, 10) // Limit to 10 results

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

  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const filterStars = (stars: Star[]): Star[] => {
    return stars.filter(star => {
      // Magnitude filter
      if (star.magnitude > filters.minimumMagnitude) {
        return false
      }

      // Spectral class filter
      const spectralClass = star.spectralClass.charAt(0).toUpperCase()
      if (!filters.spectralClasses.includes(spectralClass)) {
        return false
      }

      return true
    })
  }

  return {
    filters,
    updateFilter,
    filterStars
  }
}
