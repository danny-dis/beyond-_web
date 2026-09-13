'use client'

import { useState, useEffect } from 'react'
import { Star, MapPin, Clock, Info, Settings, Moon, X } from 'lucide-react'
import SkyMap from '@/components/SkyMap'
import LocationPanel from '@/components/LocationPanel'
import StarInfoPanel from '@/components/StarInfoPanel'
import ControlPanel from '@/components/ControlPanel'
import ARView from '@/components/ARView'
import { useLocation } from '@/hooks/useLocation'
import { useStarData } from '@/hooks/useStarData'
import { useDeepSkyData } from '@/hooks/useDeepSkyData'
import { Location as AstroLocation } from '@/types/astronomy'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const [selectedStar, setSelectedStar] = useState<any>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [nightMode, setNightMode] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isLiveTime, setIsLiveTime] = useState(true)
  const [showSatellites, setShowSatellites] = useState(false)
  
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
  
  const [showDeepSky, setShowDeepSky] = useState(false)
  const { objects: deepSkyObjects, loading: deepSkyLoading } = useDeepSkyData(currentLocation, currentTime)
  
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [offlinePack, setOfflinePack] = useState<any | null>(null)
  const [isARMode, setIsARMode] = useState(false)

  const handleSaveOfflinePack = () => {
    const pack = {
      savedAt: new Date().toISOString(),
      location: currentLocation,
      time: currentTime.toISOString(),
      stars,
      deepSky: deepSkyObjects,
    }
    setOfflinePack(pack)
    if (typeof window !== 'undefined') {
      localStorage.setItem('beyondweb-offline-pack', JSON.stringify(pack))
    }
  }

  const handleDownloadOfflinePack = () => {
    const pack = offlinePack || (typeof window !== 'undefined' ? localStorage.getItem('beyondweb-offline-pack') : null)
    const data = typeof pack === 'string' ? pack : JSON.stringify(pack || {}, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'beyondweb-offline-pack.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportOfflinePack = (pack: any) => {
    setOfflinePack(pack)
    setIsOfflineMode(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem('beyondweb-offline-pack', JSON.stringify(pack))
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('beyondweb-theme', nightMode ? 'night' : 'light')
    }
  }, [nightMode])

  useEffect(() => {
    if (!isLiveTime) return
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [isLiveTime])

  const handleStarClick = (star: any) => {
    setSelectedStar(star)
    setShowInfo(true)
  }

  const handleLocationChange = (newLocation: AstroLocation) => {
    setManualLocation(newLocation)
  }

  const handleCloseInfo = () => {
    setShowInfo(false)
    setSelectedStar(null)
  }

  return (
    <div className={`min-h-screen relative ${nightMode ? 'night-mode bg-space-dark' : 'light-mode bg-gray-100'}`}>
      <header className="absolute top-0 left-0 right-0 z-50 p-2 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Star className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
            <h1 className={`text-lg sm:text-2xl font-bold ${nightMode ? 'text-white' : 'text-gray-800'}`}>Beyond</h1>
            <span className={`text-xs sm:text-sm ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>Web</span>

            {currentLocation && (
              <div className={`hidden sm:flex items-center ml-4 px-2 py-1 rounded-lg ${nightMode ? 'bg-black bg-opacity-40' : 'bg-white bg-opacity-80 border border-gray-300'}`}>
                <MapPin className={`w-3 h-3 mr-1 ${nightMode ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`text-xs ${nightMode ? 'text-gray-300' : 'text-black'}`}>
                  {currentLocation.city || `${currentLocation.latitude.toFixed(2)}°, ${currentLocation.longitude.toFixed(2)}°`}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            {currentLocation ? (
              <div className={`sm:hidden flex items-center px-2 py-1 rounded text-xs ${nightMode ? 'bg-black bg-opacity-40' : 'bg-white bg-opacity-80 border border-gray-300'}`}>
                <MapPin className={`w-3 h-3 mr-1 ${nightMode ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`max-w-20 truncate ${nightMode ? 'text-gray-300' : 'text-black'}`}>
                  {currentLocation.city || 'Custom'}
                </span>
              </div>
            ) : (
              <button
                onClick={requestLocation}
                className="astro-button p-1 sm:p-2 md:hidden"
                title="Get My Location"
              >
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            <button
              onClick={() => setShowInfo(!showInfo)}
              className="astro-button p-1 sm:p-2"
              title="Star Information"
            >
              <Info className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={() => setNightMode(!nightMode)}
              className="astro-button p-1 sm:p-2"
              title={nightMode ? "Switch to Light Mode" : "Switch to Night Mode"}
            >
              {nightMode ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Star className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="astro-button p-1 sm:p-2"
              title="Settings"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="h-screen">
        {!isARMode ? (
          <SkyMap
            location={currentLocation}
            stars={isOfflineMode && offlinePack?.stars ? offlinePack.stars : stars}
            solarSystem={solarSystem}
            currentTime={currentTime}
            onStarClick={handleStarClick}
            nightMode={nightMode}
            loading={starsLoading || locationLoading}
            showSatellites={showSatellites}
            deepSkyObjects={showDeepSky ? (isOfflineMode && offlinePack?.deepSky ? offlinePack.deepSky : deepSkyObjects) : []}
          />
        ) : (
          <ARView nightMode={nightMode} onClose={() => setIsARMode(false)} />
        )}
      </main>

      {showDeepSky && (
        <div className="pointer-events-none absolute inset-0" />
      )}

      <LocationPanel
        location={currentLocation}
        loading={locationLoading}
        error={locationError}
        onRequestLocation={requestLocation}
        onLocationChange={handleLocationChange}
        nightMode={nightMode}
      />

      <ControlPanel
        currentTime={currentTime}
        onTimeChange={setCurrentTime}
        isLiveTime={isLiveTime}
        onLiveTimeChange={setIsLiveTime}
        nightMode={nightMode}
        onNightModeChange={setNightMode}
        showSatellites={showSatellites}
        onShowSatellitesChange={setShowSatellites}
        showDeepSky={showDeepSky}
        onShowDeepSkyChange={setShowDeepSky}
        isOfflineMode={isOfflineMode}
        onOfflineModeChange={setIsOfflineMode}
        onSaveOfflinePack={handleSaveOfflinePack}
        onDownloadOfflinePack={handleDownloadOfflinePack}
        onImportOfflinePack={handleImportOfflinePack}
        isARMode={isARMode}
        onARModeChange={setIsARMode}
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {showInfo && (
        <StarInfoPanel
          star={selectedStar}
          onClose={handleCloseInfo}
          nightMode={nightMode}
        />
      )}

      {/* Error display */}
      {starsError && !starsLoading && (
        <div className="absolute bottom-4 right-4 bg-red-500 bg-opacity-90 text-white p-3 rounded-lg z-40 max-w-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm">{starsError}</span>
            <button onClick={() => window.location.reload()} className="ml-2 text-xs underline">
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
