import { useMemo } from 'react'

interface Location {
  lat: number
  lng: number
  name: string
}

interface TencentMapProps {
  pickup?: Location | null
  dropoff?: Location | null
  routePath?: Array<{ lat: number; lng: number }>
  height?: string
}

const TENCENT_MAP_KEY = 'D42BZ-JZFCL-A2QPT-E2EKZ-D2WX5-VPFWY'

// Convert WGS84 to GCJ02 (for Tencent)
const wgs84ToGcj02 = (lng: number, lat: number) => {
  const PI = 3.1415926535897932384626
  const a = 6378245.0
  const ee = 0.00669342162296594323

  if ((lng < 72.004 || lng > 137.8347) || (lat < 0.8293 || lat > 55.8271)) {
    return { lat, lng }
  }
  
  let dlat = (lng - 105.0) * Math.PI * 3000.0 / 180.0
  let dlng = (lat - 35.0) * Math.PI * 3000.0 / 180.0
  
  const radlat = lat / 180.0 * PI
  let magic = Math.sin(radlat)
  magic = 1 - ee * magic * magic
  const sqrtmagic = Math.sqrt(magic)
  
  dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI)
  dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI)
  
  return { lat: lat + dlat, lng: lng + dlng }
}

export default function TencentMap({ pickup, dropoff, routePath, height = '400px' }: TencentMapProps) {
  const mapUrl = useMemo(() => {
    // Default center: Hong Kong
    let centerLat = 22.3193
    let centerLng = 114.1694
    let label = '香港'

    // If we have both pickup and dropoff, show route
    if (pickup && dropoff) {
      const s = wgs84ToGcj02(pickup.lng, pickup.lat)
      const e = wgs84ToGcj02(dropoff.lng, dropoff.lat)
      
      return `https://apis.map.qq.com/tools/routeplan?type=drive&from=${encodeURIComponent(pickup.name || '上車地點')}&fromcoord=${s.lat},${s.lng}&to=${encodeURIComponent(dropoff.name || '落車地點')}&tocoord=${e.lat},${e.lng}&policy=1&coord_type=5&referer=CabsAGI&key=${TENCENT_MAP_KEY}`
    }
    
    // If we have pickup only
    if (pickup) {
      const gcj = wgs84ToGcj02(pickup.lng, pickup.lat)
      centerLat = gcj.lat
      centerLng = gcj.lng
      label = pickup.name || '上車地點'
      
      return `https://apis.map.qq.com/tools/poimarker?type=0&marker=coord:${gcj.lat},${gcj.lng};title:${encodeURIComponent(label)};addr:${encodeURIComponent(label)}&key=${TENCENT_MAP_KEY}&referer=CabsAGI`
    }
    
    // If we have dropoff only
    if (dropoff) {
      const gcj = wgs84ToGcj02(dropoff.lng, dropoff.lat)
      centerLat = gcj.lat
      centerLng = gcj.lng
      label = dropoff.name || '落車地點'
      
      return `https://apis.map.qq.com/tools/poimarker?type=0&marker=coord:${gcj.lat},${gcj.lng};title:${encodeURIComponent(label)};addr:${encodeURIComponent(label)}&key=${TENCENT_MAP_KEY}&referer=CabsAGI`
    }
    
    // Default: Show Hong Kong
    return `https://apis.map.qq.com/tools/poimarker?type=0&marker=coord:${centerLat},${centerLng};title:${encodeURIComponent(label)}&key=${TENCENT_MAP_KEY}&referer=CabsAGI`
  }, [pickup, dropoff, routePath])

  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#f0f0f0',
      }}
    >
      <iframe
        key={mapUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        marginHeight={0}
        marginWidth={0}
        src={mapUrl}
        title="地圖"
        allow="geolocation"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
      />
    </div>
  )
}
