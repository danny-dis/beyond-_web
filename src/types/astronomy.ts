// Location interface
export interface Location {
  latitude: number
  longitude: number
  city?: string
  country?: string
  timezone?: string
}

// Star data interface
export interface Star {
  id: string
  name: string
  commonName?: string
  constellation: string
  rightAscension: number // in hours
  declination: number // in degrees
  magnitude: number // apparent magnitude
  spectralClass: string
  temperature?: number // in Kelvin
  distance?: number // in light years
  color: string
  x: number // screen coordinates
  y: number
  visible: boolean
  azimuth: number // in degrees
  altitude: number // in degrees
}

// Constellation interface
export interface Constellation {
  id: string
  name: string
  abbreviation: string
  stars: string[] // star IDs
  lines: ConstellationLine[]
  mythology?: string
  bestViewingTime?: string
}

// Constellation line for drawing patterns
export interface ConstellationLine {
  from: string // star ID
  to: string // star ID
}

// Celestial object interface (planets, moon, etc.)
export interface CelestialObject {
  id: string
  name: string
  type: 'planet' | 'moon' | 'satellite'
  x: number
  y: number
  visible: boolean
  magnitude: number
  phase?: number // for moon phases (0-1)
  azimuth: number
  altitude: number
}

// Deep-sky objects (galaxies, nebulae, clusters)
export interface DeepSkyObject {
  id: string
  name: string
  catalog?: string // e.g., NGC, IC, Messier
  objectType: 'galaxy' | 'nebula' | 'cluster' | 'planetary_nebula' | 'other'
  rightAscension: number // hours
  declination: number // degrees
  magnitude?: number
  sizeArcMin?: number // approximate largest dimension in arcminutes
  x: number
  y: number
  visible: boolean
  azimuth: number
  altitude: number
}

// Time and location context
export interface SkyContext {
  location: Location
  dateTime: Date
  localSiderealTime: number
}

// Star catalog entry (raw data)
export interface StarCatalogEntry {
  id: string
  name: string
  commonName?: string
  constellation: string
  ra: number // right ascension in hours
  dec: number // declination in degrees
  mag: number // magnitude
  spectralClass: string
  temp?: number
  distance?: number
}

// Wikipedia data for educational content
export interface WikipediaData {
  title: string
  extract: string
  url: string
  thumbnail?: string
}

// User preferences
export interface UserPreferences {
  nightMode: boolean
  showConstellations: boolean
  showConstellationNames: boolean
  showStarNames: boolean
  minimumMagnitude: number
  location?: Location
  timeZone: string
}

// Sky map configuration
export interface SkyMapConfig {
  width: number
  height: number
  centerAzimuth: number
  centerAltitude: number
  fieldOfView: number // in degrees
  projection: 'stereographic' | 'orthographic'
}

// Search result for stars/objects
export interface SearchResult {
  id: string
  name: string
  type: 'star' | 'constellation' | 'planet' | 'moon'
  description: string
  coordinates?: {
    ra: number
    dec: number
  }
}
