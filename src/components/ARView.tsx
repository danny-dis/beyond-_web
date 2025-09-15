'use client'

import React, { useEffect, useRef, useState } from 'react'

interface ARViewProps {
  nightMode: boolean
  onClose?: () => void
}

const ARView: React.FC<ARViewProps> = ({ nightMode, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [orientation, setOrientation] = useState<{ alpha: number; beta: number; gamma: number } | null>(null)
  const [permissionAsked, setPermissionAsked] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch {}
    })()
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [])

  useEffect(() => {
    const requestPermissionIfNeeded = async () => {
      // iOS requires explicit permission for DeviceOrientation
      const anyDO = DeviceOrientationEvent as any
      if (anyDO && typeof anyDO.requestPermission === 'function' && !permissionAsked) {
        try {
          const res = await anyDO.requestPermission()
          setPermissionAsked(true)
          if (res !== 'granted') return
        } catch {}
      }
    }

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha == null || e.beta == null || e.gamma == null) return
      setOrientation({ alpha: e.alpha, beta: e.beta, gamma: e.gamma })
    }

    requestPermissionIfNeeded()
    window.addEventListener('deviceorientation', onOrientation)
    return () => window.removeEventListener('deviceorientation', onOrientation)
  }, [permissionAsked])

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const render = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      // Overlay UI
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Crosshair
      ctx.strokeStyle = nightMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'
      ctx.lineWidth = 2
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      ctx.beginPath()
      ctx.moveTo(cx - 20, cy)
      ctx.lineTo(cx + 20, cy)
      ctx.moveTo(cx, cy - 20)
      ctx.lineTo(cx, cy + 20)
      ctx.stroke()

      // Orientation text
      if (orientation) {
        const { alpha, beta, gamma } = orientation
        ctx.fillStyle = nightMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)'
        ctx.font = '14px Inter, sans-serif'
        ctx.fillText(`Az ~ ${alpha.toFixed(0)}°  Alt ~ ${(beta - 90).toFixed(0)}°  Roll ~ ${gamma.toFixed(0)}°`, 16, 28)
      }

      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
  }, [orientation, nightMode])

  return (
    <div className="absolute inset-0 z-40">
      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
      <canvas ref={canvasRef} className="absolute inset-0" />
      {onClose && (
        <button onClick={onClose} className="astro-button absolute top-4 right-4 z-50">Exit AR</button>
      )}
    </div>
  )
}

export default ARView


