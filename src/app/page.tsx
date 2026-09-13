'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Star, MapPin, Moon, Sun, Settings, X, Navigation, Search } from 'lucide-react'
import SkyMap from '@/components/SkyMap'
import StarInfoPanel from '@/components/StarInfoPanel'
import { useLocation } from '@/hooks/useLocation'
import { useStarData } from '@/hooks/useStarData'
import { useDeepSkyData } from '@/hooks/useDeepSkyData'
import { Location as AstroLocation } from '@/types/astronomy'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const [selectedStar, setSelectedStar] = useState<any>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [nightMode, setNightMode] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isLiveTime, setIsLiveTime] = useState(true)
  const [showSatellites, setShowSatellites] = useState(false)
  const [showDeepSky, setShowDeepSky] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [offlinePack, setOfflinePack] = useState<any | null>(null)
  const [minimumMagnitude, setMinimumMagnitude] = useState(5.0)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchOpen, setSearchOpen] = useState(false)

  const { location, loading: locationLoading, error: locationError, requestLocation } = useLocation()
  const [manualLocation, setManualLocation] = useState<AstroLocation | null>(null)
  const currentLocation: AstroLocation | null = manualLocation || location

  const {
    stars,
    solarSystem,
    loading: starsLoading,
    error: starsError,
    totalStars,
    visibleStars
  } = useStarData(currentLocation, currentTime)

  const { objects: deepSkyObjects, loading: deepSkyLoading } = useDeepSkyData(currentLocation, currentTime)

  // Filter stars based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const q = searchQuery.toLowerCase()
    const matches = stars.filter(star =>
      star.name.toLowerCase().includes(q) ||
      (star.commonName && star.commonName.toLowerCase().includes(q)) ||
      star.constellation.toLowerCase().includes(q)
    ).slice(0, 8)
    setSearchResults(matches)
  }, [searchQuery, stars])

  // Live time update
  useEffect(() => {
    if (!isLiveTime) return
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [isLiveTime])

  const handleStarClick = useCallback((star: any) => {
    setSelectedStar(star)
    setShowInfo(true)
  }, [])

  const handleCloseInfo = useCallback(() => {
    setShowInfo(false)
    setSelectedStar(null)
  }, [])

  const handleLocationChange = useCallback((newLocation: AstroLocation) => {
    setManualLocation(newLocation)
    setSidebarOpen(false)
  }, [])

  const adjustTime = useCallback((hours: number) => {
    setIsLiveTime(false)
    setCurrentTime(prev => {
      const next = new Date(prev)
      next.setHours(next.getHours() + hours)
      return next
    })
  }, [])

  const handleTimeReset = useCallback(() => {
    setIsLiveTime(true)
    setCurrentTime(new Date())
  }, [])

  const handleSearchSelect = useCallback((star: any) => {
    handleStarClick(star)
    setSearchQuery('')
    setSearchOpen(false)
  }, [handleStarClick])

  const toggleTime = useCallback(() => {
    setIsLiveTime(prev => {
      const next = !prev
      if (next) setCurrentTime(new Date())
      return next
    })
  }, [])

  const locationLabel = useMemo(() => {
    if (!currentLocation) return 'Set Location'
    return currentLocation.city || `${currentLocation.latitude.toFixed(2)}°, ${currentLocation.longitude.toFixed(2)}°`
  }, [currentLocation])

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-section">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              <span className="font-bold text-sm">Beyond Web</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="btn-icon md:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Location Section */}
        <div className="sidebar-section">
          <div className="section-title">Location</div>
          <div
            className="location-display"
            onClick={() => setSidebarOpen(true)}
            role="button"
            tabIndex={0}
          >
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="city truncate">{locationLabel}</div>
              {currentLocation && (
                <div className="coords">
                  {currentLocation.latitude.toFixed(4)}°, {currentLocation.longitude.toFixed(4)}°
                </div>
              )}
            </div>
          </div>

          {/* Quick locations */}
          <div className="location-chips mt-2">
            {[
              { name: 'Nairobi', lat: -1.2921, lng: 36.8219, country: 'Kenya' },
              { name: 'Nakuru', lat: -0.3031, lng: 36.0800, country: 'Kenya' },
              { name: 'Mombasa', lat: -4.0435, lng: 39.6682, country: 'Kenya' },
              { name: 'London', lat: 51.5074, lng: -0.1278, country: 'UK' },
              { name: 'New York', lat: 40.7128, lng: -74.0060, country: 'USA' },
              { name: 'Tokyo', lat: 35.6762, lng: 139.6503, country: 'Japan' },
            ].map((city) => (
              <button
                key={city.name}
                className="location-chip"
                onClick={() => handleLocationChange({
                  latitude: city.lat,
                  longitude: city.lng,
                  city: city.name,
                  country: city.country
                })}
              >
                {city.name}
              </button>
            ))}
          </div>

          {/* Use my location button */}
          {!location && (
            <button
              onClick={requestLocation}
              className="btn-primary w-full mt-2"
              disabled={locationLoading}
            >
              <Navigation className="w-3 h-3" />
              {locationLoading ? 'Getting location...' : 'Use My Location'}
            </button>
          )}

          {locationError && (
            <div className="mt-2 text-xs text-red-400">{locationError}</div>
          )}
        </div>

        {/* Search Section */}
        <div className="sidebar-section">
          <div className="section-title">Find a Star</div>
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, constellation..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true) }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            />
          </div>
          {searchOpen && searchResults.length > 0 && (
            <div className="mt-1 rounded-lg overflow-hidden bg-space-mid border border-white/5">
              {searchResults.map(star => (
                <button
                  key={star.id}
                  className="w-full text-left p-2 text-sm hover:bg-white/5 border-b border-white/5 last:border-b-0"
                  onMouseDown={() => handleSearchSelect(star)}
                >
                  <div className="font-medium text-white">{star.commonName || star.name}</div>
                  <div className="text-xs text-gray-400">
                    {star.constellation} • Mag {star.magnitude.toFixed(1)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Time Section */}
        <div className="sidebar-section">
          <div className="section-title">Time</div>
          <div className="time-display">
            {currentTime.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div className="time-controls">
            <button onClick={() => adjustTime(-6)}>-6h</button>
            <button onClick={() => adjustTime(-1)}>-1h</button>
            <button onClick={() => adjustTime(1)}>+1h</button>
            <button onClick={() => adjustTime(6)}>+6h</button>
            <button onClick={handleTimeReset} className={isLiveTime ? 'active' : ''}>
              Now
            </button>
            <button
              onClick={() => {
                setIsLiveTime(false)
                setCurrentTime(prev => {
                  const d = new Date(prev)
                  d.setHours(0, 0, 0, 0)
                  return d
                })
              }}
            >
              Midnight
            </button>
          </div>
          <div className="toggle-row mt-2">
            <span className="label">Live Time</span>
            <button
              className={`toggle-switch ${isLiveTime ? 'on' : ''}`}
              onClick={toggleTime}
              aria-label="Toggle live time"
            />
          </div>
        </div>

        {/* Display Section */}
        <div className="sidebar-section">
          <div className="section-title">Display</div>
          <div className="toggle-row">
            <span className="label">Night Mode</span>
            <button
              className={`toggle-switch ${nightMode ? 'on' : ''}`}
              onClick={() => setNightMode(!nightMode)}
              aria-label="Toggle night mode"
            />
          </div>
          <div className="toggle-row">
            <span className="label">Satellites</span>
            <button
              className={`toggle-switch ${showSatellites ? 'on' : ''}`}
              onClick={() => setShowSatellites(!showSatellites)}
              aria-label="Toggle satellites"
            />
          </div>
          <div className="toggle-row">
            <span className="label">Deep-Sky Objects</span>
            <button
              className={`toggle-switch ${showDeepSky ? 'on' : ''}`}
              onClick={() => setShowDeepSky(!showDeepSky)}
              aria-label="Toggle deep-sky objects"
            />
          </div>
          <div className="slider-row">
            <label>
              <span>Magnitude Limit</span>
              <span>{minimumMagnitude.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="1"
              max="8"
              step="0.1"
              value={minimumMagnitude}
              onChange={(e) => setMinimumMagnitude(parseFloat(e.target.value))}
            />
          </div>
        </div>

        {/* Stats Section */}
        <div className="sidebar-section">
          <div className="section-title">Statistics</div>
          <div className="info-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div className="info-card">
              <div className="label">Visible Stars</div>
              <div className="value">{visibleStars.toLocaleString()}</div>
            </div>
            <div className="info-card">
              <div className="label">Total Loaded</div>
              <div className="value">{totalStars.toLocaleString()}</div>
            </div>
            <div className="info-card">
              <div className="label">Deep-Sky</div>
              <div className="value">{deepSkyObjects.length}</div>
            </div>
            <div className="info-card">
              <div className="label">Engine</div>
              <div className="value small">astronomy-engine</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sidebar-section mt-auto">
          <div className="text-xs text-gray-500 text-center">
            Beyond Web v0.0.2 • Research-grade astrometry
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="main-area">
        {/* Header */}
        <header className="app-header">
          <div className="header-brand">
            <button
              className="btn-icon md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <Settings className="w-4 h-4" />
            </button>
            <Star className="w-5 h-5 text-yellow-400 hidden md:block" />
            <h1 className="hidden md:block">Beyond Web</h1>
            <span className="hidden md:block">v0.0.2</span>
          </div>

          <div className="header-actions">
            {currentLocation && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-xs text-gray-300">
                <MapPin className="w-3 h-3" />
                <span className="max-w-24 truncate">{locationLabel}</span>
              </div>
            )}
            <button
              className={`btn-icon ${nightMode ? 'active' : ''}`}
              onClick={() => setNightMode(!nightMode)}
              title={nightMode ? 'Switch to Light Mode' : 'Switch to Night Mode'}
            >
              {nightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              className="btn-icon md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Sky Map */}
        <div className="canvas-container">
          <SkyMap
            location={currentLocation}
            stars={stars}
            solarSystem={solarSystem}
            currentTime={currentTime}
            onStarClick={handleStarClick}
            nightMode={nightMode}
            loading={starsLoading || locationLoading}
            showSatellites={showSatellites}
            deepSkyObjects={showDeepSky ? deepSkyObjects : []}
          />
        </div>

        {/* Status Bar */}
        <div className="status-bar">
          <span className="dot" />
          <span>{visibleStars} stars visible</span>
          <span className="mx-1">•</span>
          <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {currentLocation && (
            <>
              <span className="mx-1">•</span>
              <span>{currentLocation.latitude.toFixed(2)}°, {currentLocation.longitude.toFixed(2)}°</span>
            </>
          )}
        </div>

        {/* Loading Overlay */}
        {(starsLoading || locationLoading) && (
          <div className="loading-overlay">
            <div className="loading-content">
              <div className="loading-spinner" />
              <span className="loading-text">
                {locationLoading ? 'Getting your location...' : 'Loading star catalog...'}
              </span>
            </div>
          </div>
        )}

        {/* Error display */}
        {starsError && !starsLoading && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm z-40">
            {starsError}
          </div>
        )}
      </div>

      {/* Star Info Panel */}
      {showInfo && (
        <div className="info-overlay">
          <StarInfoPanel
            star={selectedStar}
            onClose={handleCloseInfo}
            nightMode={nightMode}
          />
        </div>
      )}
    </div>
  )
}
