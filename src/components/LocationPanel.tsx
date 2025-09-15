'use client'

import React, { useState } from 'react'
import { MapPin, Navigation, Globe, X } from 'lucide-react'
import { Location } from '@/types/astronomy'

interface LocationPanelProps {
  location: Location | null
  loading: boolean
  error: string | null
  onRequestLocation: () => void
  onLocationChange?: (location: Location) => void
  nightMode?: boolean
}

const LocationPanel: React.FC<LocationPanelProps> = ({
  location,
  loading,
  error,
  onRequestLocation,
  onLocationChange,
  nightMode = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [manualLocation, setManualLocation] = useState('')

  const handleManualLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualLocation.trim()) return

    try {
      // Use a geocoding service to get precise coordinates
      const query = encodeURIComponent(manualLocation.trim())

      // Try multiple geocoding services for better coverage
      let locationData: Location | null = null

      // First try: Nominatim (OpenStreetMap) - free and good for cities
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&addressdetails=1`
        )
        const data = await response.json()

        if (data && data.length > 0) {
          const result = data[0]
          locationData = {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            city: result.address?.city || result.address?.town || result.address?.village || result.display_name.split(',')[0],
            country: result.address?.country || 'Unknown'
          }
        }
      } catch (nominatimError) {
        console.warn('Nominatim geocoding failed:', nominatimError)
      }

      // Fallback: Try coordinate parsing for both comma and space separated inputs
      if (!locationData) {
        const normalized = manualLocation.trim().replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',')
        let parts: string[] = []
        if (normalized.includes(',')) {
          parts = normalized.split(',').map(p => p.trim())
        } else if (normalized.includes(' ')) {
          parts = normalized.split(' ').map(p => p.trim())
        }
        if (parts.length === 2) {
          const lat = parseFloat(parts[0])
          const lng = parseFloat(parts[1])
          if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            locationData = {
              latitude: lat,
              longitude: lng,
              city: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              country: 'Custom Location'
            }
          }
        }
      }

      if (locationData) {
        onLocationChange?.(locationData)
        setManualLocation('')
        setIsExpanded(false)
        // Location set successfully
      } else {
        alert('Location not found. Try "City, Country" or "latitude, longitude"')
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      alert('Failed to find location. Please try again.')
    }
  }

  return (
    <div className="absolute top-20 right-4 z-40">
      {/* Compact location display */}
      <div
        className={`p-3 rounded-lg cursor-pointer transition-all ${
          nightMode
            ? 'bg-black bg-opacity-80 hover:bg-opacity-90 text-white'
            : 'bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 border border-gray-300 shadow-lg'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <MapPin className={`w-4 h-4 ${nightMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <div className={`text-sm font-medium ${nightMode ? 'text-white' : 'text-gray-800'}`}>
            {loading ? (
              <span>Getting location...</span>
            ) : location ? (
              <span>
                {location.city ? `${location.city}, ${location.country}` : 'Custom Location'}
              </span>
            ) : (
              <span>No location</span>
            )}
          </div>
        </div>

        {location && (
          <div className={`text-xs mt-1 ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
          </div>
        )}
      </div>

      {/* Expanded location panel */}
      {isExpanded && (
        <div className={`location-panel absolute top-full right-0 mt-2 ${nightMode ? 'bg-black bg-opacity-90 text-white' : 'bg-white bg-opacity-95 text-gray-800 border border-gray-300'} p-4 rounded-lg w-80 max-w-sm sm:w-96 md:w-80 max-h-[80vh] overflow-y-auto`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center">
              <Globe className="w-4 h-4 mr-2" />
              Location Settings
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className={`${nightMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current location info */}
          {location && (
            <div className={`mb-4 p-3 rounded-lg ${nightMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <div className={`font-medium ${nightMode ? 'text-white' : 'text-gray-800'}`}>Current Location</div>
              <div className={`text-sm mt-1 ${nightMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {location.city && (
                  <div>{location.city}, {location.country}</div>
                )}
                <div>
                  Lat: {location.latitude.toFixed(6)}°<br />
                  Lng: {location.longitude.toFixed(6)}°
                </div>
                {location.timezone && (
                  <div className={`text-xs mt-1 ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Timezone: {location.timezone}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded-lg">
              <div className="text-red-300 text-sm">{error}</div>
            </div>
          )}

          {/* Location actions */}
          <div className="space-y-3">
            <button
              onClick={onRequestLocation}
              disabled={loading}
              className="w-full astro-button flex items-center justify-center space-x-2"
            >
              <Navigation className="w-4 h-4" />
              <span>{loading ? 'Getting Location...' : 'Use My Location'}</span>
            </button>

            {/* Manual location input */}
            <form onSubmit={handleManualLocationSubmit} className="space-y-2">
              <input
                type="text"
                placeholder="e.g. Nakuru, Kenya or -0.3031, 36.0800"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                className={`w-full p-2 rounded border focus:outline-none text-sm ${nightMode ? 'bg-gray-800 text-white border-gray-600 focus:border-red-500' : 'bg-white text-black border-gray-300 focus:border-blue-500'}`}
              />
              <button
                type="submit"
                className="w-full astro-button text-sm"
                disabled={!manualLocation.trim()}
              >
                Find Location
              </button>
              <div className={`text-xs ${nightMode ? 'text-gray-400' : 'text-gray-700'}`}>
                💡 Try: "Nakuru", "Mombasa, Kenya", or exact coordinates
              </div>
            </form>

            {/* Popular locations */}
            <div className="border-t border-gray-700 pt-3">
              <div className="text-sm font-medium mb-2">Popular Locations</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  // Kenyan cities for precise location
                  { name: 'Nairobi', lat: -1.2921, lng: 36.8219, country: 'Kenya' },
                  { name: 'Nakuru', lat: -0.3031, lng: 36.0800, country: 'Kenya' },
                  { name: 'Mombasa', lat: -4.0435, lng: 39.6682, country: 'Kenya' },
                  { name: 'Kisumu', lat: -0.1022, lng: 34.7617, country: 'Kenya' },
                  { name: 'Eldoret', lat: 0.5143, lng: 35.2698, country: 'Kenya' },
                  // International cities
                  { name: 'London', lat: 51.5074, lng: -0.1278, country: 'UK' },
                  { name: 'New York', lat: 40.7128, lng: -74.0060, country: 'USA' },
                  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, country: 'Japan' },
                  { name: 'Sydney', lat: -33.8688, lng: 151.2093, country: 'Australia' },
                  { name: 'Cairo', lat: 30.0444, lng: 31.2357, country: 'Egypt' }
                ].map((city) => (
                  <button
                    key={city.name}
                    onClick={() => {
                      const newLocation: Location = {
                        latitude: city.lat,
                        longitude: city.lng,
                        city: city.name,
                        country: city.country
                      }
                      onLocationChange?.(newLocation)
                      setIsExpanded(false)
                      // Location set successfully
                    }}
                    className={`p-2 rounded text-left transition-colors font-medium ${nightMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                  >
                    {city.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Location info */}
          <div className={`mt-4 pt-3 text-xs ${nightMode ? 'border-t border-gray-700 text-gray-400' : 'border-t border-gray-300 text-gray-700'}`}>
            <div className="mb-1">
              🌟 Your location determines which stars are visible in your sky
            </div>
            <div>
              🕐 Time affects star positions throughout the night
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LocationPanel
