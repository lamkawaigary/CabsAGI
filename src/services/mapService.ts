// Map Service - Tencent Map Integration (like P7S)

// Static popular locations with coordinates
export const STATIC_LOCATIONS = [
  { id: 'hkg', name: '香港國際機場', address: '香港赤鱲角', lat: 22.3080, lng: 113.9185, keywords: ['機場', 'airport', 'hkg'] },
  { id: 'szw', name: '深圳灣口岸', address: '深圳南山區', lat: 22.4908, lng: 113.9436, keywords: ['深圳灣', 'szb', '口岸'] },
  { id: 'hg', name: '皇崗口岸', address: '深圳福田區', lat: 22.5104, lng: 114.0743, keywords: ['皇崗', 'hgg', '口岸'] },
  { id: 'lohu', name: '羅湖口岸', address: '深圳羅湖區', lat: 22.5283, lng: 114.1253, keywords: ['羅湖', 'lhg', '口岸'] },
  { id: 'lmg', name: '落馬洲口岸', address: '深圳福田區', lat: 22.5145, lng: 114.0614, keywords: ['落馬洲', 'lmg', '口岸'] },
  { id: 'hzmb', name: '港珠澳大橋', address: '珠海香洲區', lat: 22.3155, lng: 113.9372, keywords: ['港珠澳', 'hzmb', '大橋'] },
  { id: 'central', name: '中環', address: '香港中環', lat: 22.2823, lng: 114.1586, keywords: ['中環', 'central'] },
  { id: 'mongkok', name: '旺角', address: '香港旺角', lat: 22.3178, lng: 114.1734, keywords: ['旺角', 'mk', ' Mongkok'] },
  { id: 'tst', name: '尖沙咀', address: '香港尖沙咀', lat: 22.2964, lng: 114.1619, keywords: ['尖沙咀', 'tst', 'Tsim Sha Tsui'] },
  { id: 'sha Tin', name: '沙田', address: '香港沙田', lat: 22.3879, lng: 114.2036, keywords: ['沙田', 'st', 'Shatin'] },
  { id: 'tuen Mun', name: '屯門', address: '香港屯門', lat: 22.3934, lng: 113.9768, keywords: ['屯門', 'tm', 'TuenMun'] },
  { id: 'sheung Shui', name: '上水', address: '香港上水', lat: 22.4965, lng: 114.1342, keywords: ['上水', 'ss', 'SheungShui'] },
  { id: 'sz', name: '深圳市區', address: '深圳', lat: 22.5431, lng: 114.0579, keywords: ['深圳', 'sz', 'Shenzhen'] },
  { id: 'gz', name: '廣州市區', address: '廣州', lat: 23.1291, lng: 113.2644, keywords: ['廣州', 'gz', 'Guangzhou'] },
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

// Search locations
export const searchLocation = async (query: string): Promise<typeof STATIC_LOCATIONS[]> => {
  const q = query.toLowerCase().trim()
  if (!q) return []
  
  // Static matches first
  const matches = STATIC_LOCATIONS.filter(l => 
    l.name.toLowerCase().includes(q) || 
    l.keywords.some(k => q.includes(k)) ||
    l.address.toLowerCase().includes(q)
  )
  
  return matches.slice(0, 5)
}

// Calculate distance between two points
export const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371 // Radius of earth in km
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const deg2rad = (deg: number) => deg * (Math.PI/180)

// Calculate route and detect tunnels
export interface RouteResult {
  distance: number // km
  duration: number // minutes
  tolls: typeof TOLL_LOCATIONS
  hasCrossBorder: boolean
}

export const calculateRoute = async (
  pickup: typeof STATIC_LOCATIONS[0], 
  dropoff: typeof STATIC_LOCATIONS[0]
): Promise<RouteResult> => {
  // Calculate straight-line distance
  const distance = getDistanceFromLatLonInKm(
    pickup.lat, pickup.lng,
    dropoff.lat, dropoff.lng
  )
  
  // Estimate duration (average 40km/h in city, 80km/h on highway)
  const isCrossBorder = isCrossBorderRoute(pickup, dropoff)
  const avgSpeed = isCrossBorder ? 60 : 40
  const duration = Math.round((distance / avgSpeed) * 60)
  
  // Detect which tolls apply
  const tolls = detectTolls(pickup, dropoff)
  
  return {
    distance: Math.round(distance * 10) / 10,
    duration,
    tolls,
    hasCrossBorder: isCrossBorder
  }
}

const isCrossBorderRoute = (a: typeof STATIC_LOCATIONS[0], b: typeof STATIC_LOCATIONS[0]) => {
  // Check if one is HK and other is mainland
  const hkIds = STATIC_LOCATIONS.filter(l => !['sz', 'gz'].some(k => l.id.includes(k) || l.name.includes(k)))
  const cnIds = ['sz', 'gz']
  
  const aIsHK = !cnIds.some(k => a.id.includes(k) || a.name.includes(k))
  const bIsHK = !cnIds.some(k => b.id.includes(k) || b.name.includes(k))
  
  return aIsHK !== bIsHK
}

const detectTolls = (pickup: typeof STATIC_LOCATIONS[0], dropoff: typeof STATIC_LOCATIONS[0]) => {
  const detected: typeof TOLL_LOCATIONS = []
  
  // If cross-border, add relevant tolls
  if (isCrossBorderRoute(pickup, dropoff)) {
    // Check if going via Shenzhen Bay or HZMB
    const viaSzBay = (pickup.id === 'hkg' || pickup.id === 'tst' || pickup.id === 'central') && 
                     (dropoff.id === 'sz' || dropoff.id === 'szw')
    const viaHZMB = (pickup.id === 'hkg' || pickup.id === 'tst') && dropoff.id === 'hzmb'
    
    if (viaSzBay || dropoff.id === 'szw') {
      detected.push(TOLL_LOCATIONS.find(t => t.id === 'sz_bay')!)
    }
    if (viaHZMB || dropoff.id === 'hzmb') {
      detected.push(TOLL_LOCATIONS.find(t => t.id === 'hzmb')!)
    }
  }
  
  // Add harbor tunnels if going between HK island and Kowloon/NT
  const needsHarborTunnel = (
    (pickup.id === 'central' && ['mongkok', 'tst', 'sha tin'].some(k => dropoff.id.includes(k))) ||
    (dropoff.id === 'central' && ['mongkok', 'tst', 'sha tin'].some(k => pickup.id.includes(k)))
  )
  
  if (needsHarborTunnel) {
    detected.push(TOLL_LOCATIONS.find(t => t.id === 'cross')!) //红隧
  }
  
  return detected.filter(Boolean)
}

// Pricing calculation (same as P7S)
export interface PricingResult {
  total: number
  distance: string
  duration: number
  tollsTotal: number
}

export const calculatePrice = (route: RouteResult): PricingResult => {
  const { distance, duration, tolls } = route
  
  // Base pricing (same as P7S)
  const baseRate = 80
  const perKm = 12
  
  // Tiered mileage (same as P7S)
  let mileageCost = 0
  if (distance > 10) {
    if (distance <= 50) {
      mileageCost = (distance - 10) * 10
    } else if (distance <= 100) {
      mileageCost = 40 * 10 + (distance - 50) * 8
    } else {
      mileageCost = 40 * 10 + 50 * 8 + (distance - 100) * 6
    }
  }
  
  // Tunnel fees
  const tollsTotal = tolls.reduce((sum, t) => sum + t.fee, 0)
  
  // Total
  const total = Math.ceil(Math.max(baseRate, mileageCost) + tollsTotal)
  
  return {
    total,
    distance: distance.toFixed(1),
    duration,
    tollsTotal
  }
}

export default {
  STATIC_LOCATIONS,
  TOLL_LOCATIONS,
  searchLocation,
  calculateRoute,
  calculatePrice
}
