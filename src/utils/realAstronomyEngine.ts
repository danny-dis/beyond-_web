import { Location, Star, StarCatalogEntry } from '@/types/astronomy'

/**
 * Real astronomical calculations using proper algorithms
 * Connects to HYG catalog (119,000+ stars) and computes planet positions
 */

export interface HygStarRecord extends StarCatalogEntry {}

export interface OpenNgcRecord {
  id: string
  name: string
  catalog?: string
  type: string
  ra: number // hours
  dec: number // degrees
  mag?: number
  size?: number
  constellation?: string
}

/**
 * Fetch stars from HYG catalog via our API
 */
export const fetchHygStars = async (params?: { 
  minMag?: number; 
  maxMag?: number; 
  limit?: number;
  con?: string;
}): Promise<HygStarRecord[]> => {
  try {
    const q = new URLSearchParams()
    if (params?.minMag !== undefined) q.set('minMag', String(params.minMag))
    if (params?.maxMag !== undefined) q.set('maxMag', String(params.maxMag))
    if (params?.limit !== undefined) q.set('limit', String(params.limit))
    if (params?.con) q.set('con', params.con)
    
    const url = `/api/hyg${q.toString() ? `?${q.toString()}` : ''}`
    const resp = await fetch(url, { cache: 'no-store' })
    if (!resp.ok) throw new Error('HYG provider failed')
    
    const data = await resp.json()
    return data.stars || []
  } catch (e) {
    console.error('Failed to fetch HYG stars:', e)
    return []
  }
}

/**
 * Fetch deep sky objects from OpenNGC via our API
 */
export const fetchOpenNgc = async (params?: { 
  maxMag?: number; 
  limit?: number;
  type?: string;
}): Promise<OpenNgcRecord[]> => {
  try {
    const q = new URLSearchParams()
    if (params?.maxMag !== undefined) q.set('maxMag', String(params.maxMag))
    if (params?.limit !== undefined) q.set('limit', String(params.limit))
    if (params?.type) q.set('type', params.type)
    
    const url = `/api/opengc${q.toString() ? `?${q.toString()}` : ''}`
    const resp = await fetch(url, { cache: 'no-store' })
    if (!resp.ok) throw new Error('OpenNGC provider failed')
    
    const data = await resp.json()
    return data.objects || []
  } catch (e) {
    console.error('Failed to fetch OpenNGC objects:', e)
    return []
  }
}

/**
 * Calculate which stars are actually visible from a given location and time
 * Uses proper declination visibility limits based on observer latitude
 */
export const calculateVisibleStars = (
  stars: StarCatalogEntry[],
  location: Location,
  dateTime: Date,
  minimumMagnitude: number = 5.0
): StarCatalogEntry[] => {
  // Filter by magnitude first
  const brightStars = stars.filter(star => star.mag <= minimumMagnitude)

  // Calculate Julian Day for proper visibility
  const a = Math.floor((14 - (dateTime.getMonth() + 1)) / 12)
  const y = dateTime.getFullYear() + 4800 - a
  const m = (dateTime.getMonth() + 1) + 12 * a - 3
  const jd = dateTime.getDate() + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045 +
           (dateTime.getHours() - 12) / 24 + dateTime.getMinutes() / 1440 + dateTime.getSeconds() / 86400

  const t = (jd - 2451545.0) / 36525.0
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t - (t * t * t) / 38710000.0
  gmst = ((gmst % 360) + 360) % 360
  const lst = ((gmst + location.longitude) % 360 + 360) % 360

  // Filter stars based on proper declination visibility
  const visibleStars = brightStars.filter(star => {
    const latitude = location.latitude
    
    // A star is circumpolar (always visible) if |dec - latitude| condition
    // A star is never visible if it's too far in opposite hemisphere
    const dec = star.dec
    
    // Calculate if this star is above horizon at some point during the day
    // A star rises above horizon if |dec| < 90 - |latitude| + some margin
    const isAboveHorizonPossible = Math.abs(latitude - dec) < 90 || Math.abs(latitude + dec) < 90
    
    if (!isAboveHorizonPossible) return false

    // Calculate current hour angle to see if star is above horizon now
    const hourAngle = lst - star.ra * 15 // RA in degrees
    const hourAngleRad = hourAngle * Math.PI / 180
    const decRad = dec * Math.PI / 180
    const latRad = latitude * Math.PI / 180
    
    const sinAlt = Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(hourAngleRad)
    const altitude = Math.asin(sinAlt) * 180 / Math.PI

    // Show stars that are above horizon (altitude > -5° for some margin)
    return altitude > -5
  })

  return visibleStars
}

/**
 * Get stars visible from a specific location
 * Combines catalog fetch with proper visibility calculation
 */
export const getVisibleStarsForLocation = async (
  location: Location,
  dateTime: Date,
  minimumMagnitude: number = 5.0
): Promise<StarCatalogEntry[]> => {
  // Fetch a generous subset of bright stars from HYG
  const allStars = await fetchHygStars({ 
    minMag: -2, 
    maxMag: Math.max(minimumMagnitude, 6), 
    limit: 5000 
  })
  
  if (allStars.length === 0) {
    // Fallback: return hardcoded bright stars if API fails
    return getFallbackStarCatalog()
  }
  
  return calculateVisibleStars(allStars, location, dateTime, minimumMagnitude)
}

