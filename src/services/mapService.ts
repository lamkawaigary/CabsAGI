// Map Service - Tencent Map Integration

export interface LocationRecord {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  keywords: string[]
  source?: 'ai' | 'local'
}

export interface RouteCheckpoint {
  id: string
  name: string
  type: 'toll' | 'border'
  fee?: number
}

export interface RoutePathPoint {
  lat: number
  lng: number
}

const TENCENT_MAP_KEY = 'D42BZ-JZFCL-A2QPT-E2EKZ-D2WX5-VPFWY'
const JSONP_TIMEOUT_MS = 5000

// Static popular locations with coordinates
export const STATIC_LOCATIONS: LocationRecord[] = [
  { id: 'hkg', name: '香港國際機場', address: '香港赤鱲角', lat: 22.308, lng: 113.9185, keywords: ['機場', 'airport', 'hkg'] },
  { id: 'szw', name: '深圳灣口岸', address: '深圳南山區', lat: 22.4908, lng: 113.9436, keywords: ['深圳灣', 'szb', '口岸'] },
  { id: 'hg', name: '皇崗口岸', address: '深圳福田區', lat: 22.5104, lng: 114.0743, keywords: ['皇崗', 'hgg', '口岸'] },
  { id: 'lohu', name: '羅湖口岸', address: '深圳羅湖區', lat: 22.5283, lng: 114.1253, keywords: ['羅湖', 'lhg', '口岸'] },
  { id: 'lmg', name: '落馬洲口岸', address: '深圳福田區', lat: 22.5145, lng: 114.0614, keywords: ['落馬洲', 'lmg', '口岸'] },
  { id: 'hzmb', name: '港珠澳大橋', address: '珠海香洲區', lat: 22.3155, lng: 113.9372, keywords: ['港珠澳', 'hzmb', '大橋'] },
  { id: 'central', name: '中環', address: '香港中環', lat: 22.2823, lng: 114.1586, keywords: ['中環', 'central'] },
  { id: 'mongkok', name: '旺角', address: '香港旺角', lat: 22.3178, lng: 114.1734, keywords: ['旺角', 'mk', 'mongkok'] },
  { id: 'tst', name: '尖沙咀', address: '香港尖沙咀', lat: 22.2964, lng: 114.1619, keywords: ['尖沙咀', 'tst', 'tsim sha tsui'] },
  { id: 'sha-tin', name: '沙田', address: '香港沙田', lat: 22.3879, lng: 114.2036, keywords: ['沙田', 'st', 'shatin'] },
  { id: 'tuen-mun', name: '屯門', address: '香港屯門', lat: 22.3934, lng: 113.9768, keywords: ['屯門', 'tm', 'tuenmun'] },
  { id: 'sheung-shui', name: '上水', address: '香港上水', lat: 22.4965, lng: 114.1342, keywords: ['上水', 'ss', 'sheungshui'] },
  { id: 'sz', name: '深圳市區', address: '深圳', lat: 22.5431, lng: 114.0579, keywords: ['深圳', 'sz', 'shenzhen'] },
  { id: 'gz', name: '廣州市區', address: '廣州', lat: 23.1291, lng: 113.2644, keywords: ['廣州', 'gz', 'guangzhou'] },
]

// Tunnel/Crossing fees
export const TOLL_LOCATIONS = [
  { id: 'sz_bay', name: '深圳灣口岸', fee: 0, lat: 22.4908, lng: 113.9436 },
  { id: 'hzmb', name: '港珠澳大橋', fee: 200, lat: 22.3155, lng: 113.9372 },
  { id: 'west', name: '西區海底隧道', fee: 100, lat: 22.2985, lng: 114.1542 },
  { id: 'cross', name: '紅磡海底隧道', fee: 50, lat: 22.3025, lng: 114.1802 },
  { id: 'east', name: '東區海底隧道', fee: 50, lat: 22.2965, lng: 114.2345 },
  { id: 'tailam', name: '大欖隧道', fee: 64, lat: 22.4228, lng: 114.0628 },
  { id: 'lion', name: '獅子山隧道', fee: 8, lat: 22.3551, lng: 114.1822 },
  { id: 'tates', name: '大老山隧道', fee: 20, lat: 22.3582, lng: 114.2185 },
]

