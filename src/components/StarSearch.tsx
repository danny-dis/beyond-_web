'use client'

import React, { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Star } from '@/types/astronomy'

interface StarSearchProps {
  stars: Star[]
  onStarSelect: (star: Star) => void
  nightMode: boolean
}

const StarSearch: React.FC<StarSearchProps> = ({ stars, onStarSelect, nightMode }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Star[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const q = query.toLowerCase()
    const matches = stars.filter(star => 
      star.name.toLowerCase().includes(q) ||
      (star.commonName && star.commonName.toLowerCase().includes(q)) ||
      star.constellation.toLowerCase().includes(q)
    ).slice(0, 8)
    
    setResults(matches)
  }, [query, stars])

  const handleSelect = (star: Star) => {
    onStarSelect(star)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div className="absolute top-20 left-2 sm:left-4 z-30">
      <div className={`flex items-center rounded-lg ${nightMode ? 'bg-black bg-opacity-80' : 'bg-white bg-opacity-90 border border-gray-300'}`}>
        <Search className={`w-4 h-4 ml-2 ${nightMode ? 'text-gray-400' : 'text-gray-600'}`} />
        <input
          type="text"
          placeholder="Search stars..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
          className={`w-32 sm:w-48 p-2 text-sm bg-transparent outline-none ${nightMode ? 'text-white placeholder-gray-400' : 'text-gray-800 placeholder-gray-500'}`}
        />
        {query && (
          <button onClick={() => { setQuery(''); setIsOpen(false) }} className="mr-2">
            <X className={`w-4 h-4 ${nightMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        )}
      </div>
      
      {isOpen && results.length > 0 && (
        <div className={`mt-1 rounded-lg overflow-hidden ${nightMode ? 'bg-black bg-opacity-90' : 'bg-white bg-opacity-95 border border-gray-300'}`}>
          {results.map(star => (
            <button
              key={star.id}
              onClick={() => handleSelect(star)}
              className={`w-full text-left p-2 text-sm hover:bg-opacity-20 hover:bg-blue-500 ${nightMode ? 'text-white' : 'text-gray-800'}`}
            >
              <div className="font-medium">{star.commonName || star.name}</div>
              <div className={`text-xs ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {star.constellation} • Mag {star.magnitude.toFixed(1)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default StarSearch