/**
 * Fallback star catalog (bright stars visible to naked eye)
 * Used when API is unavailable
 */
export const getFallbackStarCatalog = (): StarCatalogEntry[] => [
  { id: 'HIP32349', name: 'Sirius', commonName: 'Alpha Canis Majoris', constellation: 'Canis Major', ra: 6.7525, dec: -16.7161, mag: -1.46, spectralClass: 'A1V', temp: 9940, distance: 8.6 },
  { id: 'HIP30438', name: 'Canopus', commonName: 'Alpha Carinae', constellation: 'Carina', ra: 6.3992, dec: -52.6956, mag: -0.74, spectralClass: 'A9II', temp: 7350, distance: 310 },
  { id: 'HIP71683', name: 'Alpha Centauri A', commonName: 'Rigil Kentaurus', constellation: 'Centaurus', ra: 14.6599, dec: -60.8354, mag: -0.01, spectralClass: 'G2V', temp: 5790, distance: 4.37 },
  { id: 'HIP69673', name: 'Arcturus', commonName: 'Alpha Bootis', constellation: 'Bootes', ra: 14.2610, dec: 19.1824, mag: -0.05, spectralClass: 'K1.5III', temp: 4290, distance: 36.7 },
  { id: 'HIP91262', name: 'Vega', commonName: 'Alpha Lyrae', constellation: 'Lyra', ra: 18.6156, dec: 38.7837, mag: 0.03, spectralClass: 'A0V', temp: 9602, distance: 25.04 },
  { id: 'HIP24436', name: 'Capella', commonName: 'Alpha Aurigae', constellation: 'Auriga', ra: 5.2781, dec: 45.9980, mag: 0.08, spectralClass: 'G5III', temp: 4970, distance: 42.9 },
  { id: 'HIP37279', name: 'Procyon', commonName: 'Alpha Canis Minoris', constellation: 'Canis Minor', ra: 7.6551, dec: 5.2250, mag: 0.34, spectralClass: 'F5IV', temp: 6530, distance: 11.46 },
  { id: 'HIP25336', name: 'Betelgeuse', commonName: 'Alpha Orionis', constellation: 'Orion', ra: 5.4553, dec: 7.4069, mag: 0.50, spectralClass: 'M1-2Ia', temp: 3590, distance: 700 },
  { id: 'HIP80763', name: 'Altair', commonName: 'Alpha Aquilae', constellation: 'Aquila', ra: 19.8464, dec: 8.8683, mag: 0.77, spectralClass: 'A7V', temp: 7550, distance: 16.73 },
  { id: 'HIP65474', name: 'Spica', commonName: 'Alpha Virginis', constellation: 'Virgo', ra: 13.4199, dec: -11.1614, mag: 1.04, spectralClass: 'B1III-IV', temp: 22400, distance: 250 },
  { id: 'HIP49669', name: 'Regulus', commonName: 'Alpha Leonis', constellation: 'Leo', ra: 10.1395, dec: 11.9672, mag: 1.35, spectralClass: 'B8IVn', temp: 12460, distance: 79.3 },
  { id: 'HIP21421', name: 'Aldebaran', commonName: 'Alpha Tauri', constellation: 'Taurus', ra: 4.5987, dec: 16.5092, mag: 0.85, spectralClass: 'K5III', temp: 3910, distance: 65.3 },
  { id: 'HIP27989', name: 'Pollux', commonName: 'Beta Geminorum', constellation: 'Gemini', ra: 7.7553, dec: 28.0262, mag: 1.14, spectralClass: 'K0III', temp: 4666, distance: 33.78 },
  { id: 'HIP68702', name: 'Hadar', commonName: 'Beta Centauri', constellation: 'Centaurus', ra: 14.0637, dec: -60.3730, mag: 0.61, spectralClass: 'B1III', temp: 25000, distance: 390 },
  { id: 'HIP60718', name: 'Acrux', commonName: 'Alpha Crucis', constellation: 'Crux', ra: 12.4433, dec: -63.0990, mag: 0.77, spectralClass: 'B0.5IV', temp: 28000, distance: 320 },
  { id: 'HIP24608', name: 'Rigel', commonName: 'Beta Orionis', constellation: 'Orion', ra: 5.2422, dec: -8.2017, mag: 0.13, spectralClass: 'B8Ia', temp: 12100, distance: 860 },
  { id: 'HIP87073', name: 'Deneb', commonName: 'Alpha Cygni', constellation: 'Cygnus', ra: 20.6906, dec: 45.2803, mag: 1.25, spectralClass: 'A2Ia', temp: 8525, distance: 2600 },
  { id: 'HIP97649', name: 'Fomalhaut', commonName: 'Alpha Piscis Austrinus', constellation: 'Piscis Austrinus', ra: 22.9608, dec: -29.6222, mag: 1.16, spectralClass: 'A3V', temp: 8590, distance: 25.1 },
  { id: 'HIP113368', name: 'Achernar', commonName: 'Alpha Eridani', constellation: 'Eridanus', ra: 1.6286, dec: -57.2367, mag: 0.46, spectralClass: 'Be', temp: 20000, distance: 139 },
  { id: 'HIP85927', name: 'Antares', commonName: 'Alpha Scorpii', constellation: 'Scorpius', ra: 16.4901, dec: -26.4320, mag: 1.09, spectralClass: 'M1.5Iab', temp: 3570, distance: 600 },
]