const BORDER_CHECKPOINTS = [
  { id: 'szw', name: '深圳灣口岸', lat: 22.4908, lng: 113.9436 },
  { id: 'hg', name: '皇崗口岸', lat: 22.5104, lng: 114.0743 },
  { id: 'lohu', name: '羅湖口岸', lat: 22.5283, lng: 114.1253 },
  { id: 'lmg', name: '落馬洲口岸', lat: 22.5145, lng: 114.0614 },
]

const normalize = (v: string) => v.trim().toLowerCase()

interface TencentSuggestionItem {
  id?: string | number
  title?: string
  address?: string
  location?: {
    lat?: number | string
    lng?: number | string
  }
}

interface TencentSuggestionResponse {
  data?: TencentSuggestionItem[]
}

interface TencentDrivingRoute {
  distance?: number
  duration?: number
  polyline?: number[]
}

interface TencentDrivingResponse {
  status?: number
  result?: {
    routes?: TencentDrivingRoute[]
  }
}

interface OSMNominatimItem {
  place_id: number | string
  display_name: string
  lat: string
  lon: string
}

const staticSearch = (query: string): LocationRecord[] => {
  const q = normalize(query)
  if (!q) return []

  return STATIC_LOCATIONS.filter(
    (l) => l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q) || l.keywords.some((k) => q.includes(normalize(k))),
  )
    .slice(0, 10)
    .map((l) => ({ ...l, source: 'local' as const }))
}

// Fallback: OpenStreetMap Nominatim (free, reliable)
const fetchOSMSuggestions = async (query: string): Promise<LocationRecord[]> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&countrycodes=hk,cn`,
      { headers: { 'Accept-Language': 'zh-HK,zh,en' } },
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    
    return data
      .filter(
        (item: unknown): item is OSMNominatimItem =>
          typeof item === 'object' &&
          item !== null &&
          'place_id' in item &&
          'display_name' in item &&
          'lat' in item &&
          'lon' in item &&
          typeof (item as OSMNominatimItem).display_name === 'string' &&
          typeof (item as OSMNominatimItem).lat === 'string' &&
          typeof (item as OSMNominatimItem).lon === 'string',
      )
      .map((item) => ({
        id: `osm-${item.place_id}`,
        name: item.display_name.split(',')[0] || item.display_name,
        address: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        keywords: [],
        source: 'ai' as const,
      }))
  } catch {
    return []
  }
}

const fetchTencentSuggestions = async (query: string): Promise<LocationRecord[]> => {
  const q = query.trim()
  if (q.length < 2) return []

  const boundary = q.includes('深圳') || q.includes('廣州') || q.includes('珠海') ? 'region(深圳,0)' : 'region(香港,0)'
  const baseUrl = `https://apis.map.qq.com/ws/place/v1/suggestion?keyword=${encodeURIComponent(q)}&boundary=${encodeURIComponent(boundary)}&region_fix=0&output=jsonp&key=${TENCENT_MAP_KEY}`

  try {
    const data = await new Promise<TencentSuggestionResponse>((resolve, reject) => {
      const callbackName = `tmapJsonp_${Date.now()}_${Math.floor(Math.random() * 10000)}`
      const scopedWindow = window as unknown as Record<string, unknown>
      const script = document.createElement('script')
      const timer = window.setTimeout(() => {
        cleanup()
        reject(new Error('JSONP timeout'))
      }, JSONP_TIMEOUT_MS)

      const cleanup = () => {
        window.clearTimeout(timer)
        if (script.parentNode) script.parentNode.removeChild(script)
        Reflect.deleteProperty(scopedWindow, callbackName)
      }

      scopedWindow[callbackName] = (payload: TencentSuggestionResponse) => {
        cleanup()
        resolve(payload)
      }

      script.src = `${baseUrl}&callback=${callbackName}`
      script.onerror = () => {
        cleanup()
        reject(new Error('JSONP request failed'))
      }

      document.body.appendChild(script)
    })

    if (!data?.data || !Array.isArray(data.data)) return []

    const suggestions: LocationRecord[] = []
    for (let idx = 0; idx < data.data.length && suggestions.length < 8; idx += 1) {
      const item = data.data[idx]
      const lat = Number(item.location?.lat)
      const lng = Number(item.location?.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

      const title = item.title || item.address || q
      const address = item.address || item.title || '未知地址'
      const keywords = [item.title, item.address]
        .filter((keyword): keyword is string => typeof keyword === 'string' && keyword.length > 0)
        .map((keyword) => keyword.toLowerCase())

      suggestions.push({
        id: `tx-${item.id || idx}`,
        name: title,
        address,
        lat,
        lng,
        keywords,
        source: 'ai',
      })
    }
    return suggestions
  } catch {
    return []
  }
}

