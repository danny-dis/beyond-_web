'use client'

import React, { useState } from 'react'
import { X, Clock, Moon, Sun, Eye, EyeOff, Palette, RotateCcw } from 'lucide-react'

interface ControlPanelProps {
  currentTime: Date
  onTimeChange: (time: Date) => void
  isLiveTime: boolean
  onLiveTimeChange: (enabled: boolean) => void
  nightMode: boolean
  onNightModeChange: (enabled: boolean) => void
  showSatellites: boolean
  onShowSatellitesChange: (enabled: boolean) => void
  showDeepSky?: boolean
  onShowDeepSkyChange?: (enabled: boolean) => void
  isOfflineMode?: boolean
  onOfflineModeChange?: (enabled: boolean) => void
  onSaveOfflinePack?: () => void
  onDownloadOfflinePack?: () => void
  onImportOfflinePack?: (pack: any) => void
  isARMode?: boolean
  onARModeChange?: (enabled: boolean) => void
  visible: boolean
  onClose: () => void
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  currentTime,
  onTimeChange,
  isLiveTime,
  onLiveTimeChange,
  nightMode,
  onNightModeChange,
  showSatellites,
  onShowSatellitesChange,
  showDeepSky = false,
  onShowDeepSkyChange,
  isOfflineMode = false,
  onOfflineModeChange,
  onSaveOfflinePack,
  onDownloadOfflinePack,
  onImportOfflinePack,
  isARMode = false,
  onARModeChange,
  visible,
  onClose
}) => {
  const [showConstellations, setShowConstellations] = useState(true)
  const [showStarNames, setShowStarNames] = useState(false)
  const [minimumMagnitude, setMinimumMagnitude] = useState(6.0)
  const [timeSpeed, setTimeSpeed] = useState(1) // 1x normal speed

  if (!visible) return null

  const handleTimeReset = () => {
    onTimeChange(new Date())
  }

  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const adjustTime = (hours: number) => {
    const newTime = new Date(currentTime)
    newTime.setHours(newTime.getHours() + hours)
    onTimeChange(newTime)
  }

  const onTimeInputChange = (value: string) => {
    // value in format HH:MM
    const match = value.match(/^(\d{2}):(\d{2})$/)
    if (!match) return
    const [_, hh, mm] = match
    const newTime = new Date(currentTime)
    newTime.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0)
    onTimeChange(newTime)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className={`control-panel ${nightMode ? 'bg-space-dark text-white' : 'bg-white text-gray-800 border border-gray-300'} rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold">Sky Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Time Controls */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Time Controls
            </h3>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-300 mb-2">Current Time</div>
              <div className="font-mono text-lg mb-3">{formatTime(currentTime)}</div>
              
              {/* Live time toggle */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span>Live Time</span>
                </div>
                <button
                  onClick={() => {
                    const next = !isLiveTime
                    onLiveTimeChange(next)
                    if (next) {
                      onTimeChange(new Date())
                    }
                  }}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    isLiveTime ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      isLiveTime ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Exact time picker */}
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-2">Set Exact Time (HH:MM)</label>
                <input
                  type="time"
                  value={`${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`}
                  onChange={(e) => onTimeInputChange(e.target.value)}
                  className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  onClick={() => adjustTime(-6)}
                  className="astro-button text-sm py-1"
                >
                  -6h
                </button>
                <button
                  onClick={() => adjustTime(-1)}
                  className="astro-button text-sm py-1"
                >
                  -1h
                </button>
                <button
                  onClick={() => adjustTime(1)}
                  className="astro-button text-sm py-1"
                >
                  +1h
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleTimeReset}
                  className="astro-button text-sm py-1 flex items-center justify-center"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Now
                </button>
                <button
                  onClick={() => {
                    const midnight = new Date(currentTime)
                    midnight.setHours(0, 0, 0, 0)
                    onTimeChange(midnight)
                  }}
                  className="astro-button text-sm py-1"
                >
                  Midnight
                </button>
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Palette className="w-5 h-5 mr-2" />
              Display Settings
            </h3>
            
            <div className="space-y-3">
              {/* Theme Mode */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {nightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  <span>{nightMode ? 'Night Mode' : 'Light Mode'}</span>
                </div>
                <button
                  onClick={() => onNightModeChange(!nightMode)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    nightMode ? 'bg-red-600' : 'bg-yellow-500'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      nightMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Artificial Satellites */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span>Artificial Satellites</span>
                </div>
                <button
                  onClick={() => onShowSatellitesChange(!showSatellites)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    showSatellites ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      showSatellites ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* AR Mode */}
              {onARModeChange && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span>Augmented Reality</span>
                  </div>
                  <button
                    onClick={() => onARModeChange(!isARMode)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      isARMode ? 'bg-indigo-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        isARMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Deep-Sky Objects */}
              {onShowDeepSkyChange && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span>Deep-Sky Objects (galaxies, nebulae)</span>
                  </div>
                  <button
                    onClick={() => onShowDeepSkyChange(!showDeepSky)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      showDeepSky ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        showDeepSky ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Offline Pack */}
              {onOfflineModeChange && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span>Offline Mode</span>
                    </div>
                    <button
                      onClick={() => onOfflineModeChange(!isOfflineMode)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        isOfflineMode ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          isOfflineMode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={onSaveOfflinePack}
                      className="astro-button text-sm py-1"
                    >
                      Save Offline
                    </button>
                    <button
                      onClick={onDownloadOfflinePack}
                      className="astro-button text-sm py-1"
                    >
                      Download JSON
                    </button>
                    <label className="astro-button text-sm py-1 text-center cursor-pointer">
                      Import JSON
                      <input
                        type="file"
                        accept="application/json"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          try {
                            const text = await file.text()
                            const data = JSON.parse(text)
                            onImportOfflinePack?.(data)
                          } catch {}
                          e.currentTarget.value = ''
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Show Constellations */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {showConstellations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span>Constellation Lines</span>
                </div>
                <button
                  onClick={() => setShowConstellations(!showConstellations)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    showConstellations ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      showConstellations ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Show Star Names */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {showStarNames ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span>Star Names</span>
                </div>
                <button
                  onClick={() => setShowStarNames(!showStarNames)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    showStarNames ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      showStarNames ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Star Visibility */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Star Visibility</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Minimum Magnitude: {minimumMagnitude.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="0.1"
                  value={minimumMagnitude}
                  onChange={(e) => setMinimumMagnitude(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Bright</span>
                  <span>Faint</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-400">
                Lower values show only the brightest stars. Higher values show more faint stars.
              </div>
            </div>
          </div>

          {/* Information */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-semibold mb-3">Tips</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <div>• Click on any star to learn more about it</div>
              <div>• Use night mode to preserve your night vision</div>
              <div>• Adjust time to see how the sky changes</div>
              <div>• Higher magnitude values show fainter stars</div>
              <div>• Your location affects which stars are visible</div>
            </div>
          </div>

          {/* About */}
          <div className="border-t border-gray-700 pt-4 text-center">
            <div className="text-sm text-gray-400">
              Beyond Web - Interactive Star Map
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Built with ❤️ for stargazers everywhere
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ControlPanel
