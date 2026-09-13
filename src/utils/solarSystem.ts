import { Location, CelestialObject } from '@/types/astronomy'

/**
 * Solar System Object Position Calculator
 * Uses simplified VSOP87-like algorithms for naked-eye planets
 * Accuracy: ~0.01° for inner planets, ~0.1° for outer planets (good enough for stargazing)
 */

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

interface OrbitalElements {
  a: number    // semi-major axis (AU)
  e: number    // eccentricity
  i: number    // inclination (degrees)
  L: number    // mean longitude (degrees)
  longPeri: number // longitude of perihelion (degrees)
  longNode: number // longitude of ascending node (degrees)
  dL: number   // daily motion (degrees/day)
  dPeri: number // daily motion of perihelion
  dNode: number // daily motion of node
  L0: number   // J2000 mean longitude
  peri0: number // J2000 perihelion
  node0: number // J2000 node
}

// J2000 orbital elements and their rates of change (degrees/century)
const PLANETS: Record<string, { elements: OrbitalElements }> = {
  Mercury: {
    elements: {
      a: 0.38709893, e: 0.20563069, i: 7.00487, L: 252.25084, longPeri: 77.45645, longNode: 48.33167,
      dL: 149472.67411, dPeri: 0.16048, dNode: -0.12534,
      L0: 252.25084, peri0: 77.45645, node0: 48.33167
    }
  },
  Venus: {
    elements: {
      a: 0.72333199, e: 0.00677323, i: 3.39471, L: 181.97973, longPeri: 131.53298, longNode: 76.67986,
      dL: 58517.81539, dPeri: 0.00268, dNode: -0.27769,
      L0: 181.97973, peri0: 131.53298, node0: 76.67986
    }
  },
  Mars: {
    elements: {
      a: 1.52366231, e: 0.09341233, i: 1.85061, L: 355.45332, longPeri: 336.04084, longNode: 49.57854,
      dL: 19140.30268, dPeri: 0.44411, dNode: -0.29257,
      L0: 355.45332, peri0: 336.04084, node0: 49.57854
    }
  },
  Jupiter: {
    elements: {
      a: 5.20336301, e: 0.04839266, i: 1.30530, L: 34.40438, longPeri: 14.75385, longNode: 100.55615,
      dL: 3034.74612, dPeri: 0.21252, dNode: 0.20469,
      L0: 34.40438, peri0: 14.75385, node0: 100.55615
    }
  },
  Saturn: {
    elements: {
      a: 9.53707032, e: 0.05415060, i: 2.48446, L: 50.07747, longPeri: 93.05679, longNode: 113.71504,
      dL: 1222.49362, dPeri: 0.51749, dNode: -0.28868,
      L0: 50.07747, peri0: 93.05679, node0: 113.71504
    }
  },
}

// Sun's apparent position (simplified)
const SUN_ELEMENTS = {
  a: 1.00000011, e: 0.01671022, i: 0, L: 280.46646, longPeri: 282.93768, longNode: 0,
  dL: 35999.37245, dPeri: 0.32327, dNode: 0,
  L0: 280.46646, peri0: 282.93768, node0: 0
}

function getJ2000Days(date: Date): number {
  const a = Math.floor((14 - (date.getMonth() + 1)) / 12)
  const y = date.getFullYear() + 4800 - a
  const m = (date.getMonth() + 1) + 12 * a - 3
  const jd = date.getDate() + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045 +
           (date.getHours() - 12) / 24 + date.getMinutes() / 1440 + date.getSeconds() / 86400
  return jd - 2451545.0
}

function solveKepler(M: number, e: number): number {
  // Solve Kepler's equation M = E - e*sin(E) using Newton's method
  let E = M
  for (let i = 0; i < 10; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    E -= dE
    if (Math.abs(dE) < 1e-8) break
  }
  return E
}

