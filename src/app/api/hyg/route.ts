import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { StarCatalogEntry } from '@/types/astronomy'

// Local HYG catalog - bundled with the app
const LOCAL_HYG_PATH = join(process.cwd(), 'public', 'hygdata_v3.csv')
// Remote fallback
const REMOTE_HYG_URL = 'https://raw.githubusercontent.com/kiloquad/__HYG-Database/master/hygdata_v3.csv'

async function getHygCsv(minMag: number, maxMag: number, limit: number): Promise<StarCatalogEntry[]> {
  let csv: string
  
  try {
    csv = readFileSync(LOCAL_HYG_PATH, 'utf-8')
  } catch {
    try {
      const resp = await fetch(REMOTE_HYG_URL, { next: { revalidate: 86400 } })
      if (!resp.ok) throw new Error('Remote HYG failed')
      csv = await resp.text()
    } catch {
      return []
    }
  }

  const rows = csv.split(/\r?\n/)
  const header = rows.shift() || ''
  const cols = header.split(',')
  const idx = {
    id: cols.indexOf('id'),
    name: cols.indexOf('proper'),
    ra: cols.indexOf('ra'),
    dec: cols.indexOf('dec'),
    mag: cols.indexOf('mag'),
    spect: cols.indexOf('spect'),
    dist: cols.indexOf('dist'),
    con: cols.indexOf('con'),
    bayer: cols.indexOf('bayer'),
    hd: cols.indexOf('hd'),
    pmra: cols.indexOf('pmra'),
    pmdec: cols.indexOf('pmdec'),
    rv: cols.indexOf('rv'),
    plx: cols.indexOf('plx'),
  }

  const results: StarCatalogEntry[] = []
  for (const line of rows) {
    if (!line) continue
    const parts = safeSplitCsv(line, cols.length)
    const mag = parseFloat(parts[idx.mag] || '')
    if (Number.isFinite(mag) && (mag < minMag || mag > maxMag)) continue
    const ra = parseFloat(parts[idx.ra] || '')
    const dec = parseFloat(parts[idx.dec] || '')
    if (!Number.isFinite(ra) || !Number.isFinite(dec)) continue
    const dist = parseFloat(parts[idx.dist] || '')
    
    // Parse proper motion, radial velocity, and parallax for astronomy-engine
    const pmra = parseFloat(parts[idx.pmra] || '')
    const pmdec = parseFloat(parts[idx.pmdec] || '')
    const rv = parseFloat(parts[idx.rv] || '')
    const plx = parseFloat(parts[idx.plx] || '')
    
    results.push({
      id: String(parts[idx.id]) || `hyg-${results.length}`,
      name: parts[idx.name] || `HD ${parts[idx.hd] || ''}`,
      constellation: parts[idx.con] || '',
      ra,
      dec,
      mag: Number.isFinite(mag) ? mag : 99,
      spectralClass: parts[idx.spect] || 'G',
      distance: Number.isFinite(dist) && dist > 0 ? dist : undefined,
      pmra: Number.isFinite(pmra) ? pmra : undefined,
      pmdec: Number.isFinite(pmdec) ? pmdec : undefined,
      rv: Number.isFinite(rv) ? rv : undefined,
      plx: Number.isFinite(plx) ? plx : undefined,
    })
    if (results.length >= limit) break
  }
  return results
}

function safeSplitCsv(line: string, expected: number): string[] {
  const out: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else { inQuotes = !inQuotes }
    } else if (ch === ',' && !inQuotes) {
      out.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  out.push(current)
  while (out.length < expected) out.push('')
  return out
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const minMag = parseFloat(searchParams.get('minMag') || '-1.5')
  const maxMag = parseFloat(searchParams.get('maxMag') || '7')
  const limit = parseInt(searchParams.get('limit') || '2000', 10)
  const constellation = searchParams.get('con') || ''

  try {
    let stars = await getHygCsv(minMag, maxMag, limit)
    
    if (constellation) {
      stars = stars.filter(s => s.constellation?.toLowerCase() === constellation.toLowerCase())
    }

    return NextResponse.json({
      count: stars.length,
      source: 'HYG v3.0',
      generated: new Date().toISOString(),
      stars,
    })
  } catch (e) {
    return NextResponse.json({ 
      error: 'HYG parsing failed',
      stars: [],
      count: 0,
    }, { status: 500 })
  }
}