// Search locations with online suggestions + static fallback
export const searchLocation = async (query: string): Promise<LocationRecord[]> => {
  // Try static first (fast)
  const local = staticSearch(query)
  
  // Try Tencent API
  let online: LocationRecord[] = []
  try {
    online = await fetchTencentSuggestions(query)
  } catch (e) {
    console.warn('Tencent search failed, trying OSM fallback:', e)
    // Fallback to OpenStreetMap if Tencent fails
    try {
      online = await fetchOSMSuggestions(query)
    } catch (e2) {
      console.warn('OSM fallback also failed:', e2)
    }
  }

  const merged = [...local, ...online]

  const seen = new Set<string>()
  const deduped: LocationRecord[] = []

  for (const item of merged) {
    const key = `${item.name}-${item.lat.toFixed(4)}-${item.lng.toFixed(4)}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
    if (deduped.length >= 10) break
  }

  return deduped
}

const deg2rad = (deg: number) => deg * (Math.PI / 180)

export const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const inferMainland = (p: LocationRecord) => {
  const text = `${p.id} ${p.name} ${p.address}`.toLowerCase()
  if (text.includes('深圳') || text.includes('廣州') || text.includes('珠海') || text.includes('sz') || text.includes('gz')) return true
  return p.lat > 22.48
}

const detectTolls = (pickup: LocationRecord, dropoff: LocationRecord): typeof TOLL_LOCATIONS => {
  const detected: typeof TOLL_LOCATIONS = []
  const isCrossBorder = inferMainland(pickup) !== inferMainland(dropoff)

  if (isCrossBorder) {
    const viaHZMB = `${pickup.name}${dropoff.name}`.includes('港珠澳')
    if (viaHZMB) {
      detected.push(TOLL_LOCATIONS.find((t) => t.id === 'hzmb')!)
    } else {
      detected.push(TOLL_LOCATIONS.find((t) => t.id === 'sz_bay')!)
    }
  }

  const needsHarborTunnel =
    (pickup.name.includes('中環') && (dropoff.name.includes('旺角') || dropoff.name.includes('尖沙咀'))) ||
    (dropoff.name.includes('中環') && (pickup.name.includes('旺角') || pickup.name.includes('尖沙咀')))

  if (needsHarborTunnel) detected.push(TOLL_LOCATIONS.find((t) => t.id === 'cross')!)

  return detected.filter(Boolean)
}

const detectCheckpoints = (pickup: LocationRecord, dropoff: LocationRecord, tolls: typeof TOLL_LOCATIONS): RouteCheckpoint[] => {
  const checkpoints: RouteCheckpoint[] = tolls.map((t) => ({ id: t.id, name: t.name, type: 'toll', fee: t.fee }))

  const isCrossBorder = inferMainland(pickup) !== inferMainland(dropoff)
  if (isCrossBorder) {
    const preferred = BORDER_CHECKPOINTS
      .map((b) => ({ b, d: getDistanceFromLatLonInKm(dropoff.lat, dropoff.lng, b.lat, b.lng) }))
      .sort((a, b) => a.d - b.d)[0]?.b

    const border = preferred || BORDER_CHECKPOINTS[0]
    checkpoints.push({ id: border.id, name: border.name, type: 'border' })
  }

  const seen = new Set<string>()
  return checkpoints.filter((c) => {
    if (seen.has(c.id)) return false
    seen.add(c.id)
    return true
  })
}

export interface RouteResult {
  distance: number
  duration: number
  tolls: typeof TOLL_LOCATIONS
  hasCrossBorder: boolean
  checkpoints: RouteCheckpoint[]
  path: RoutePathPoint[]
  hasRealPath: boolean
}

const decodeTencentPolyline = (raw: number[]): RoutePathPoint[] => {
  const coors = raw.map((n) => Number(n))
  if (coors.length < 2) return []

  for (let i = 2; i < coors.length; i += 1) {
    coors[i] = coors[i - 2] + coors[i] / 1000000
  }

  const points: RoutePathPoint[] = []
  for (let i = 0; i < coors.length - 1; i += 2) {
    const lat = coors[i]
    const lng = coors[i + 1]
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      points.push({ lat, lng })
    }
  }
  return points
}

const fetchTencentDrivingRoute = async (
  pickup: LocationRecord,
  dropoff: LocationRecord,
): Promise<{ distanceKm: number; durationMin: number; path: RoutePathPoint[] } | null> => {
  const from = `${pickup.lat},${pickup.lng}`
  const to = `${dropoff.lat},${dropoff.lng}`
  const url = `https://apis.map.qq.com/ws/direction/v1/driving/?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&output=json&key=${TENCENT_MAP_KEY}`

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as TencentDrivingResponse
    if (data?.status !== 0) return null

    const route = data?.result?.routes?.[0]
    if (!route) return null

    const polylineRaw: number[] = Array.isArray(route.polyline) ? route.polyline : []
    const decoded = decodeTencentPolyline(polylineRaw)
    const path = decoded.length >= 2 ? decoded : [{ lat: pickup.lat, lng: pickup.lng }, { lat: dropoff.lat, lng: dropoff.lng }]

    const distanceKm = Number(route.distance || 0) / 1000
    const durationMin = Number(route.duration || 0) / 60

    if (!Number.isFinite(distanceKm) || !Number.isFinite(durationMin) || distanceKm <= 0 || durationMin <= 0) {
      return null
    }

    return {
      distanceKm,
      durationMin,
      path,
    }
  } catch {
    return null
  }
}