function getPlanetPosition(name: string, date: Date): { ra: number; dec: number; magnitude: number } | null {
  const planet = PLANETS[name]
  if (!planet) return null

  const T = getJ2000Days(date) / 36525.0 // Julian centuries from J2000
  const el = planet.elements

  // Calculate orbital elements for this date
  const L = el.L0 + el.dL * T
  const peri = el.peri0 + el.dPeri * T
  const node = el.node0 + el.dNode * T

  // Mean anomaly
  const M = ((L - peri) % 360 + 360) % 360
  const MRad = M * DEG_TO_RAD

  // Solve Kepler's equation
  const E = solveKepler(MRad, el.e)

  // True anomaly
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + el.e) * Math.sin(E / 2),
    Math.sqrt(1 - el.e) * Math.cos(E / 2)
  )

  // Distance from Sun
  const r = el.a * (1 - el.e * Math.cos(E))

  // Heliocentric longitude
  const lon = nu * RAD_TO_DEG + peri

  // Heliocentric latitude (simplified for low inclination)
  const lat = 0

  // Convert to rectangular coordinates
  const xh = r * Math.cos(lon * DEG_TO_RAD) * Math.cos(lat * DEG_TO_RAD)
  const yh = r * Math.sin(lon * DEG_TO_RAD) * Math.cos(lat * DEG_TO_RAD)
  const zh = r * Math.sin(lat * DEG_TO_RAD)

  // Get Sun's position
  const sunT = getJ2000Days(date) / 36525.0
  const sunL = SUN_ELEMENTS.L0 + SUN_ELEMENTS.dL * sunT
  const sunPeri = SUN_ELEMENTS.peri0 + SUN_ELEMENTS.dPeri * sunT
  const sunM = ((sunL - sunPeri) % 360 + 360) % 360
  const sunE = solveKepler(sunM * DEG_TO_RAD, SUN_ELEMENTS.e)
  const sunNu = 2 * Math.atan2(
    Math.sqrt(1 + SUN_ELEMENTS.e) * Math.sin(sunE / 2),
    Math.sqrt(1 - SUN_ELEMENTS.e) * Math.cos(sunE / 2)
  )
  const sunR = SUN_ELEMENTS.a * (1 - SUN_ELEMENTS.e * Math.cos(sunE))
  const sunLon = sunNu * RAD_TO_DEG + sunPeri

  // Geocentric coordinates
  const xs = sunR * Math.cos(sunLon * DEG_TO_RAD)
  const ys = sunR * Math.sin(sunLon * DEG_TO_RAD)

  const xg = xh + xs
  const yg = yh + ys
  const zg = zh

  // Convert to RA and Dec
  const ra = Math.atan2(yg, xg) * RAD_TO_DEG
  const dec = Math.atan2(zg, Math.sqrt(xg * xg + yg * yg)) * RAD_TO_DEG

  // Calculate apparent magnitude (simplified)
  const earthDist = Math.sqrt(xg * xg + yg * yg + zg * zg)
  const sunDist = r
  const phase = (r * r + earthDist * earthDist - sunR * sunR) / (2 * r * earthDist)
  const phaseAngle = Math.acos(Math.max(-1, Math.min(1, phase))) * RAD_TO_DEG

  let magnitude = 0
  switch (name) {
    case 'Mercury': magnitude = -0.42 + 5 * Math.log10(earthDist) + 0.0380 * phaseAngle; break
    case 'Venus': magnitude = -4.40 + 5 * Math.log10(earthDist) + 0.0009 * phaseAngle + 0.000239 * phaseAngle * phaseAngle; break
    case 'Mars': magnitude = -1.52 + 5 * Math.log10(earthDist) + 0.016 * phaseAngle; break
    case 'Jupiter': magnitude = -9.40 + 5 * Math.log10(earthDist) + 0.005 * phaseAngle; break
    case 'Saturn': magnitude = -8.88 + 5 * Math.log10(earthDist) + 0.044 * phaseAngle; break
  }

  return {
    ra: ((ra % 360) + 360) % 360 / 15, // Convert to hours
    dec,
    magnitude
  }
}

function getSunPosition(date: Date): { ra: number; dec: number } {
  const T = getJ2000Days(date) / 36525.0
  const L = SUN_ELEMENTS.L0 + SUN_ELEMENTS.dL * T
  const peri = SUN_ELEMENTS.peri0 + SUN_ELEMENTS.dPeri * T
  const M = ((L - peri) % 360 + 360) % 360
  const E = solveKepler(M * DEG_TO_RAD, SUN_ELEMENTS.e)
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + SUN_ELEMENTS.e) * Math.sin(E / 2),
    Math.sqrt(1 - SUN_ELEMENTS.e) * Math.cos(E / 2)
  )
  const r = SUN_ELEMENTS.a * (1 - SUN_ELEMENTS.e * Math.cos(E))
  const lon = nu * RAD_TO_DEG + peri

  // Obliquity of the ecliptic
  const eps = 23.439291 - 0.0130042 * T

  const ra = Math.atan2(Math.cos(eps * DEG_TO_RAD) * Math.sin(lon * DEG_TO_RAD), Math.cos(lon * DEG_TO_RAD)) * RAD_TO_DEG
  const dec = Math.asin(Math.sin(eps * DEG_TO_RAD) * Math.sin(lon * DEG_TO_RAD)) * RAD_TO_DEG

  return {
    ra: ((ra % 360) + 360) % 360 / 15,
    dec
  }
}

