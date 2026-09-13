'use client'

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'
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

// ── Layer 1: Background (gradient + horizon) ─────────────────────────────────
const BackgroundCanvas = ({ nightMode }: { nightMode: boolean }) => {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = parent.clientWidth
    const H = parent.clientHeight
    canvas.width = W
    canvas.height = H

    const g = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.max(W, H) * 0.8)
    if (nightMode) {
      g.addColorStop(0, '#0a0a1a'); g.addColorStop(0.4, '#050510'); g.addColorStop(0.7, '#020208'); g.addColorStop(1, '#000005')
    } else {
      g.addColorStop(0, '#1a1a3e'); g.addColorStop(0.4, '#0a0a2a'); g.addColorStop(0.7, '#050520'); g.addColorStop(1, '#020215')
    }
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)

    const hg = ctx.createLinearGradient(0, H * 0.7, 0, H)
    if (nightMode) {
      hg.addColorStop(0, 'rgba(10,10,30,0)'); hg.addColorStop(0.5, 'rgba(15,15,40,0.3)'); hg.addColorStop(1, 'rgba(20,20,50,0.5)')
    } else {
      hg.addColorStop(0, 'rgba(30,30,80,0)'); hg.addColorStop(0.5, 'rgba(40,40,100,0.2)'); hg.addColorStop(1, 'rgba(50,50,120,0.3)')
    }
    ctx.fillStyle = hg
    ctx.fillRect(0, H * 0.7, W, H * 0.3)
  }, [nightMode])

  return <canvas ref={ref} className="absolute inset-0" />
}

