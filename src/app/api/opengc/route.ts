import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

const LOCAL_NGC_PATH = join(process.cwd(), 'public', 'NGC.csv')
const LOCAL_ADDENDUM_PATH = join(process.cwd(), 'public', 'addendum.csv')
const REMOTE_NGC_URL = 'https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv'
const REMOTE_ADDENDUM_URL = 'https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/addendum.csv'

interface DeepSkyObject {
  id: string
  name: string
  catalog?: string
  type: 'galaxy' | 'nebula' | 'cluster' | 'planetary_nebula' | 'other'
  rightAscension: number // hours
  declination: number // degrees
  magnitude?: number
  sizeArcMin?: number
  constellation?: string
}

function parseRa(raStr: string): number {
  // Format: HH:MM:SS.ss or HH MM SS.ss
  const parts = raStr.trim().split(/[\s:]+/)
  if (parts.length >= 3) {
    const h = parseFloat(parts[0]) || 0
    const m = parseFloat(parts[1]) || 0
    const s = parseFloat(parts[2]) || 0
    return h + m / 60 + s / 3600
  }
  return parseFloat(raStr) || 0
}

function parseDec(decStr: string): number {
  // Format: +/-DD:MM:SS.s or +/-DD MM SS.s
  const trimmed = decStr.trim()
  const sign = trimmed.startsWith('-') ? -1 : 1
  const parts = trimmed.replace(/[+\-]/, '').split(/[\s:]+/)
  if (parts.length >= 3) {
    const d = parseFloat(parts[0]) || 0
    const m = parseFloat(parts[1]) || 0
    const s = parseFloat(parts[2]) || 0
    return sign * (d + m / 60 + s / 3600)
  }
  return parseFloat(trimmed) || 0
}

function mapType(type: string): DeepSkyObject['type'] {
  const t = type.toLowerCase()
  if (t.includes('galaxy') || t === 'g') return 'galaxy'
  if (t.includes('nebula') || t === 'neb') return 'nebula'
  if (t.includes('planetary')) return 'planetary_nebula'
  if (t.includes('cluster') || t === 'cl') return 'cluster'
  return 'other'
}

function parseNgcCsv(csv: string, maxMag: number, limit: number): DeepSkyObject[] {
  const lines = csv.split(/\r?\n/)
  if (lines.length < 2) return []
  
  // Semicolon-separated
  const header = lines[0].split(';')
  const idx = {
    name: header.indexOf('Name'),
    type: header.indexOf('Type'),
    ra: header.indexOf('RA'),
    dec: header.indexOf('Dec'),
    con: header.indexOf('Const'),
    majAx: header.indexOf('MajAx'),
    minAx: header.indexOf('MinAx'),
    bMag: header.indexOf('B-Mag'),
    vMag: header.indexOf('V-Mag'),
    surfBr: header.indexOf('SurfBr'),
    hubble: header.indexOf('Hubble'),
    m: header.indexOf('M'),
    ngc: header.indexOf('NGC'),
    ic: header.indexOf('IC'),
  }

  const results: DeepSkyObject[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const parts = line.split(';')
    
    const name = parts[idx.name] || ''
    const ra = parseRa(parts[idx.ra] || '0')
    const dec = parseDec(parts[idx.dec] || '0')
    const vMag = parseFloat(parts[idx.vMag] || '')
    const bMag = parseFloat(parts[idx.bMag] || '')
    const magnitude = Number.isFinite(vMag) && vMag > 0 ? vMag : (Number.isFinite(bMag) ? bMag : 99)
    
    if (magnitude > maxMag) continue
    
    const majAx = parseFloat(parts[idx.majAx] || '') || undefined
    const minAx = parseFloat(parts[idx.minAx] || '') || undefined
    const sizeArcMin = majAx && minAx ? Math.max(majAx, minAx) : majAx || minAx || undefined
    
    results.push({
      id: name,
      name: name,
      catalog: parts[idx.m] || parts[idx.ngc] || parts[idx.ic],
      type: mapType(parts[idx.type] || 'other'),
      rightAscension: ra,
      declination: dec,
      magnitude: Number.isFinite(magnitude) ? magnitude : undefined,
      sizeArcMin,
      constellation: parts[idx.con] || '',
    })
    if (results.length >= limit) break
  }
  return results
}

async function getDeepSkyObjects(maxMag: number, limit: number): Promise<DeepSkyObject[]> {
  try {
    const csv = readFileSync(LOCAL_NGC_PATH, 'utf-8')
    let addendum = ''
    try {
      addendum = readFileSync(LOCAL_ADDENDUM_PATH, 'utf-8')
    } catch {}
    const combined = csv + '\n' + addendum
    return parseNgcCsv(combined, maxMag, limit)
  } catch {
    // Fallback to remote
    try {
      const [ngcResp, addResp] = await Promise.all([
        fetch(REMOTE_NGC_URL, { next: { revalidate: 86400 } }),
        fetch(REMOTE_ADDENDUM_URL, { next: { revalidate: 86400 } }).catch(() => null),
      ])
      if (!ngcResp.ok) throw new Error('Remote NGC failed')
      let csv = await ngcResp.text()
      if (addResp?.ok) {
        csv += '\n' + await addResp.text()
      }
      return parseNgcCsv(csv, maxMag, limit)
    } catch {
      return []
    }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const maxMag = parseFloat(searchParams.get('maxMag') || '13')
  const limit = parseInt(searchParams.get('limit') || '1500', 10)
  const type = searchParams.get('type') || ''

  try {
    let objects = await getDeepSkyObjects(maxMag, limit)
    
    if (type) {
      objects = objects.filter(o => o.type === type)
    }

    return NextResponse.json({
      count: objects.length,
      source: 'OpenNGC',
      generated: new Date().toISOString(),
      objects,
    })
  } catch (e) {
    return NextResponse.json({ 
      error: 'OpenNGC parsing failed',
      objects: [],
      count: 0,
    }, { status: 500 })
  }
}
