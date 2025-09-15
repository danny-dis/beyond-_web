'use client'

import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Star, Location, CelestialObject, DeepSkyObject } from '@/types/astronomy'
import { getStarSize } from '@/utils/astronomyCalculations'

interface SkyMapProps {
  location: Location | null
  stars: Star[]
  currentTime: Date
  onStarClick: (star: Star) => void
  nightMode: boolean
  loading: boolean
  showSatellites?: boolean
  deepSkyObjects?: DeepSkyObject[]
  satellites?: CelestialObject[]
}

const SkyMap: React.FC<SkyMapProps> = ({
  location,
  stars,
  currentTime,
  onStarClick,
  nightMode,
  loading,
  showSatellites = false,
  deepSkyObjects = [],
  satellites: satellitesFromProps = []
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 })
  const [hoveredStar, setHoveredStar] = useState<Star | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [skyOffset, setSkyOffset] = useState({ azimuth: 0, altitude: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Update canvas dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Generate simple artificial satellites (demo): positions shift with time
  const generatedSatellites: CelestialObject[] = useMemo(() => {
    if (!location) return []
    const base = currentTime.getTime() / 1000
    const satDefs = [
      { id: 'sat-iss', name: 'ISS', magnitude: 1.5 },
      { id: 'sat-starlink', name: 'Starlink', magnitude: 3.0 },
      { id: 'sat-hubble', name: 'Hubble', magnitude: 2.0 },
    ]
    return satDefs.map((s, idx) => {
      const azimuth = ((base / 10 + idx * 120) % 360 + 360) % 360
      const altitude = 20 + 30 * Math.sin((base / 60) + idx)
      const x = (azimuth / 360) * dimensions.width
      const y = dimensions.height - ((altitude + 30) / 120) * dimensions.height
      return {
        id: s.id,
        name: s.name,
        type: 'satellite',
        x,
        y,
        visible: altitude > 0,
        magnitude: s.magnitude,
        azimuth,
        altitude,
      }
    })
  }, [location, currentTime, dimensions])

  // Draw the sky map
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = dimensions.width
    canvas.height = dimensions.height

    // Clear canvas with night sky background
    const gradient = ctx.createRadialGradient(
      dimensions.width / 2, dimensions.height / 2, 0,
      dimensions.width / 2, dimensions.height / 2, Math.max(dimensions.width, dimensions.height) / 2
    )
    
    if (nightMode) {
      gradient.addColorStop(0, '#0a0a0a')
      gradient.addColorStop(0.5, '#1a1a2e')
      gradient.addColorStop(1, '#16213e')
    } else {
      gradient.addColorStop(0, '#001122')
      gradient.addColorStop(0.5, '#002244')
      gradient.addColorStop(1, '#003366')
    }
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Draw stars
    stars.forEach(star => {
      if (!star.visible) return

      // Make stars bigger on mobile
      const isMobile = dimensions.width < 768
      const baseSize = getStarSize(star.magnitude)
      const size = isMobile ? Math.max(baseSize * 1.5, 4) : baseSize
      const opacity = Math.max(0.4, 1 - star.magnitude / 6)

      // Star glow effect
      const glowSize = size * (isMobile ? 3 : 2)
      const glowGradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowSize)
      // Convert hex color to rgba for proper alpha
      const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
      }
      glowGradient.addColorStop(0, hexToRgba(star.color, opacity))
      glowGradient.addColorStop(1, 'transparent')

      ctx.fillStyle = glowGradient
      ctx.beginPath()
      ctx.arc(star.x, star.y, glowSize, 0, Math.PI * 2)
      ctx.fill()

      // Star core - make more visible
      ctx.fillStyle = star.color
      ctx.globalAlpha = Math.max(opacity, 0.6)
      ctx.beginPath()
      ctx.arc(star.x, star.y, size / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      // Highlight hovered star
      if (hoveredStar && hoveredStar.id === star.id) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = isMobile ? 3 : 2
        ctx.beginPath()
        ctx.arc(star.x, star.y, size + (isMobile ? 8 : 5), 0, Math.PI * 2)
        ctx.stroke()
      }
    })

    // Draw constellation lines (simplified)
    drawConstellationLines(ctx, stars)

    // Draw location info
    if (location) {
      drawLocationInfo(ctx, location, dimensions)
    }

    // Draw satellites
    if (showSatellites) {
      const sats = (satellitesFromProps && satellitesFromProps.length) ? satellitesFromProps : generatedSatellites
      sats.forEach(sat => {
        if (!sat.visible) return
        ctx.fillStyle = '#00e5ff'
        ctx.beginPath()
        ctx.arc(sat.x, sat.y, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = nightMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)'
        ctx.font = '12px Inter, sans-serif'
        ctx.fillText(sat.name, sat.x + 6, sat.y - 6)
      })
    }

    // Draw deep-sky objects (simple glyphs)
    if (deepSkyObjects && deepSkyObjects.length) {
      deepSkyObjects.forEach(obj => {
        if (!obj.visible) return
        const color = obj.objectType === 'galaxy' ? '#a78bfa' : obj.objectType === 'nebula' ? '#34d399' : '#f59e0b'
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        // ellipse marker
        ctx.ellipse(obj.x, obj.y, 8, 5, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = nightMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)'
        ctx.font = '11px Inter, sans-serif'
        ctx.fillText(obj.name, obj.x + 10, obj.y - 6)
      })
    }

    // Draw time info
    drawTimeInfo(ctx, currentTime, dimensions)

  }, [stars, dimensions, nightMode, hoveredStar, location, currentTime, showSatellites, generatedSatellites, deepSkyObjects, satellitesFromProps])

  // Handle mouse events
  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true)
    setDragStart({ x: event.clientX, y: event.clientY })
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setMousePos({ x, y })

    // Handle dragging
    if (isDragging) {
      const deltaX = event.clientX - dragStart.x
      const deltaY = event.clientY - dragStart.y

      setSkyOffset(prev => ({
        azimuth: prev.azimuth + deltaX * 0.2,
        altitude: Math.max(-90, Math.min(90, prev.altitude - deltaY * 0.2))
      }))

      setDragStart({ x: event.clientX, y: event.clientY })
      return
    }

    // Find star under cursor (only when not dragging)
    const clickedStar = stars.find(star => {
      if (!star.visible) return false
      const distance = Math.sqrt((star.x - x) ** 2 + (star.y - y) ** 2)
      return distance <= getStarSize(star.magnitude) + 5
    })

    setHoveredStar(clickedStar || null)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleClick = () => {
    if (!isDragging && hoveredStar) {
      onStarClick(hoveredStar)
    }
  }

  // Handle touch events for mobile
  const handleTouch = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const touch = event.touches[0] || event.changedTouches[0]
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top

    // Find star under touch
    const touchedStar = stars.find(star => {
      if (!star.visible) return false
      const distance = Math.sqrt((star.x - x) ** 2 + (star.y - y) ** 2)
      const isMobile = window.innerWidth < 768
      const touchRadius = isMobile ? 20 : 15
      return distance <= touchRadius
    })

    if (touchedStar) {
      setHoveredStar(touchedStar)
      onStarClick(touchedStar)
    }
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onTouchStart={handleTouch}
        onTouchEnd={handleTouch}
        style={{ filter: nightMode ? 'hue-rotate(0deg)' : 'none' }}
      />
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-space-dark p-4 rounded-lg flex items-center space-x-3">
            <div className="loading-spinner"></div>
            <span className="text-white">Loading stars...</span>
          </div>
        </div>
      )}

      {/* Star tooltip */}
      {hoveredStar && (
        <div 
          className="absolute bg-black bg-opacity-80 text-white p-2 rounded-lg pointer-events-none z-10 text-sm"
          style={{
            left: mousePos.x + 10,
            top: mousePos.y - 10,
            transform: mousePos.x > dimensions.width - 200 ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="font-bold">{hoveredStar.commonName || hoveredStar.name}</div>
          <div className="text-gray-300">
            {hoveredStar.constellation} • Mag {hoveredStar.magnitude.toFixed(1)}
          </div>
          {hoveredStar.distance && (
            <div className="text-gray-400 text-xs">
              {hoveredStar.distance.toFixed(1)} light years
            </div>
          )}
        </div>
      )}

      {/* Star count info - moved up and made compact */}
      <div className={`star-count-info absolute top-16 sm:top-20 left-2 sm:left-4 ${nightMode ? 'bg-black bg-opacity-50 text-white' : 'bg-white bg-opacity-80 text-gray-800 border border-gray-300'} p-2 rounded-lg text-xs sm:text-sm max-w-xs`}>
        <div className="flex items-center space-x-2">
          <span className="font-medium">⭐ {stars.filter(s => s.visible).length}</span>
          <span className={nightMode ? "text-gray-400" : "text-gray-600"}>of {stars.length}</span>
          {skyOffset.azimuth !== 0 || skyOffset.altitude !== 0 && (
            <span className={`text-xs ${nightMode ? "text-gray-500" : "text-gray-500"}`}>
              {skyOffset.azimuth.toFixed(0)}°/{skyOffset.altitude.toFixed(0)}°
            </span>
          )}
        </div>
        {skyOffset.azimuth === 0 && skyOffset.altitude === 0 && (
          <div className={`text-xs mt-1 ${nightMode ? "text-gray-500" : "text-gray-600"}`}>
            Drag to explore
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to draw constellation lines
const drawConstellationLines = (ctx: CanvasRenderingContext2D, stars: Star[]) => {
  // Simplified constellation lines for major constellations
  const constellationLines = [
    // Big Dipper
    ['Dubhe', 'Merak'],
    ['Merak', 'Phecda'],
    ['Phecda', 'Megrez'],
    ['Megrez', 'Alioth'],
    ['Alioth', 'Mizar'],
    ['Mizar', 'Alkaid'],
    
    // Orion
    ['Betelgeuse', 'Bellatrix'],
    ['Bellatrix', 'Mintaka'],
    ['Mintaka', 'Alnilam'],
    ['Alnilam', 'Alnitak'],
    ['Betelgeuse', 'Rigel']
  ]

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.lineWidth = 1

  constellationLines.forEach(([star1Name, star2Name]) => {
    const star1 = stars.find(s => s.name === star1Name && s.visible)
    const star2 = stars.find(s => s.name === star2Name && s.visible)
    
    if (star1 && star2) {
      ctx.beginPath()
      ctx.moveTo(star1.x, star1.y)
      ctx.lineTo(star2.x, star2.y)
      ctx.stroke()
    }
  })
}

// Helper function to draw location info
const drawLocationInfo = (ctx: CanvasRenderingContext2D, location: Location, dimensions: { width: number, height: number }) => {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.font = '14px Inter, sans-serif'
  
  const locationText = location.city 
    ? `${location.city}, ${location.country}`
    : `${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°`
  
  ctx.fillText(locationText, 20, dimensions.height - 60)
}

// Helper function to draw time info
const drawTimeInfo = (ctx: CanvasRenderingContext2D, currentTime: Date, dimensions: { width: number, height: number }) => {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.font = '14px Inter, sans-serif'
  
  const timeText = currentTime.toLocaleString()
  ctx.fillText(timeText, 20, dimensions.height - 40)
}

export default SkyMap