// ── Layer 2: Stars ───────────────────────────────────────────────────────────
const StarsCanvas = ({
  stars, dimensions, nightMode, hoveredStar, setHoveredStar, setMousePos, onStarClick
}: {
  stars: Star[]
  dimensions: { width: number; height: number }
  nightMode: boolean
  hoveredStar: Star | null
  setHoveredStar: (s: Star | null) => void
  setMousePos: (p: { x: number; y: number }) => void
  onStarClick: (s: Star) => void
}) => {
  const ref = useRef<HTMLCanvasElement>(null)
  const [dragging, setDragging] = useState(false)
  const lastPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = dimensions.width
    canvas.height = dimensions.height
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)

    const lines = [
      ['Dubhe', 'Merak'], ['Merak', 'Phecda'], ['Phecda', 'Megrez'],
      ['Megrez', 'Alioth'], ['Alioth', 'Mizar'], ['Mizar', 'Alkaid'],
      ['Betelgeuse', 'Bellatrix'], ['Bellatrix', 'Mintaka'], ['Mintaka', 'Alnilam'],
      ['Alnilam', 'Alnitak'], ['Betelgeuse', 'Rigel']
    ]
    ctx.strokeStyle = nightMode ? 'rgba(255,255,255,0.2)' : 'rgba(100,100,200,0.3)'
    ctx.lineWidth = 1
    lines.forEach(([a, b]) => {
      const s1 = stars.find(s => s.name === a && s.visible)
      const s2 = stars.find(s => s.name === b && s.visible)
      if (s1 && s2) { ctx.beginPath(); ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.stroke() }
    })

    const isMobile = dimensions.width < 768
    stars.forEach(star => {
      if (!star.visible) return
      const baseSize = getStarSize(star.magnitude)
      const size = isMobile ? Math.max(baseSize * 1.5, 4) : baseSize
      const opacity = Math.max(0.4, 1 - star.magnitude / 6)
      const hex = (hex: string, a: number) => `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${a})`

      const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, size * (isMobile ? 3 : 2))
      glow.addColorStop(0, hex(star.color, opacity)); glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(star.x, star.y, size * (isMobile ? 3 : 2), 0, Math.PI * 2); ctx.fill()

      ctx.fillStyle = star.color; ctx.globalAlpha = Math.max(opacity, 0.6)
      ctx.beginPath(); ctx.arc(star.x, star.y, size / 2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1

      if (star.magnitude < 2 && !isMobile) {
        ctx.strokeStyle = hex(star.color, opacity * 0.5); ctx.lineWidth = 0.5
        const len = size * 3
        ctx.beginPath(); ctx.moveTo(star.x - len, star.y); ctx.lineTo(star.x + len, star.y)
        ctx.moveTo(star.x, star.y - len); ctx.lineTo(star.x, star.y + len); ctx.stroke()
      }

      if (hoveredStar && hoveredStar.id === star.id) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = isMobile ? 3 : 2
        ctx.beginPath(); ctx.arc(star.x, star.y, size + (isMobile ? 8 : 5), 0, Math.PI * 2); ctx.stroke()
      }
    })
  }, [stars, dimensions, nightMode, hoveredStar])

  const hitTest = useCallback((cx: number, cy: number) => {
    return stars.find(s => {
      if (!s.visible) return false
      return Math.hypot(s.x - cx, s.y - cy) <= getStarSize(s.magnitude) + 5
    }) || null
  }, [stars])

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true); lastPos.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const canvas = ref.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left, y = e.clientY - rect.top
    setMousePos({ x, y })
    if (dragging) { lastPos.current = { x: e.clientX, y: e.clientY }; return }
    setHoveredStar(hitTest(x, y))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return
    setDragging(false)
    const canvas = ref.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dx = Math.abs(e.clientX - lastPos.current.x)
    const dy = Math.abs(e.clientY - lastPos.current.y)
    if (dx < 5 && dy < 5) {
      const star = hitTest(e.clientX - rect.left, e.clientY - rect.top)
      if (star) onStarClick(star)
    }
  }

  return (
    <canvas
      ref={ref}
      className={`absolute inset-0 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    />
  )
}

// ── Layer 3: Overlays (solar system, satellites, deep-sky, compass) ─────────
const OverlaysCanvas = ({
  solarSystem, showSatellites, deepSkyObjects, satellitesFromProps, generatedSatellites,
  currentTime, nightMode, dimensions
}: {
  solarSystem: CelestialObject[]
  showSatellites: boolean
  deepSkyObjects: DeepSkyObject[]
  satellitesFromProps: CelestialObject[]
  currentTime: Date
  nightMode: boolean
  dimensions: { width: number; height: number }
  generatedSatellites: CelestialObject[]
}) => {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = dimensions.width
    canvas.height = dimensions.height
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)

    const W = dimensions.width, H = dimensions.height

    solarSystem.forEach(obj => {
      if (!obj.visible) return
      const x = (obj.azimuth / 360) * W
      const y = H - ((obj.altitude + 30) / 120) * H

      if (obj.id === 'sun') {
        ctx.fillStyle = '#FDB813'; ctx.shadowBlur = 30; ctx.shadowColor = '#FDB813'
        ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 11px Inter, sans-serif'; ctx.fillText('Sun', x + 18, y - 8)
        return
      }
      if (obj.id === 'moon') {
        ctx.fillStyle = '#E8E8E8'
        ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill()
        if (obj.phase !== undefined) {
          ctx.fillStyle = '#1a1a2e'
          const off = (obj.phase - 0.5) * 24
          ctx.beginPath(); ctx.ellipse(x + off * 0.3, y, Math.abs(off), 12, 0, 0, Math.PI * 2); ctx.fill()
        }
        ctx.fillStyle = '#CCC'; ctx.font = '11px Inter, sans-serif'; ctx.fillText('Moon', x + 16, y - 6)
        return
      }
      const colors: Record<string, string> = { mercury: '#B5B5B5', venus: '#FFE4B5', mars: '#FF6B4A', jupiter: '#FFD700', saturn: '#F4A460' }
      const sz = Math.max(4, 10 - Math.max(-2, obj.magnitude) * 0.5)
      ctx.fillStyle = colors[obj.id] || '#FFF'
      ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = nightMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)'
      ctx.font = '11px Inter, sans-serif'; ctx.fillText(obj.name, x + sz + 4, y - sz)
    })

    if (showSatellites) {
      const sats = satellitesFromProps.length ? satellitesFromProps : generatedSatellites
      sats.forEach(sat => {
        if (!sat.visible) return
        ctx.fillStyle = '#00e5ff'
        ctx.beginPath(); ctx.arc(sat.x, sat.y, 3, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = nightMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)'
        ctx.font = '12px Inter, sans-serif'; ctx.fillText(sat.name, sat.x + 6, sat.y - 6)
      })
    }

    deepSkyObjects.forEach(obj => {
      if (!obj.visible) return
      const c = obj.objectType === 'galaxy' ? '#a78bfa' : obj.objectType === 'nebula' ? '#34d399' : '#f59e0b'
      ctx.strokeStyle = c; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.ellipse(obj.x, obj.y, 8, 5, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = nightMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)'
      ctx.font = '11px Inter, sans-serif'; ctx.fillText(obj.name, obj.x + 10, obj.y - 6)
    })

    const cx = W - 50, cy = 80, r = 25
    ctx.fillStyle = nightMode ? 'rgba(10,10,26,0.8)' : 'rgba(255,255,255,0.8)'
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = nightMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; ctx.stroke()
    ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ef4444'; ctx.fillText('N', cx, cy - r + 8)
    ctx.fillStyle = nightMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'
    ctx.fillText('S', cx, cy + r - 8); ctx.fillText('E', cx + r - 8, cy); ctx.fillText('W', cx - r + 8, cy)
    ctx.fillStyle = nightMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
    ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill()
  }, [solarSystem, showSatellites, deepSkyObjects, satellitesFromProps, generatedSatellites, currentTime, nightMode, dimensions])

  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" />
}

// ── Main component ───────────────────────────────────────────────────────────
const SkyMap: React.FC<SkyMapProps> = (props) => {
  const { location, stars, solarSystem, currentTime, onStarClick, nightMode, loading, showSatellites = false, deepSkyObjects = [], satellites: satellitesFromProps = [] } = props

  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 })
  const [hoveredStar, setHoveredStar] = useState<Star | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight })
      }
    }
    update()
    const obs = new ResizeObserver(update)
    if (containerRef.current) obs.observe(containerRef.current)
    window.addEventListener('resize', update)
    return () => { obs.disconnect(); window.removeEventListener('resize', update) }
  }, [])

  const generatedSatellites: CelestialObject[] = useMemo(() => {
    if (!location) return []
    const base = currentTime.getTime() / 1000
    return [
      { id: 'sat-iss', name: 'ISS', magnitude: 1.5 },
      { id: 'sat-starlink', name: 'Starlink', magnitude: 3.0 },
      { id: 'sat-hubble', name: 'Hubble', magnitude: 2.0 },
    ].map((s, idx) => {
      const az = ((base / 10 + idx * 120) % 360 + 360) % 360
      const alt = 20 + 30 * Math.sin((base / 60) + idx)
      return { id: s.id, name: s.name, type: 'satellite', x: (az / 360) * dimensions.width, y: dimensions.height - ((alt + 30) / 120) * dimensions.height, visible: alt > 0, magnitude: s.magnitude, azimuth: az, altitude: alt }
    })
  }, [location, currentTime, dimensions])

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <BackgroundCanvas nightMode={nightMode} />
      <StarsCanvas
        stars={stars}
        dimensions={dimensions}
        nightMode={nightMode}
        hoveredStar={hoveredStar}
        setHoveredStar={setHoveredStar}
        setMousePos={setMousePos}
        onStarClick={onStarClick}
      />
      <OverlaysCanvas
        solarSystem={solarSystem}
        showSatellites={showSatellites}
        deepSkyObjects={deepSkyObjects}
        satellitesFromProps={satellitesFromProps}
        generatedSatellites={generatedSatellites}
        currentTime={currentTime}
        nightMode={nightMode}
        dimensions={dimensions}
      />

      {hoveredStar && (
        <div
          className="absolute bg-black/80 text-white p-2 rounded-lg pointer-events-none z-10 text-sm backdrop-blur-sm"
          style={{ left: mousePos.x + 10, top: mousePos.y - 10 }}
        >
          <div className="font-bold">{hoveredStar.commonName || hoveredStar.name}</div>
          <div className="text-gray-300">{hoveredStar.constellation} • Mag {hoveredStar.magnitude.toFixed(1)}</div>
          {hoveredStar.distance && <div className="text-gray-400 text-xs">{hoveredStar.distance.toFixed(1)} ly</div>}
        </div>
      )}
    </div>
  )
}

export default SkyMap