export const calculateRoute = async (pickup: LocationRecord, dropoff: LocationRecord): Promise<RouteResult> => {
  const driving = await fetchTencentDrivingRoute(pickup, dropoff)
  const hasCrossBorder = inferMainland(pickup) !== inferMainland(dropoff)

  const fallbackDistance = getDistanceFromLatLonInKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng)
  const fallbackDuration = Math.round((fallbackDistance / (hasCrossBorder ? 60 : 40)) * 60)

  const distance = driving ? Math.round(driving.distanceKm * 10) / 10 : Math.round(fallbackDistance * 10) / 10
  const duration = driving ? Math.round(driving.durationMin) : fallbackDuration
  const path = driving?.path || [{ lat: pickup.lat, lng: pickup.lng }, { lat: dropoff.lat, lng: dropoff.lng }]

  const tolls = detectTolls(pickup, dropoff)
  const checkpoints = detectCheckpoints(pickup, dropoff, tolls)

  return {
    distance,
    duration,
    tolls,
    hasCrossBorder,
    checkpoints,
    path,
    hasRealPath: !!driving,
  }
}

export interface PricingResult {
  total: number
  distance: string
  duration: number
  tollsTotal: number
}

export const calculatePrice = (route: RouteResult): PricingResult => {
  const { distance, duration, tolls } = route
  const baseRate = 80

  let mileageCost = 0
  if (distance > 10) {
    if (distance <= 50) mileageCost = (distance - 10) * 10
    else if (distance <= 100) mileageCost = 40 * 10 + (distance - 50) * 8
    else mileageCost = 40 * 10 + 50 * 8 + (distance - 100) * 6
  }

  const tollsTotal = tolls.reduce((sum, t) => sum + t.fee, 0)
  const total = Math.ceil(Math.max(baseRate, mileageCost) + tollsTotal)

  return {
    total,
    distance: distance.toFixed(1),
    duration,
    tollsTotal,
  }
}

export default {
  STATIC_LOCATIONS,
  TOLL_LOCATIONS,
  searchLocation,
  calculateRoute,
  calculatePrice,
}
