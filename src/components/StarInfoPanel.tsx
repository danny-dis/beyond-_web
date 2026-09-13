'use client'

import React, { useState, useEffect } from 'react'
import { X, ExternalLink, Star as StarIcon, Thermometer, Ruler, Eye } from 'lucide-react'
import { Star } from '@/types/astronomy'

interface StarInfoPanelProps {
  star: Star | null
  onClose: () => void
  nightMode?: boolean
}

interface WikipediaInfo {
  title: string
  extract: string
  url: string
  thumbnail?: string
}

const StarInfoPanel: React.FC<StarInfoPanelProps> = ({ star, onClose, nightMode = true }) => {
  const [wikipediaInfo, setWikipediaInfo] = useState<WikipediaInfo | null>(null)
  const [loadingWiki, setLoadingWiki] = useState(false)

  useEffect(() => {
    if (!star) return

    const fetchWikipediaInfo = async () => {
      setLoadingWiki(true)
      try {
        const searchTerm = star.commonName || star.name
        const response = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`
        )

        if (response.ok) {
          const data = await response.json()
          setWikipediaInfo({
            title: data.title,
            extract: data.extract,
            url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(searchTerm)}`,
            thumbnail: data.thumbnail?.source
          })
        } else {
          const searchResponse = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(star.name + ' star')}`
          )
          if (searchResponse.ok) {
            const searchData = await searchResponse.json()
            setWikipediaInfo({
              title: searchData.title,
              extract: searchData.extract,
              url: searchData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(star.name)}`,
              thumbnail: searchData.thumbnail?.source
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch Wikipedia info:', error)
      } finally {
        setLoadingWiki(false)
      }
    }

    fetchWikipediaInfo()
  }, [star])

  if (!star) return null

  const getSpectralClassDescription = (spectralClass: string) => {
    const mainClass = spectralClass.charAt(0).toUpperCase()
    const descriptions: { [key: string]: string } = {
      'O': 'Very hot blue star',
      'B': 'Hot blue-white star',
      'A': 'White star',
      'F': 'Yellow-white star',
      'G': 'Yellow star (like our Sun)',
      'K': 'Orange star',
      'M': 'Cool red star'
    }
    return descriptions[mainClass] || 'Unknown type'
  }

  const getMagnitudeDescription = (magnitude: number) => {
    if (magnitude < 0) return 'Extremely bright'
    if (magnitude < 1) return 'Very bright'
    if (magnitude < 2) return 'Bright'
    if (magnitude < 3) return 'Moderately bright'
    if (magnitude < 4) return 'Visible to naked eye'
    if (magnitude < 5) return 'Faint'
    return 'Very faint'
  }

  return (
    <div className="info-overlay">
      {/* Header */}
      <div className="info-header">
        <div>
          <h2 className="flex items-center gap-2">
            <StarIcon className="w-5 h-5" style={{ color: star.color }} />
            {star.commonName || star.name}
          </h2>
          {star.commonName && star.name !== star.commonName && (
            <p className="subtitle">{star.name}</p>
          )}
        </div>
        <button onClick={onClose} className="info-close" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="info-body">
        {/* Star color preview */}
        <div className="color-preview">
          <div
            className="color-dot"
            style={{ backgroundColor: star.color, boxShadow: `0 0 20px ${star.color}` }}
          />
          <div className="text">
            <div className="name">Spectral Color</div>
            <div className="desc">Class {star.spectralClass} — {getSpectralClassDescription(star.spectralClass)}</div>
          </div>
        </div>

        {/* Info grid */}
        <div className="info-grid">
          <div className="info-card">
            <div className="label">Constellation</div>
            <div className="value">{star.constellation}</div>
          </div>
          <div className="info-card">
            <div className="label">Magnitude</div>
            <div className="value">{star.magnitude.toFixed(2)}</div>
            <div className="value small">{getMagnitudeDescription(star.magnitude)}</div>
          </div>
          <div className="info-card">
            <div className="label">Spectral Class</div>
            <div className="value">{star.spectralClass}</div>
          </div>
          {star.distance && (
            <div className="info-card">
              <div className="label">Distance</div>
              <div className="value">{star.distance.toFixed(1)} ly</div>
            </div>
          )}
          <div className="info-card">
            <div className="label">Right Ascension</div>
            <div className="value">{star.rightAscension.toFixed(4)}h</div>
          </div>
          <div className="info-card">
            <div className="label">Declination</div>
            <div className="value">{star.declination.toFixed(4)}°</div>
          </div>
          <div className="info-card">
            <div className="label">Azimuth</div>
            <div className="value">{star.azimuth.toFixed(1)}°</div>
          </div>
          <div className="info-card">
            <div className="label">Altitude</div>
            <div className="value">{star.altitude.toFixed(1)}°</div>
          </div>
          {star.temperature && (
            <div className="info-card">
              <div className="label">Temperature</div>
              <div className="value">{star.temperature.toLocaleString()} K</div>
            </div>
          )}
        </div>

        {/* Wikipedia section */}
        <div className="wiki-section">
          <h3>About This Star</h3>
          {loadingWiki ? (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="loading-spinner" style={{ width: 16, height: 16 }} />
              <span>Loading information...</span>
            </div>
          ) : wikipediaInfo ? (
            <div>
              {wikipediaInfo.thumbnail && (
                <img
                  src={wikipediaInfo.thumbnail}
                  alt={wikipediaInfo.title}
                  className="w-24 h-24 object-cover rounded-lg float-right ml-3 mb-2"
                />
              )}
              <p>{wikipediaInfo.extract}</p>
              <a
                href={wikipediaInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="w-3 h-3" />
                Read more on Wikipedia
              </a>
            </div>
          ) : (
            <p>No additional information available for this star.</p>
          )}
        </div>

        {/* Fun Facts */}
        <div className="facts-section">
          <h3>Did You Know?</h3>
          <ul>
            {star.distance && (
              <li>Light from this star takes {star.distance.toFixed(1)} years to reach Earth</li>
            )}
            {star.magnitude < 0 && (
              <li>This is one of the brightest stars visible from Earth</li>
            )}
            {star.spectralClass.startsWith('G') && (
              <li>This star is similar to our Sun in temperature and color</li>
            )}
            {star.spectralClass.startsWith('M') && (
              <li>This is a red dwarf star, the most common type in our galaxy</li>
            )}
            {(star.spectralClass.startsWith('O') || star.spectralClass.startsWith('B')) && (
              <li>This is a massive, hot star that burns through its fuel quickly</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default StarInfoPanel
