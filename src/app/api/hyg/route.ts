import { NextRequest } from 'next/server'
import type { StarCatalogEntry } from '@/types/astronomy'

// Public source (HYG v3) CSV on GitHub
const HYG_CSV_URL = 'https://raw.githubusercontent.com/astronexus/HYG-Database/master/hygdata_v3.csv'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const minMag = parseFloat(searchParams.get('minMag') || '-99')
  const maxMag = parseFloat(searchParams.get('maxMag') || '10')
  const limit = parseInt(searchParams.get('limit') || '2000', 10)

  try {
    const resp = await fetch(HYG_CSV_URL, { cache: 'no-store' })
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch HYG CSV' }), { status: 502 })
    }
    const csv = await resp.text()

    const rows = csv.split(/\r?\n/)
    const header = rows.shift() || ''
    // HYG v3 header fields of interest
    // id,proper,ra,dec,mag,spect,dist
    const cols = header.split(',')
    const idx = {
      id: cols.indexOf('id'),
      name: cols.indexOf('proper'),
      ra: cols.indexOf('ra'),
      dec: cols.indexOf('dec'),
      mag: cols.indexOf('mag'),
      spect: cols.indexOf('spect'),
      dist: cols.indexOf('dist')
    }

    const results: StarCatalogEntry[] = []
    for (const line of rows) {
      if (!line) continue
      const parts = safeSplitCsv(line, cols.length)
      const mag = parseFloat(parts[idx.mag] || '')
      if (Number.isFinite(mag)) {
        if (mag < minMag || mag > maxMag) continue
      }
      const ra = parseFloat(parts[idx.ra] || '') // hours already in HYG
      const dec = parseFloat(parts[idx.dec] || '')
      if (!Number.isFinite(ra) || !Number.isFinite(dec)) continue
      const id = parts[idx.id]
      const name = parts[idx.name]
      const spect = parts[idx.spect] || 'G'
      const dist = parseFloat(parts[idx.dist] || '')

      results.push({
        id: String(id),
        name: name || `HYG ${id}`,
        constellation: '',
        ra,
        dec,
        mag: Number.isFinite(mag) ? mag : 99,
        spectralClass: spect,
        distance: Number.isFinite(dist) ? dist : undefined
      })
      if (results.length >= limit) break
    }

    return Response.json(results)
  } catch (e) {
    return new Response(JSON.stringify({ error: 'HYG parsing failed' }), { status: 500 })
  }
}

// Minimal CSV splitter supporting quoted fields without embedded newlines
function safeSplitCsv(line: string, expected: number): string[] {
  const out: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
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


