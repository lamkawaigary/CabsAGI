import { useEffect, useRef } from 'react'

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

// Convert WGS84 to GCJ02
const wgs84ToGcj02 = (lng: number, lat: number) => {
  const PI = 3.141592653589793
  const a = 6378245.0
  const ee = 0.00669342162296594323

  if ((lng < 72.004 || lng > 137.8347) || (lat < 0.8293 || lat > 55.8271)) {
    return { lat, lng }
  }

  let dlat = (lng - 105.0) * PI * 3000.0 / 180.0
  let dlng = (lat - 35.0) * PI * 3000.0 / 180.0

  const radlat = lat / 180.0 * PI
  let magic = Math.sin(radlat)
  magic = 1 - ee * magic * magic
  const sqrtmagic = Math.sqrt(magic)

  dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI)
  dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI)

  return { lat: lat + dlat, lng: lng + dlng }
}

// Load Tencent SDK
const loadTencentSDK = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if ((window as any).TMap && (window as any).TMap.Map) return Promise.resolve(true)

  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = `https://map.qq.com/api/gljs?v=1.exp&key=${TENCENT_MAP_KEY}&libraries=service`
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })
}

export default function TencentMap({ pickup, dropoff, routePath, height = '400px' }: TencentMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any>(null)
  const polylineRef = useRef<any>(null)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      if (!mapRef.current) return

      const loaded = await loadTencentSDK()
      if (!mounted || !loaded) return

      const T = (window as any).TMap
      if (!T || !mapRef.current) return

      try {
        // Initialize map centered on HK
        mapInstance.current = new T.Map(mapRef.current, {
          center: new T.LatLng(22.3193, 114.1694),
          zoom: 12,
          viewMode: '2D',
          draggable: true,
          scrollwheel: true,
          doubleClickZoom: true,
        })

        // Create marker layer
        markersRef.current = new T.MultiMarker({
          map: mapInstance.current,
          styles: {
            pickup: new T.MarkerStyle({
              width: 32,
              height: 42,
              anchor: { x: 16, y: 38 },
              color: '#667eea',
            }),
            dropoff: new T.MarkerStyle({
              width: 32,
              height: 42,
              anchor: { x: 16, y: 38 },
              color: '#f5576c',
            }),
          },
          geometries: [],
        })

        // Create polyline layer
        polylineRef.current = new T.MultiPolyline({
          map: mapInstance.current,
          styles: {
            route: new T.PolylineStyle({
              color: '#1e4f43',
              width: 6,
            }),
          },
          geometries: [],
        })

      } catch (e) {
        console.error('TencentMap init error:', e)
      }
    }

    init()

    return () => {
      mounted = false
      try {
        if (mapInstance.current) {
          mapInstance.current.destroy()
          mapInstance.current = null
        }
      } catch (e) {}
    }
  }, [])

  // Update markers and route when props change
  useEffect(() => {
    if (!mapInstance.current || !markersRef.current || !polylineRef.current) return

    const T = (window as any).TMap
    if (!T) return

    const geometries: any[] = []
    const polylineGeometries: any[] = []

    // Add pickup marker
    if (pickup) {
      const gcj = wgs84ToGcj02(pickup.lng, pickup.lat)
      geometries.push({
        id: 'pickup',
        styleId: 'pickup',
        position: new T.LatLng(gcj.lat, gcj.lng),
        properties: { title: pickup.name },
      })
    }

    // Add dropoff marker
    if (dropoff) {
      const gcj = wgs84ToGcj02(dropoff.lng, dropoff.lat)
      geometries.push({
        id: 'dropoff',
        styleId: 'dropoff',
        position: new T.LatLng(gcj.lat, gcj.lng),
        properties: { title: dropoff.name },
      })
    }

    // Update markers
    markersRef.current.setGeometries(geometries)

    // Update route polyline
    if (routePath && routePath.length >= 2) {
      const path = routePath.map(p => {
        const gcj = wgs84ToGcj02(p.lng, p.lat)
        return new T.LatLng(gcj.lat, gcj.lng)
      })
      polylineGeometries.push({
        id: 'route',
        styleId: 'route',
        paths: [path],
      })
      polylineRef.current.setGeometries(polylineGeometries)
    } else {
      polylineRef.current.setGeometries([])
    }

    // Fit bounds to show all markers
    if (geometries.length > 0) {
      const bounds = new T.LatLngBounds()
      geometries.forEach(g => bounds.extend(g.position))
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] })
    }

  }, [pickup, dropoff, routePath])

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height,
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    />
  )
}
