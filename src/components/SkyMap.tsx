'use client'

import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Star, Location, CelestialObject, DeepSkyObject } from '@/types/astronomy'
import { getStarSize } from '@/utils/astronomyCalculations'

interface SkyMapProps {
  location: Location | null
  stars: Star[]
  solarSystem: CelestialObject[]
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
  solarSystem,
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

  // Generate artificial satellites (demo)
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

      const isMobile = dimensions.width < 768
      const baseSize = getStarSize(star.magnitude)
      const size = isMobile ? Math.max(baseSize * 1.5, 4) : baseSize
      const opacity = Math.max(0.4, 1 - star.magnitude / 6)

      // Star glow effect
      const glowSize = size * (isMobile ? 3 : 2)
      const glowGradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowSize)
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

      // Star core
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

    // Draw constellation lines
    drawConstellationLines(ctx, stars)

    // Draw solar system objects (Sun, Moon, planets)
    solarSystem.forEach(obj => {
      if (!obj.visible) return
      
      // Convert az/alt to screen coordinates
      const x = (obj.azimuth / 360) * dimensions.width
      const y = dimensions.height - ((obj.altitude + 30) / 120) * dimensions.height

      // Draw Sun with glow
      if (obj.id === 'sun') {
        ctx.fillStyle = '#FDB813'
        ctx.shadowBlur = 30
        ctx.shadowColor = '#FDB813'
        ctx.beginPath()
        ctx.arc(x, y, 14, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.fillStyle = '#FFF'
        ctx.font = 'bold 11px Inter, sans-serif'
        ctx.fillText('Sun', x + 18, y - 8)
        return
      }

      // Draw Moon with phase
      if (obj.id === 'moon') {
        const moonSize = 12
        ctx.fillStyle = '#E8E8E8'
        ctx.beginPath()
        ctx.arc(x, y, moonSize, 0, Math.PI * 2)
        ctx.fill()
        
        // Moon phase shadow
        if (obj.phase !== undefined) {
          ctx.fillStyle = '#1a1a2e'
          const phaseOffset = (obj.phase - 0.5) * moonSize * 2
          ctx.beginPath()
          ctx.ellipse(x + phaseOffset * 0.3, y, Math.abs(phaseOffset), moonSize, 0, 0, Math.PI * 2)
          ctx.fill()
        }
        
        ctx.fillStyle = '#CCC'
        ctx.font = '11px Inter, sans-serif'
        ctx.fillText('Moon', x + 16, y - 6)
        return
      }

      // Draw planets
      const planetColors: Record<string, string> = {
        mercury: '#B5B5B5',
        venus: '#FFE4B5',
        mars: '#FF6B4A',
        jupiter: '#FFD700',
        saturn: '#F4A460'
      }
      
      const planetSize = Math.max(4, 10 - Math.max(-2, obj.magnitude) * 0.5)
      ctx.fillStyle = planetColors[obj.id] || '#FFF'
      ctx.beginPath()
      ctx.arc(x, y, planetSize, 0, Math.PI * 2)
      ctx.fill()
      
      // Planet label
      ctx.fillStyle = nightMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)'
      ctx.font = '11px Inter, sans-serif'
      ctx.fillText(obj.name, x + planetSize + 4, y - planetSize)
    })

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

    // Draw deep-sky objects
    if (deepSkyObjects && deepSkyObjects.length) {
      deepSkyObjects.forEach(obj => {
        if (!obj.visible) return
        const color = obj.objectType === 'galaxy' ? '#a78bfa' : obj.objectType === 'nebula' ? '#34d399' : '#f59e0b'
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.ellipse(obj.x, obj.y, 8, 5, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = nightMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)'
        ctx.font = '11px Inter, sans-serif'
        ctx.fillText(obj.name, obj.x + 10, obj.y - 6)
      })
    }

    // Draw time info
    drawTimeInfo(ctx, currentTime, dimensions)

  }, [stars, solarSystem, dimensions, nightMode, hoveredStar, location, currentTime, showSatellites, generatedSatellites, deepSkyObjects, satellitesFromProps])

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

  const handleTouch = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const touch = event.touches[0] || event.changedTouches[0]
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top

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
      
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-space-dark p-4 rounded-lg flex items-center space-x-3">
            <div className="loading-spinner"></div>
            <span className="text-white">Loading stars...</span>
          </div>
        </div>
      )}

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

      <div className={`star-count-info absolute top-16 sm:top-20 left-2 sm:left-4 ${nightMode ? 'bg-black bg-opacity-50 text-white' : 'bg-white bg-opacity-80 text-gray-800 border border-gray-300'} p-2 rounded-lg text-xs sm:text-sm max-w-xs`}>
        <div className="flex items-center space-x-2">
          <span className="font-medium">⭐ {stars.filter(s => s.visible).length}</span>
          <span className={nightMode ? "text-gray-400" : "text-gray-600"}>of {stars.length}</span>
        </div>
        <div className={`text-xs mt-1 ${nightMode ? "text-gray-500" : "text-gray-600"}`}>
          Drag to explore • Click stars for info
        </div>
      </div>
    </div>
  )
}

const drawConstellationLines = (ctx: CanvasRenderingContext2D, stars: Star[]) => {
  const constellationLines = [
    ['Dubhe', 'Merak'], ['Merak', 'Phecda'], ['Phecda', 'Megrez'],
    ['Megrez', 'Alioth'], ['Alioth', 'Mizar'], ['Mizar', 'Alkaid'],
    ['Betelgeuse', 'Bellatrix'], ['Bellatrix', 'Mintaka'], ['Mintaka', 'Alnilam'],
    ['Alnilam', 'Alnitak'], ['Betelgeuse', 'Rigel']
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

const drawLocationInfo = (ctx: CanvasRenderingContext2D, location: Location, dimensions: { width: number, height: number }) => {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.font = '14px Inter, sans-serif'
  const locationText = location.city 
    ? `${location.city}, ${location.country}`
    : `${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°`
  ctx.fillText(locationText, 20, dimensions.height - 60)
}

const drawTimeInfo = (ctx: CanvasRenderingContext2D, currentTime: Date, dimensions: { width: number, height: number }) => {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.font = '14px Inter, sans-serif'
  const timeText = currentTime.toLocaleString()
  ctx.fillText(timeText, 20, dimensions.height - 40)
}

export default SkyMap