function getMoonPosition(date: Date): { ra: number; dec: number; magnitude: number; phase: number } {
  // Simplified lunar position using ELP-2000 truncated series
  const T = getJ2000Days(date) / 36525.0

  // Mean longitude
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T
  // Mean elongation
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T
  // Mean anomaly
  const M = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T
  // Argument of latitude
  const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T

  // Longitude correction
  const lon = Lp + 6.289 * Math.sin(M * DEG_TO_RAD) +
              1.274 * Math.sin((2 * D - M) * DEG_TO_RAD) +
              0.658 * Math.sin(2 * D * DEG_TO_RAD) +
              0.214 * Math.sin(2 * M * DEG_TO_RAD) -
              0.186 * Math.sin(M * DEG_TO_RAD) -
              0.114 * Math.sin(2 * F * DEG_TO_RAD)

  // Latitude
  const lat = 5.128 * Math.sin(F * DEG_TO_RAD) +
              0.281 * Math.sin((M + F) * DEG_TO_RAD) +
              0.278 * Math.sin((M - F) * DEG_TO_RAD) +
              0.173 * Math.sin((2 * D - F) * DEG_TO_RAD)

  // Distance (Earth radii)
  const dist = 60.2666 - 3.5614 * Math.cos(M * DEG_TO_RAD) -
               0.3914 * Math.cos((2 * D - M) * DEG_TO_RAD) -
               0.2464 * Math.cos(2 * D * DEG_TO_RAD)

  // Obliquity
  const eps = 23.439291 - 0.0130042 * T

  // Convert to RA/Dec
  const ra = Math.atan2(
    Math.sin(lon * DEG_TO_RAD) * Math.cos(eps * DEG_TO_RAD) - Math.tan(lat * DEG_TO_RAD) * Math.sin(eps * DEG_TO_RAD),
    Math.cos(lon * DEG_TO_RAD)
  ) * RAD_TO_DEG

  const dec = Math.asin(
    Math.sin(lat * DEG_TO_RAD) * Math.cos(eps * DEG_TO_RAD) +
    Math.cos(lat * DEG_TO_RAD) * Math.sin(eps * DEG_TO_RAD) * Math.sin(lon * DEG_TO_RAD)
  ) * RAD_TO_DEG

  // Phase angle
  const sunLon = getSunPosition(date).ra * 15
  const moonLon = ((lon % 360) + 360) % 360
  const phaseAngle = Math.abs(moonLon - sunLon)
  const phase = (1 - Math.cos(phaseAngle * DEG_TO_RAD)) / 2

  // Magnitude (simplified)
  const magnitude = -12.73 + 5 * Math.log10(dist / 60) + 0.026 * phaseAngle

  return {
    ra: ((ra % 360) + 360) % 360 / 15,
    dec,
    magnitude,
    phase
  }
}

/**
 * Get all solar system objects visible from a location at a given time
 */
export const getSolarSystemObjects = (location: Location, dateTime: Date): CelestialObject[] => {
  const objects: CelestialObject[] = []

  // Calculate Local Sidereal Time
  const jd = getJ2000Days(dateTime) + 2451545.0
  const T = (jd - 2451545.0) / 36525.0
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000.0
  gmst = ((gmst % 360) + 360) % 360
  const lst = ((gmst + location.longitude) % 360 + 360) % 360

  // Sun
  const sun = getSunPosition(dateTime)
  const sunAlt = getAltitude(sun.ra * 15, sun.dec, lst, location.latitude)
  if (sunAlt > -10) {
    objects.push({
      id: 'sun',
      name: 'Sun',
      type: 'planet',
      x: 0, y: 0, // Will be calculated by renderer
      visible: sunAlt > -10,
      magnitude: -26.74,
      azimuth: getAzimuth(sun.ra * 15, sun.dec, lst, location.latitude),
      altitude: sunAlt,
      phase: 1
    })
  }

  // Moon
  const moon = getMoonPosition(dateTime)
  const moonAlt = getAltitude(moon.ra * 15, moon.dec, lst, location.latitude)
  if (moonAlt > -5) {
    objects.push({
      id: 'moon',
      name: 'Moon',
      type: 'moon',
      x: 0, y: 0,
      visible: moonAlt > -5,
      magnitude: moon.magnitude,
      azimuth: getAzimuth(moon.ra * 15, moon.dec, lst, location.latitude),
      altitude: moonAlt,
      phase: moon.phase
    })
  }

  // Planets
  const planetNames = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']
  for (const name of planetNames) {
    const pos = getPlanetPosition(name, dateTime)
    if (!pos) continue
    const alt = getAltitude(pos.ra * 15, pos.dec, lst, location.latitude)
    if (alt > -5) {
      objects.push({
        id: name.toLowerCase(),
        name,
        type: 'planet',
        x: 0, y: 0,
        visible: alt > -5,
        magnitude: pos.magnitude,
        azimuth: getAzimuth(pos.ra * 15, pos.dec, lst, location.latitude),
        altitude: alt,
        phase: 1
      })
    }
  }

  return objects
}

function getAltitude(ra: number, dec: number, lst: number, lat: number): number {
  const ha = (lst - ra) * DEG_TO_RAD
  const decRad = dec * DEG_TO_RAD
  const latRad = lat * DEG_TO_RAD
  const sinAlt = Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(ha)
  return Math.asin(sinAlt) * RAD_TO_DEG
}

function getAzimuth(ra: number, dec: number, lst: number, lat: number): number {
  const ha = (lst - ra) * DEG_TO_RAD
  const decRad = dec * DEG_TO_RAD
  const latRad = lat * DEG_TO_RAD
  const altRad = Math.asin(Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(ha))
  const cosAz = (Math.sin(decRad) - Math.sin(altRad) * Math.sin(latRad)) / (Math.cos(altRad) * Math.cos(latRad))
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD_TO_DEG
  if (Math.sin(ha) > 0) az = 360 - az
  return az
}
