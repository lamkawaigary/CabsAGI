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
  onRouteCalculated?: (path: Array<{ lat: number; lng: number }>, distance: number, duration: number) => void
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

// Convert GCJ02 to WGS84
const gcj02ToWgs84 = (lng: number, lat: number) => {
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

  return { lat: lat - dlat, lng: lng - dlng }
}

// Load Tencent SDK with service library for routing
const loadTencentSDK = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if ((window as any).TMap && (window as any).TMap.Map) return Promise.resolve(true)

  return new Promise((resolve) => {
    const script = document.createElement('script')
    // IMPORTANT: Add 'service' library for driving route calculation
    script.src = `https://map.qq.com/api/gljs?v=1.exp&key=${TENCENT_MAP_KEY}&libraries=service`
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })
}

export default function TencentMap({ pickup, dropoff, routePath, height = '400px', onRouteCalculated }: TencentMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any>(null)
  const polylineRef = useRef<any>(null)
  const drivingService = useRef<any>(null)

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
          zoom: 11,
          viewMode: '2D',
        })

        // Create marker layer with custom styles
        markersRef.current = new T.MultiMarker({
          map: mapInstance.current,
          styles: {
            pickup: new T.MarkerStyle({
              width: 30,
              height: 40,
              anchor: { x: 15, y: 36 },
              src: 'https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/markerDefault.png',
              color: '#667eea',
            }),
            dropoff: new T.MarkerStyle({
              width: 30,
              height: 40,
              anchor: { x: 15, y: 36 },
              src: 'https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/markerDefault.png',
              color: '#f5576c',
            }),
          },
          geometries: [],
        })

        // Create polyline layer for routes
        polylineRef.current = new T.MultiPolyline({
          map: mapInstance.current,
          styles: {
            route: new T.PolylineStyle({
              color: '#1e4f43',
              width: 6,
              borderWidth: 2,
              borderColor: '#ffffff',
              lineCap: 'round',
              lineJoin: 'round',
            }),
          },
          geometries: [],
        })

        // Initialize driving service for route calculation
        if (T.service) {
          drivingService.current = new T.service.Driving({
            policy: 'REAL_TRAFFIC',
          })
        }

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

  // Calculate real route when both pickup and dropoff are set
  useEffect(() => {
    if (!mapInstance.current || !drivingService.current || !pickup || !dropoff) return

    const T = (window as any).TMap

    // Convert to GCJ02 for Tencent API
    const startGCJ = wgs84ToGcj02(pickup.lng, pickup.lat)
    const endGCJ = wgs84ToGcj02(dropoff.lng, dropoff.lat)

    // Calculate driving route
    drivingService.current.search({
      from: new T.LatLng(startGCJ.lat, startGCJ.lng),
      to: new T.LatLng(endGCJ.lat, endGCJ.lng),
    }).then((result: any) => {
      if (result && result.result && result.result.routes && result.result.routes.length > 0) {
        const route = result.result.routes[0]
        
        // Get the polyline path from the route
        if (route.polyline && route.polyline.length > 0) {
          const path = route.polyline.map((coord: number[]) => {
            const wgs = gcj02ToWgs84(coord[0], coord[1])
            return { lat: wgs.lat, lng: wgs.lng }
          })

          // Draw the route
          if (polylineRef.current && T) {
            const gcjPath = path.map(p => {
              const gcj = wgs84ToGcj02(p.lng, p.lat)
              return new T.LatLng(gcj.lat, gcj.lng)
            })

            polylineRef.current.setGeometries([{
              id: 'route',
              styleId: 'route',
              paths: [gcjPath],
            }])
          }

          // Notify parent about the calculated route
          if (onRouteCalculated) {
            onRouteCalculated(path, route.distance, route.duration)
          }

          // Fit bounds to show entire route
          if (mapInstance.current && path.length > 0) {
            const bounds = new T.LatLngBounds()
            gcjPath.forEach((pos: any) => bounds.extend(pos))
            mapInstance.current.fitBounds(bounds, { padding: [50, 50] })
          }
        }
      }
    }).catch((err: any) => {
      console.error('Route calculation error:', err)
      // Fallback: draw straight line
      if (pickup && dropoff && polylineRef.current) {
        const T = (window as any).TMap
        const startGCJ = wgs84ToGcj02(pickup.lng, pickup.lat)
        const endGCJ = wgs84ToGcj02(dropoff.lng, dropoff.lat)
        
        polylineRef.current.setGeometries([{
          id: 'route',
          styleId: 'route',
          paths: [[new T.LatLng(startGCJ.lat, startGCJ.lng), new T.LatLng(endGCJ.lat, endGCJ.lng)]],
        }])
      }
    })

  }, [pickup, dropoff, onRouteCalculated])

  // Update markers when props change
  useEffect(() => {
    if (!mapInstance.current || !markersRef.current) return

    const T = (window as any).TMap
    if (!T) return

    const geometries: any[] = []

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

    // Fit bounds to show markers if no route
    if (geometries.length > 0 && !routePath) {
      const bounds = new T.LatLngBounds()
      geometries.forEach(g => bounds.extend(g.position))
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] })
    }

  }, [pickup, dropoff])

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
